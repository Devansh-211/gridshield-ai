"""
GridShield AI — Authentication Context, Session Extraction & Role Dependencies.

Enforces:
1. Extraction of session token from `gridshield_session` HttpOnly cookie or `Authorization: Bearer <token>` header.
2. Admin "Preview As" role switching: Admin can preview as SUPERVISOR or TECHNICIAN, while actual privileges remain recorded in audit logs.
3. Strict deny-by-default role dependencies for FastAPI route handlers.
"""

from typing import Optional, List, Callable
from dataclasses import dataclass
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.persistence.database import get_db
from backend.app.persistence.repositories import AuthRepository, AuditLogRepository
from backend.app.core.security import hash_session_token


@dataclass
class UserSessionContext:
    user_id: str
    username: str
    display_name: str
    real_role: str        # SUPERVISOR, TECHNICIAN, ADMIN
    effective_role: str   # In Preview mode for Admin: SUPERVISOR or TECHNICIAN; otherwise real_role
    is_preview: bool      # True if Admin is actively previewing another role
    preview_role: Optional[str]
    token_hash: str
    must_change_password: bool


def extract_session_token(request: Request) -> Optional[str]:
    """Extracts session token from cookie or Authorization header."""
    # 1. Cookie (Primary for web SPA)
    token = request.cookies.get("gridshield_session")
    if token:
        return token

    # 2. Authorization Header (Bearer token for CLI / API clients)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()

    return None


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[UserSessionContext]:
    """Extracts authenticated user context if valid session exists, otherwise None."""
    token = extract_session_token(request)
    if not token:
        return None

    token_hash = hash_session_token(token)
    auth_repo = AuthRepository(db)
    session_model = auth_repo.get_session(token_hash)
    if not session_model:
        return None

    user = auth_repo.get_user_by_id(session_model.user_id)
    if not user or not user.is_active:
        return None

    # Compute effective role (Admin can preview as SUPERVISOR or TECHNICIAN)
    real_role = user.role.upper()
    preview_role = session_model.preview_role
    is_preview = bool(real_role == "ADMIN" and preview_role in ("SUPERVISOR", "TECHNICIAN"))
    effective_role = preview_role if is_preview else real_role

    # Update session activity
    try:
        auth_repo.touch_session(token_hash)
        db.commit()
    except Exception:
        pass

    return UserSessionContext(
        user_id=user.id,
        username=user.username,
        display_name=user.display_name,
        real_role=real_role,
        effective_role=effective_role,
        is_preview=is_preview,
        preview_role=preview_role,
        token_hash=token_hash,
        must_change_password=user.must_change_password
    )


def get_current_user_required(
    ctx: Optional[UserSessionContext] = Depends(get_current_user_optional)
) -> UserSessionContext:
    """FastAPI dependency requiring an active authenticated user session (401 Unauthorized)."""
    if not ctx:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to access this resource."
        )
    return ctx


def require_role(*allowed_roles: str) -> Callable:
    """FastAPI dependency factory enforcing that the caller's effective role is in allowed_roles.
    
    If caller is an Admin in preview mode, their effective_role is evaluated against the endpoint.
    Admin real_role always has access if 'ADMIN' is in allowed_roles.
    """
    normalized_allowed = {r.upper() for r in allowed_roles}

    def role_checker(ctx: UserSessionContext = Depends(get_current_user_required)) -> UserSessionContext:
        # If Admin (real role) and ADMIN is allowed, grant access (unless explicitly testing preview as non-admin)
        if ctx.real_role == "ADMIN" and "ADMIN" in normalized_allowed:
            return ctx

        # Check effective role
        if ctx.effective_role.upper() in normalized_allowed:
            return ctx

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role: {', '.join(sorted(normalized_allowed))}. Your active role: {ctx.effective_role}."
        )

    return role_checker


def require_admin(ctx: UserSessionContext = Depends(get_current_user_required)) -> UserSessionContext:
    """Enforces that real role is ADMIN (bypasses any preview state for governance operations)."""
    if ctx.real_role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privilege required for this action."
        )
    return ctx

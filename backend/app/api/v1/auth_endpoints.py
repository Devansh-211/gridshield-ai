"""
GridShield AI — Authentication & Admin Governance Endpoints (Phase PA).

Provides:
1. One-time setup / bootstrap endpoint if 0 users exist.
2. Standard username/password login with secure HttpOnly cookies.
3. User session lookup and profile endpoint (/me).
4. Admin User CRUD, role assignment, and append-only audit log reader.
5. Admin "Preview As" role preview switcher with persistent audit recording.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends, Request, Response, status
from sqlalchemy.orm import Session

from backend.app.persistence.database import get_db, IS_VERCEL
from backend.app.persistence.repositories import AuthRepository, AuditLogRepository
from backend.app.core.security import (
    hash_password, verify_password, generate_session_token,
    hash_session_token, get_or_create_bootstrap_token,
    is_bootstrap_token_valid, invalidate_bootstrap_token
)
from backend.app.core.auth_context import (
    UserSessionContext, get_current_user_optional,
    get_current_user_required, require_admin
)

router = APIRouter(tags=["Authentication & Admin"])


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------

class BootstrapRequest(BaseModel):
    bootstrap_token: str
    admin_username: str = Field(..., min_length=3, max_length=32)
    admin_password: str = Field(..., min_length=8)
    display_name: str = "System Administrator"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    user_id: str
    username: str
    display_name: str
    role: str
    is_active: bool
    must_change_password: bool
    created_at: datetime


class UserProfileResponse(BaseModel):
    user_id: str
    username: str
    display_name: str
    real_role: str
    effective_role: str
    is_preview: bool
    preview_role: Optional[str]
    must_change_password: bool


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=8)
    role: str = Field(..., pattern="^(SUPERVISOR|TECHNICIAN|ADMIN)$")
    display_name: str = ""


class PreviewAsRequest(BaseModel):
    target_role: Optional[str] = Field(None, pattern="^(SUPERVISOR|TECHNICIAN)$")


class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[str]
    actor_role: Optional[str]
    action: str
    target_type: str
    target_id: str
    ip_address: Optional[str]
    details: Dict[str, Any]
    created_at: datetime


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.get("/auth/bootstrap-status")
def get_bootstrap_status(db: Session = Depends(get_db)):
    """Returns whether the application is uninitialized and requires bootstrap setup."""
    auth_repo = AuthRepository(db)
    user_count = auth_repo.get_user_count()
    needs_bootstrap = (user_count == 0)
    token_hint = get_or_create_bootstrap_token() if needs_bootstrap else None
    
    return {
        "needs_bootstrap": needs_bootstrap,
        "user_count": user_count,
        "bootstrap_token": token_hint  # Revealed on first run for developer ease
    }


@router.post("/auth/bootstrap")
def bootstrap_admin_account(
    req: BootstrapRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Initializes the very first Administrator account using the one-time bootstrap token."""
    auth_repo = AuthRepository(db)
    audit_repo = AuditLogRepository(db)
    client_ip = request.client.host if request.client else "127.0.0.1"

    if auth_repo.get_user_count() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System is already initialized. Bootstrap is disabled."
        )

    if not is_bootstrap_token_valid(req.bootstrap_token):
        audit_repo.log(
            action="BOOTSTRAP_FAILED",
            target_type="SYSTEM",
            target_id="bootstrap",
            actor_id="anonymous",
            actor_role="ANONYMOUS",
            ip_address=client_ip,
            details={"reason": "Invalid bootstrap token"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bootstrap token."
        )

    # Create admin user
    hashed = hash_password(req.admin_password)
    admin_user = auth_repo.create_user(
        username=req.admin_username,
        password_hash=hashed,
        role="ADMIN",
        display_name=req.display_name,
        must_change_password=False
    )

    # Invalidate bootstrap token permanently
    invalidate_bootstrap_token()

    # Create session & set cookie
    raw_token = generate_session_token()
    token_hash = hash_session_token(raw_token)
    auth_repo.create_session(
        user_id=admin_user.id,
        token_hash=token_hash,
        ip_address=client_ip,
        user_agent=request.headers.get("User-Agent", "")
    )

    response.set_cookie(
        key="gridshield_session",
        value=raw_token,
        max_age=86400 * 7,
        httponly=True,
        samesite="lax",
        secure=IS_VERCEL
    )

    audit_repo.log(
        action="BOOTSTRAP_SUCCESS",
        target_type="USER",
        target_id=admin_user.id,
        actor_id=admin_user.id,
        actor_role="ADMIN",
        ip_address=client_ip,
        details={"username": admin_user.username}
    )
    db.commit()

    return {
        "status": "BOOTSTRAP_COMPLETE",
        "message": f"Administrator account '{admin_user.username}' created successfully.",
        "user_id": admin_user.id,
        "token": raw_token
    }


@router.post("/auth/login")
def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Authenticates username & password, issues session token and HttpOnly cookie."""
    auth_repo = AuthRepository(db)
    audit_repo = AuditLogRepository(db)
    client_ip = request.client.host if request.client else "127.0.0.1"

    user = auth_repo.get_user_by_username(req.username)
    if not user or not user.is_active or not verify_password(req.password, user.password_hash):
        audit_repo.log(
            action="LOGIN_FAILED",
            target_type="AUTH",
            target_id=req.username,
            actor_id="anonymous",
            actor_role="ANONYMOUS",
            ip_address=client_ip,
            details={"username": req.username}
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    # Issue session
    raw_token = generate_session_token()
    token_hash = hash_session_token(raw_token)
    auth_repo.create_session(
        user_id=user.id,
        token_hash=token_hash,
        ip_address=client_ip,
        user_agent=request.headers.get("User-Agent", "")
    )

    response.set_cookie(
        key="gridshield_session",
        value=raw_token,
        max_age=86400 * 7,
        httponly=True,
        samesite="lax",
        secure=IS_VERCEL
    )

    audit_repo.log(
        action="LOGIN_SUCCESS",
        target_type="USER",
        target_id=user.id,
        actor_id=user.id,
        actor_role=user.role,
        ip_address=client_ip,
        details={"username": user.username}
    )
    db.commit()

    return {
        "user_id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "role": user.role,
        "must_change_password": user.must_change_password,
        "token": raw_token
    }


@router.post("/auth/logout")
def logout(
    request: Request,
    response: Response,
    ctx: Optional[UserSessionContext] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Terminates active session and clears authentication cookies."""
    if ctx:
        auth_repo = AuthRepository(db)
        auth_repo.delete_session(ctx.token_hash)
        AuditLogRepository(db).log(
            action="LOGOUT",
            target_type="USER",
            target_id=ctx.user_id,
            actor_id=ctx.user_id,
            actor_role=ctx.real_role,
            ip_address=request.client.host if request.client else "127.0.0.1"
        )
        db.commit()

    response.delete_cookie("gridshield_session")
    return {"status": "LOGGED_OUT"}


@router.get("/auth/me", response_model=UserProfileResponse)
def get_current_user_profile(
    ctx: UserSessionContext = Depends(get_current_user_required)
):
    """Returns authenticated profile, active role, and preview status."""
    return UserProfileResponse(
        user_id=ctx.user_id,
        username=ctx.username,
        display_name=ctx.display_name,
        real_role=ctx.real_role,
        effective_role=ctx.effective_role,
        is_preview=ctx.is_preview,
        preview_role=ctx.preview_role,
        must_change_password=ctx.must_change_password
    )


# -----------------------------------------------------------------------------
# Admin Governance Endpoints
# -----------------------------------------------------------------------------

@router.get("/admin/users", response_model=List[UserResponse])
def list_users(
    admin_ctx: UserSessionContext = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin only: Lists all registered users and roles."""
    auth_repo = AuthRepository(db)
    users = auth_repo.list_users()
    return [
        UserResponse(
            user_id=u.id,
            username=u.username,
            display_name=u.display_name,
            role=u.role,
            is_active=u.is_active,
            must_change_password=u.must_change_password,
            created_at=u.created_at
        )
        for u in users
    ]


@router.post("/admin/users", response_model=UserResponse)
def create_user(
    req: CreateUserRequest,
    admin_ctx: UserSessionContext = Depends(require_admin),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Admin only: Creates a new user account with specified role."""
    auth_repo = AuthRepository(db)
    existing = auth_repo.get_user_by_username(req.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{req.username}' already exists."
        )

    hashed = hash_password(req.password)
    user = auth_repo.create_user(
        username=req.username,
        password_hash=hashed,
        role=req.role,
        display_name=req.display_name,
        must_change_password=False
    )

    client_ip = request.client.host if request and request.client else "127.0.0.1"
    AuditLogRepository(db).log(
        action="USER_CREATED",
        target_type="USER",
        target_id=user.id,
        actor_id=admin_ctx.user_id,
        actor_role=admin_ctx.real_role,
        ip_address=client_ip,
        details={"created_username": user.username, "role": user.role}
    )
    db.commit()

    return UserResponse(
        user_id=user.id,
        username=user.username,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
        must_change_password=user.must_change_password,
        created_at=user.created_at
    )


@router.delete("/admin/users/{user_id}")
def delete_user(
    user_id: str,
    admin_ctx: UserSessionContext = Depends(require_admin),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Admin only: Deletes a user account."""
    if user_id == admin_ctx.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own active administrator account."
        )

    auth_repo = AuthRepository(db)
    success = auth_repo.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found.")

    client_ip = request.client.host if request and request.client else "127.0.0.1"
    AuditLogRepository(db).log(
        action="USER_DELETED",
        target_type="USER",
        target_id=user_id,
        actor_id=admin_ctx.user_id,
        actor_role=admin_ctx.real_role,
        ip_address=client_ip
    )
    db.commit()

    return {"status": "DELETED", "user_id": user_id}


@router.post("/admin/preview-as")
def set_preview_role(
    req: PreviewAsRequest,
    admin_ctx: UserSessionContext = Depends(require_admin),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Admin only: Switches role preview mode (SUPERVISOR or TECHNICIAN) or resets to default."""
    auth_repo = AuthRepository(db)
    auth_repo.update_preview_role(admin_ctx.token_hash, req.target_role)

    client_ip = request.client.host if request and request.client else "127.0.0.1"
    AuditLogRepository(db).log(
        action="PREVIEW_ROLE_CHANGED",
        target_type="SESSION",
        target_id=admin_ctx.token_hash[:12],
        actor_id=admin_ctx.user_id,
        actor_role=admin_ctx.real_role,
        ip_address=client_ip,
        details={"preview_role": req.target_role}
    )
    db.commit()

    return {
        "status": "PREVIEW_ROLE_UPDATED",
        "real_role": admin_ctx.real_role,
        "effective_role": req.target_role or "ADMIN",
        "is_preview": bool(req.target_role is not None)
    }


    return {
        "status": "PREVIEW_ROLE_UPDATED",
        "real_role": admin_ctx.real_role,
        "effective_role": req.target_role or "ADMIN",
        "is_preview": bool(req.target_role is not None)
    }


@router.get("/admin/audit-log", response_model=List[AuditLogResponse])
def get_audit_log(
    limit: int = 100,
    offset: int = 0,
    admin_ctx: UserSessionContext = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin only: Reads append-only security audit log."""
    logs = AuditLogRepository(db).list_logs(limit=limit, offset=offset)
    return [
        AuditLogResponse(
            id=l.id,
            actor_id=l.actor_id,
            actor_role=l.actor_role,
            action=l.action,
            target_type=l.target_type,
            target_id=l.target_id,
            ip_address=l.ip_address,
            details=l.details_json or {},
            created_at=l.created_at
        )
        for l in logs
    ]

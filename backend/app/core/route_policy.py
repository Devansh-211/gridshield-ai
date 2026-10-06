"""
GridShield AI — Deny-by-Default Route Security Policy & Introspection Validator.

Enforces:
1. Every API route must declare its required role set or be explicitly declared as public.
2. Startup introspection check raises RuntimeError if any /api/v1/ route is registered without an explicit policy.
"""

from typing import Set, Dict, Any, List, Optional
from fastapi import FastAPI
from fastapi.routing import APIRoute

# Registered route policies: path -> set of allowed roles or {"PUBLIC"}
_ROUTE_POLICIES: Dict[str, Set[str]] = {}


def register_route_policy(path_prefix: str, roles: Set[str]) -> None:
    """Registers policy for endpoints matching path_prefix."""
    _ROUTE_POLICIES[path_prefix] = {r.upper() for r in roles}


# Pre-seed explicit route policies
DEFAULT_POLICIES = {
    # Public endpoints
    "/health": {"PUBLIC"},
    "/api/v1/health": {"PUBLIC"},
    "/api/v1/auth/bootstrap": {"PUBLIC"},
    "/api/v1/auth/login": {"PUBLIC"},
    "/api/v1/auth/logout": {"PUBLIC"},
    "/api/v1/auth/bootstrap-status": {"PUBLIC"},
    
    # Auth user session
    "/api/v1/auth/me": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    
    # Admin governance
    "/api/v1/admin": {"ADMIN"},
    
    # Supervisor plain view whitelist projections
    "/api/v1/views/supervisor": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    
    # Technician full detail engineering view
    "/api/v1/views/technician": {"TECHNICIAN", "ADMIN"},
    
    # Engineering operations & Digital Twin execution
    "/api/v1/grid": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    "/api/v1/topology": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    "/api/v1/state": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    "/api/v1/telemetry": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    "/api/v1/scenarios": {"TECHNICIAN", "ADMIN"},
    "/api/v1/stream": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    "/api/v1/incidents": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    "/api/v1/alarms": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    "/api/v1/mitigation": {"TECHNICIAN", "ADMIN"},
    "/api/v1/analyst": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    "/api/v1/runs": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    "/api/v1/elements": {"TECHNICIAN", "ADMIN"},
    "/api/v1/network": {"TECHNICIAN", "ADMIN"},
    "/api/v1/sensors": {"TECHNICIAN", "ADMIN"},
    "/api/v1/models": {"TECHNICIAN", "ADMIN"},
    "/api/v1/demo": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    "/api/v1/warmup": {"PUBLIC"},
    "/api/v1/metrics": {"PUBLIC"},
    "/api/v1/system": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
    "/api/v1/replay": {"TECHNICIAN", "ADMIN"},
    "/api/v1/reports": {"SUPERVISOR", "TECHNICIAN", "ADMIN"},
}

for prefix, allowed in DEFAULT_POLICIES.items():
    register_route_policy(prefix, allowed)


def get_policy_for_path(path: str) -> Optional[Set[str]]:
    """Finds matching policy for a given route path."""
    for prefix in sorted(_ROUTE_POLICIES.keys(), key=len, reverse=True):
        if path.startswith(prefix):
            return _ROUTE_POLICIES[prefix]
    return None


def validate_all_routes_on_startup(app: FastAPI) -> None:
    """Introspects all registered routes on startup and validates deny-by-default policy."""
    unprotected_routes = []
    
    for route in app.routes:
        if isinstance(route, APIRoute):
            path = route.path
            # Ignore OpenAPI docs and static paths
            if path in ("/docs", "/redoc", "/openapi.json", "/favicon.ico"):
                continue
            
            policy = get_policy_for_path(path)
            if not policy:
                unprotected_routes.append(f"[{','.join(route.methods)}] {path}")

    if unprotected_routes:
        raise RuntimeError(
            f"SECURITY POLICY VIOLATION: The following routes have no explicit role policy defined: "
            f"{unprotected_routes}. All routes must be registered with an explicit role policy (deny-by-default)."
        )
    print(f"[SECURITY] Deny-by-default route validation passed for {len(app.routes)} endpoints.")

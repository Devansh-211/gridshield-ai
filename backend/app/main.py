"""GridShield AI — FastAPI Application Entrypoint.

Provides:
1. Versioned /api/v1 API router.
2. Global CORS, request ID propagation, and structured JSON ErrorEnvelope.
3. Health check and root endpoints.
"""

import uuid
import time
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from backend.app.schemas.contracts import ErrorEnvelope
from backend.app.api.v1.endpoints import router as api_v1_router
from backend.app.persistence.database import IS_VERCEL

app = FastAPI(
    title="GridShield AI API",
    version="1.0.0",
    description="Explainable Cyber-Physical Resilience Platform for Electrical Power Grids (Research/Educational Digital Twin)",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_visitor_and_timing(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", f"req-{uuid.uuid4().hex[:8]}")
    request.state.request_id = request_id
    
    # Visitor cookie isolation (Invariant I12)
    visitor_id = request.cookies.get("gridshield_visitor_id")
    is_new_visitor = False
    if not visitor_id or not visitor_id.startswith("vis-"):
        visitor_id = f"vis-{uuid.uuid4().hex[:12]}"
        is_new_visitor = True
    request.state.visitor_id = visitor_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000.0
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = f"{process_time:.2f}"
    
    if is_new_visitor or not request.cookies.get("gridshield_visitor_id"):
        response.set_cookie(
            key="gridshield_visitor_id",
            value=visitor_id,
            max_age=86400 * 30,
            httponly=True,
            samesite="lax",
            secure=IS_VERCEL  # True on Vercel (HTTPS), False local dev
        )
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorEnvelope(
            code=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
            details=None,
            request_id=req_id,
        ).model_dump()
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorEnvelope(
            code="VALIDATION_ERROR",
            message="Invalid request payload structure or parameter schema",
            details={"errors": exc.errors()},
            request_id=req_id,
        ).model_dump()
    )

@app.get("/health")
@app.get("/api/v1/health")
def get_health():
    from backend.app.persistence.database import get_db_size_mb, IS_SQLITE, IS_VERCEL, ALLOW_EPHEMERAL_DB
    from backend.app.persistence.database import get_db_session
    db_status = "OK"
    try:
        with get_db_session() as session:
            from sqlalchemy import text
            session.execute(text("SELECT 1;"))
    except Exception as e:
        db_status = f"DB_UNAVAILABLE: {str(e)}"

    return {
        "status": "HEALTHY" if db_status == "OK" else "DEGRADED",
        "system": "GridShield AI Digital Twin",
        "version": "1.0.0",
        "database": {
            "status": db_status,
            "engine": "sqlite" if IS_SQLITE else "postgresql",
            "size_mb": round(get_db_size_mb(), 2),
            "ephemeral_warning": bool(IS_VERCEL and IS_SQLITE)
        }
    }

# Mount /api/v1 router
from backend.app.api.v1.auth_endpoints import router as auth_router
from backend.app.api.v1.views_endpoints import router as views_router
from backend.app.core.route_policy import validate_all_routes_on_startup

app.include_router(api_v1_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(views_router, prefix="/api/v1")

@app.on_event("startup")
def on_startup():
    from backend.app.persistence.database import init_db
    init_db()
    validate_all_routes_on_startup(app)



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
async def add_request_id_and_timing(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", f"req-{uuid.uuid4().hex[:8]}")
    request.state.request_id = request_id
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000.0
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = f"{process_time:.2f}"
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
def get_health():
    return {
        "status": "HEALTHY",
        "system": "GridShield AI Digital Twin",
        "version": "1.0.0"
    }

# Mount /api/v1 router
app.include_router(api_v1_router)

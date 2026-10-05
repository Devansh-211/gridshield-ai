from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uuid
import time

from backend.app.schemas.contracts import (
    GridTopology, GridState, ObservedTelemetryPoint, CyberEvent,
    ScenarioSpec, AttackSpec, DetectionResult, Attribution, RiskAssessment,
    Incident, TimelineEvent, ImpactResult, MitigationPlan, MitigationResult,
    AnalystExplanation, AnalystQuestionRequest, AnalystQuestionResponse,
    ErrorEnvelope, BusTopology, LineTopology, GeneratorTopology, LoadTopology
)

app = FastAPI(
    title="GridShield AI API",
    version="1.0.0",
    description="Explainable Cyber-Physical Resilience Platform for Electrical Power Grids"
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
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

@app.get("/health")
def get_health():
    return {"status": "HEALTHY", "system": "GridShield AI Digital Twin"}

@app.get("/api/v1/grid/topology", response_model=GridTopology)
def get_grid_topology():
    return GridTopology(
        system_name="IEEE 14-bus Digital Twin",
        buses=[],
        lines=[],
        generators=[],
        loads=[]
    )

@app.get("/api/v1/models/status")
def get_model_status():
    return {
        "simulator": "pandapower-3.5.5",
        "state_estimator": "WLS-Chi2-LNR",
        "anomaly_detector": "IsolationForest",
        "classifier": "HistGradientBoostingClassifier",
        "dataset_version": "sim-dataset-v1",
        "feature_version": "feat-v1",
        "llm_status": "CONNECTED"
    }

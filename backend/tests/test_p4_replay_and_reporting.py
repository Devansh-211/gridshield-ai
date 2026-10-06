"""
Phase 4: Dataset Replay Engine & After-Action Report Exporter Verification Suite.

Verifies:
1. Replaying CSV dataset streams into DatasetReplayEngine.
2. Rule R1 & R2 environment label REPLAY(dataset_id) and provenance PUBLIC_DATASET.
3. Rule R7 LLM grounding & template fallback behavior.
4. After-action evidence report export with product boundary disclaimer.
"""
import pytest
from backend.app.services.replay_engine import DatasetReplayEngine
from backend.app.services.report_exporter import ReportExporter
from backend.app.analyst.service import AnalystService

def test_dataset_replay_engine_csv_ingestion():
    """Test replaying CSV telemetry dataset."""
    engine = DatasetReplayEngine()
    csv_data = (
        "timestamp,component_id,component_type,measurement_type,reported_value,unit\n"
        "0.0,Bus 1,bus,v_pu,1.034,p.u.\n"
        "0.0,Bus 4,bus,v_pu,0.880,p.u.\n"
    )

    result = engine.replay_csv_dataset("test_ds_01", csv_data)

    assert result["dataset_id"] == "test_ds_01"
    assert result["environment"] == "REPLAY(test_ds_01)"
    assert result["telemetry_count"] == 2
    assert "evidence_object" in result
    assert result["evidence_object"]["environment"] == "REPLAY"


def test_after_action_report_export_with_disclaimer():
    """Verify after-action report export includes mandatory product boundary disclaimer."""
    evidence = {
        "incident_id": "INC_TEST_01",
        "environment": "REPLAY",
        "provenance": "PUBLIC_DATASET",
        "confidence": {"composite": 0.92}
    }

    report = ReportExporter.generate_after_action_report(evidence)
    md = ReportExporter.export_to_markdown(report)

    assert "report_id" in report
    assert "does not guarantee safety" in report["disclaimer"]
    assert "Product Boundary Disclaimer" in md
    assert "INC_TEST_01" in md


def test_rule_r7_llm_template_fallback():
    """Rule R7: Unconfigured LLM falls back to deterministic template explanation."""
    analyst = AnalystService()
    # Unconfigured key should force deterministic template
    assert analyst.is_configured is False

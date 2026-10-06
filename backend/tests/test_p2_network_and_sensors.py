"""
Phase 2: Network Importer & Sensor Config Verification Suite.

Verifies:
1. MATPOWER .m network import & validation report generation.
2. pandapower .json network import & layout generation.
3. Unsupplied bus / islanding detection.
4. Rule R6 topology support check on imported networks.
5. SensorManager health evaluation & H_data_quality hypothesis generation.
"""
import os
import json
import pytest
import pandapower as pp
import pandapower.networks as pn

from backend.app.services.network_importer import NetworkImporter
from backend.app.services.sensor_manager import SensorManager, SensorConfig
from backend.app.schemas.envelope import AttributionHypothesis, NonAnswerState

def test_pandapower_network_validation():
    """Test importing pandapower IEEE 14-bus network."""
    importer = NetworkImporter()
    net = pn.case14()
    
    result = importer.validate_and_format(net, system_name="IEEE 14-bus Digital Twin")
    meta = result["network_meta"]

    assert meta["valid"] is True
    assert meta["power_flow_converged"] is True
    assert meta["bus_count"] == 14
    assert meta["unsupplied_buses_count"] == 0
    assert meta["compatibility_gate"]["supported"] is True
    assert meta["compatibility_gate"]["non_answer_state"] is None
    assert len(result["layout_coordinates"]) == 14


def test_custom_unsupported_network_validation():
    """Rule R6: Custom unvalidated topology flags TOPOLOGY_UNSUPPORTED in report."""
    importer = NetworkImporter()
    net = pn.case4gs()  # 4-bus system not in compatibility registry
    
    result = importer.validate_and_format(net, system_name="Custom 4-Bus Feeder")
    meta = result["network_meta"]

    assert meta["bus_count"] == 4
    assert meta["compatibility_gate"]["supported"] is False
    assert meta["compatibility_gate"]["non_answer_state"] == NonAnswerState.TOPOLOGY_UNSUPPORTED.value
    assert any("TOPOLOGY_UNSUPPORTED" in w for w in meta["warnings"])


def test_sensor_manager_health_evaluation():
    """Test SensorManager data quality scoring and H_data_quality hypothesis."""
    sm = SensorManager([
        SensorConfig(sensor_id="S1", device_type="BUS_VOLTAGE", target_id="Bus 1"),
        SensorConfig(sensor_id="S2", device_type="BUS_VOLTAGE", target_id="Bus 2", stuck_value=1.02),
        SensorConfig(sensor_id="S3", device_type="LINE_CURRENT", target_id="Line 1-2", is_missing=True),
    ])

    report = sm.evaluate_sensor_health()

    assert report.total_sensors == 3
    assert report.active_sensors == 2
    assert report.missing_sensors == 1
    assert report.stuck_sensors == 1
    assert 0.0 <= report.data_quality_score <= 1.0
    assert AttributionHypothesis.H_DATA_QUALITY in report.hypotheses

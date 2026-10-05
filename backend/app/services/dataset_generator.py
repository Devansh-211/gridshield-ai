"""
Dataset Generator for ML Training and Evaluation (Section 8).
Executes simulated runs across diverse seeds, scenarios, targets, and attacks.
Extracts feature vectors with strict run-group splits to prevent data leakage.
"""
import os
import json
import numpy as np
from typing import Dict, Any, List, Tuple
from backend.app.schemas.contracts import (
    ScenarioSpec, ScenarioType, AttackSpec, AttackType,
    ClassificationClass
)
from backend.app.services.simulation_runner import SimulationRunner
from backend.app.detection.feature_pipeline import FeaturePipeline

DATASET_VERSION = "dataset-v1.0"

def generate_scenario_runs(seeds: List[int], steps_per_run: int = 40) -> Tuple[np.ndarray, np.ndarray, List[str], List[int]]:
    """
    Generate dataset matrices (X: features, y: labels, feature_names, run_groups).
    """
    X_list = []
    y_list = []
    groups = []
    feature_names = None
    pipeline = FeaturePipeline()

    scenarios_to_run = [
        (ScenarioType.NORMAL, None),
        (ScenarioType.LOAD_INCREASE, None),
        (ScenarioType.LINE_FAILURE, None),
        (ScenarioType.GENERATOR_FAILURE, None),
        (ScenarioType.NORMAL, AttackType.FALSE_DATA_INJECTION),
        (ScenarioType.NORMAL, AttackType.MALICIOUS_CONTROL_COMMAND),
        (ScenarioType.NORMAL, AttackType.REPLAY),
        (ScenarioType.NORMAL, AttackType.DENIAL_OF_SERVICE),
    ]

    run_counter = 0
    for seed in seeds:
        for stype, atype in scenarios_to_run:
            run_counter += 1
            att_spec = None
            if atype:
                target_comp = "Bus 4" if atype != AttackType.MALICIOUS_CONTROL_COMMAND else "Line 1"
                att_spec = AttackSpec(
                    attack_type=atype,
                    target_components=[target_comp],
                    magnitude=-0.08 if atype == AttackType.FALSE_DATA_INJECTION else 0.0,
                    start_step=15,
                    duration_steps=20,
                    seed=seed
                )

            spec = ScenarioSpec(
                scenario_type=stype,
                start_step=15,
                duration_steps=20,
                total_steps=steps_per_run,
                seed=seed,
                attack=att_spec
            )

            runner = SimulationRunner(spec)
            run_res = runner.run_all()

            # Extract features for each step in this run
            for step in range(steps_per_run):
                obs_pts = run_res["observed_stream"][step]
                cyb_evts = run_res["cyber_event_stream"][step]

                feat_vec = pipeline.extract_features(step, obs_pts, cyb_evts)
                if feature_names is None:
                    feature_names = sorted(list(feat_vec.features.keys()))

                x_row = [feat_vec.features[k] for k in feature_names]

                # Determine Ground-Truth Label for training/eval
                label = ClassificationClass.NORMAL.value
                if step >= 15:
                    if atype == AttackType.FALSE_DATA_INJECTION:
                        label = ClassificationClass.FALSE_DATA_INJECTION.value
                    elif atype == AttackType.MALICIOUS_CONTROL_COMMAND:
                        label = ClassificationClass.MALICIOUS_CONTROL_COMMAND.value
                    elif atype == AttackType.REPLAY:
                        label = ClassificationClass.REPLAY.value
                    elif atype == AttackType.DENIAL_OF_SERVICE:
                        label = ClassificationClass.DENIAL_OF_SERVICE.value
                    elif stype in [ScenarioType.LOAD_INCREASE, ScenarioType.LINE_FAILURE, ScenarioType.GENERATOR_FAILURE]:
                        label = ClassificationClass.PHYSICAL_FAULT.value

                X_list.append(x_row)
                y_list.append(label)
                groups.append(run_counter)

    return np.array(X_list), np.array(y_list), feature_names, groups

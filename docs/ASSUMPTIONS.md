# GridShield AI — Assumptions Log

## A001: Grid Topology & Standard System
- **Assumption**: IEEE 14-bus system (`pandapower.networks.case14`) is the standard primary test system for digital twin demonstration, with hand-tuned 2D coordinates for schematic visualization.

## A002: SCADA Supervisory Control Deadbands & Sensitivity
- **Assumption**: A closed-loop voltage supervisory controller monitors critical bus voltages (e.g., Bus 4 / Bus 9 / Bus 7) and adjusts generator setpoints and reactive power shunts to regulate voltages within [0.95, 1.05] p.u.

## A003: Timing Model & Clock
- **Assumption**: 1 simulation step corresponds to 1 simulated second of telemetry. Baseline scenarios run for 60-600 steps. Demo mode paces steps at 100-300ms for visual clarity.

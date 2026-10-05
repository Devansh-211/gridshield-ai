---
name: pandapower-simulation
description: Model electrical power networks, execute AC/DC power flow simulations, contingency analyses, and cyber-physical attack injections using pandapower.
---

# Power Systems Simulation Skill for GridShield AI

## Core Capabilities
- **Physics Engine**: `pandapower` (verified electrical grid modeling and power flow solver).
- **Network Topologies**: Standard IEEE Test Systems (IEEE 14-bus, IEEE 30-bus, IEEE 57-bus, IEEE 118-bus).
- **Simulation Types**: AC power flow (Newton-Raphson), DC power flow, state estimation, N-1 contingency analysis.

## Cyber-Physical Attack Modeling
1. **False Data Injection (FDI)**:
   - Inject subtle perturbations into bus active/reactive power measurements ($P_{meas}, Q_{meas}$) or voltage magnitudes ($V_{meas}$) designed to bypass traditional Chi-Square State Estimation Bad Data Detection (BDD).
2. **Breaker Tampering / Line Tripping**:
   - Unauthorized opening of line switches causing cascading overloads on parallel corridors.
3. **Coordinated Distributed Generation Attack**:
   - Sudden ramp down or disconnect of distributed energy resources (DERs) inducing frequency/voltage instability.
4. **Resilience Metrics**:
   - Total System Load Served (MW), Voltage Violation Index, Overloaded Lines count, Loss of Load Expectation (LOLE).

## Key Implementation Patterns
```python
import pandapower as pp
import pandapower.networks as pn

def load_ieee_grid(grid_name: str = "case14"):
    if grid_name == "case14":
        return pn.case14()
    elif grid_name == "case30":
        return pn.case_ieee30()
    return pn.case14()

def run_simulation(net):
    pp.runpp(net, algorithm="nr", calculate_voltage_angles=True)
    return {
        "buses": net.res_bus.to_dict(orient="index"),
        "lines": net.res_line.to_dict(orient="index"),
        "gens": net.res_gen.to_dict(orient="index"),
    }
```

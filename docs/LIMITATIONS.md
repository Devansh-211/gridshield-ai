# GridShield AI — System Limitations & Research Disclaimers

1. **Simulated Benchmark Grid**: All telemetry, power flows, and asset configurations are computed against the synthetic IEEE 14-bus transmission benchmark using `pandapower`. Real utility grids feature higher dimensional topologies, unbalanced three-phase loading, and diverse renewable DERs.
2. **In-Process Cyber Modeling**: Cyber events (packet loss, latency spikes, auth failures) and attack injections are generated programmatically in-process. GridShield does not simulate low-level TCP/IP stacks or specific proprietary RTU firmware vulnerabilities.
3. **Synthetic Model Training**: L2 and L3 machine learning detectors were trained on synthetically generated scenarios. Real-world distribution networks will present unmodeled ambient harmonics, weather variations, and non-Gaussian noise profiles.
4. **Simplified Frequency Dynamics**: Frequency is simulated using a single-area Center of Inertia (COI) swing model with governor droop rather than a multi-machine transient stability simulator.
5. **Decision Support Only**: GridShield AI is designed strictly for research, training, and educational evaluation of cyber-physical grid resilience. It does not interface with or provide control recommendations for actual critical utility assets.

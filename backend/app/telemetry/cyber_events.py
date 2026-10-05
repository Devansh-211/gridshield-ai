"""
Cyber Event Log Generator (Section 6).
Emits simulated background benign cyber events (routine commands, rare auth retries, intermittent packet jitter)
alongside security incident logs.
"""
from typing import List, Optional
from backend.app.schemas.contracts import CyberEvent, CyberEventType, Provenance
from backend.app.core.rng import RNGFactory, get_rng

class CyberEventGenerator:
    """
    Simulates operational SCADA/IED cyber logs with realistic benign background noise.
    """
    def __init__(self, rng: Optional[RNGFactory] = None):
        self.rng = rng or get_rng(42)

    def generate_benign_events(self, step: int, sim_time_s: float) -> List[CyberEvent]:
        events = []
        # Benign auth retry (approx 1% of steps)
        if self.rng.random() < 0.015:
            device_num = int(self.rng.uniform(1, 14))
            events.append(CyberEvent(
                id=f"CYB_BENIGN_{step}_AUTH",
                timestamp=sim_time_s,
                wall_time="",
                device_id=f"RTU_B{device_num:02d}",
                event_type=CyberEventType.AUTH_FAILURE,
                details="Transient operator session timeout / auth retry",
                severity="INFO",
                provenance=Provenance.OBSERVED
            ))

        # Benign network jitter / packet loss (approx 2% of steps)
        if self.rng.random() < 0.02:
            events.append(CyberEvent(
                id=f"CYB_BENIGN_{step}_PKT",
                timestamp=sim_time_s,
                wall_time="",
                device_id="SWITCH_CORE_01",
                event_type=CyberEventType.PACKET_LOSS,
                details="Transient network congestion: 1 packet dropped",
                severity="INFO",
                provenance=Provenance.OBSERVED
            ))

        return events

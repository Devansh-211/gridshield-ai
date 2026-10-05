"""
Single-Area Center-of-Inertia (COI) Frequency Swing Model (Section 5.4).
Implements the swing equation:
  2H * (df/dt) = (P_gen - P_load) - D * (f - f0) - (1/R) * (f - f0)
Labelled everywhere as: SIMULATED (simplified COI model).
"""

class FrequencyCOIModel:
    def __init__(self, f0: float = 60.0, H: float = 5.0, D: float = 2.0, R: float = 0.05, dt: float = 1.0):
        self.f0 = f0      # Nominal frequency (Hz)
        self.H = H        # Inertia constant (seconds)
        self.D = D        # Load damping factor
        self.R = R        # Governor droop
        self.dt = dt      # Step size (seconds)
        self.f = f0       # Current frequency (Hz)

    def reset(self):
        self.f = self.f0

    def step(self, p_gen_total_mw: float, p_load_total_mw: float, p_base_mw: float = 259.0) -> float:
        """
        Step frequency response forward by dt using single-area swing equation:
        2H * (df_pu/dt) = delta_p_pu - (D + 1/R) * delta_f_pu
        """
        delta_p_pu = (p_gen_total_mw - p_load_total_mw) / max(p_base_mw, 1.0)
        delta_f_pu = (self.f - self.f0) / self.f0

        df_pu_dt = (delta_p_pu - (self.D + (1.0 / self.R)) * delta_f_pu) / (2.0 * self.H)

        self.f += df_pu_dt * self.f0 * self.dt
        self.f = max(50.0, min(70.0, self.f))
        return float(self.f)

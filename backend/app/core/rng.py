"""
GridShield AI — Deterministic Counter-Based RNG Factory (Invariant I4).

Implements:
1. Seeded RNG generation with counter-based step/stream indexing for O(1) step noise generation.
2. Cross-platform reproducibility across serverless invocations.
"""

import random
from typing import Optional, Union, Sequence
import numpy as np

class RNGFactory:
    """
    Deterministic RNG Factory with support for sequential and counter-based stream indexing.
    """
    def __init__(self, seed: int = 42):
        self._seed = seed
        self._np_rng = np.random.default_rng(seed)
        self._py_random = random.Random(seed)

    @property
    def seed(self) -> int:
        return self._seed

    def reseed(self, seed: int):
        self._seed = seed
        self._np_rng = np.random.default_rng(seed)
        self._py_random = random.Random(seed)

    def step_rng(self, step: int, stream_id: int = 0) -> np.random.Generator:
        """Returns an O(1) counter-based generator for step t and stream s."""
        # Mix seed, step, and stream into a 64-bit integer sequence
        mixed_seed = (self._seed * 1000003 + step * 1009 + stream_id) & 0xFFFFFFFF
        return np.random.default_rng(mixed_seed)

    def normal(self, loc: float = 0.0, scale: float = 1.0, size: Optional[int] = None) -> Union[float, np.ndarray]:
        return self._np_rng.normal(loc=loc, scale=scale, size=size)

    def uniform(self, low: float = 0.0, high: float = 1.0, size: Optional[int] = None) -> Union[float, np.ndarray]:
        return self._np_rng.uniform(low=low, high=high, size=size)

    def choice(self, a, size=None, replace=True, p=None):
        return self._np_rng.choice(a, size=size, replace=replace, p=p)

    def random(self) -> float:
        return float(self._np_rng.random())


def get_rng(seed: int = 42) -> RNGFactory:
    return RNGFactory(seed)

def get_step_noise(seed: int, step: int, stream_id: int, loc: float = 0.0, scale: float = 1.0) -> float:
    """O(1) counter-based Gaussian noise generator."""
    mixed_seed = (seed * 1000003 + step * 1009 + stream_id) & 0xFFFFFFFF
    rng = np.random.default_rng(mixed_seed)
    return float(rng.normal(loc=loc, scale=scale))

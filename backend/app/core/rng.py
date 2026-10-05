import numpy as np
import random
from typing import Optional, Union

class RNGFactory:
    """
    Central Seeded RNG Factory (Invariant I4).
    Ensures all randomness (noise injection, attack jitter, cyber noise)
    is strictly deterministic and reproducible.
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

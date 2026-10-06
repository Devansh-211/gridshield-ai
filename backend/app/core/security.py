"""
GridShield AI — Security, Authentication & Cryptographic Utilities.

Implements:
1. Password hashing via Python standard library scrypt with cryptographically random salts.
2. Constant-time digest comparison to prevent timing attacks.
3. Secure session token generation and hashing.
4. Bootstrap token generation and verification for initial admin provisioning.
"""

import os
import hmac
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

SCRYPT_N = 16384
SCRYPT_R = 8
SCRYPT_P = 1
KEY_LEN = 64
SALT_LEN = 16


def hash_password(password: str) -> str:
    """Hash password using scrypt with a cryptographically secure random salt."""
    salt = secrets.token_bytes(SALT_LEN)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        maxmem=0,
        dklen=KEY_LEN
    )
    return f"scrypt${salt.hex()}${derived.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against scrypt hashed string."""
    try:
        parts = hashed.split("$")
        if len(parts) != 3 or parts[0] != "scrypt":
            return False
        salt = bytes.fromhex(parts[1])
        expected_derived = bytes.fromhex(parts[2])
        derived = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=SCRYPT_N,
            r=SCRYPT_R,
            p=SCRYPT_P,
            maxmem=0,
            dklen=KEY_LEN
        )
        return hmac.compare_digest(derived, expected_derived)
    except Exception:
        return False


def generate_session_token() -> str:
    """Generate a cryptographically secure 256-bit URL-safe session token."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """Deterministic SHA-256 hash of session token for database lookup."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# In-memory one-time bootstrap token state (generated on startup if 0 users exist)
_BOOTSTRAP_TOKEN: Optional[str] = None


def get_or_create_bootstrap_token() -> str:
    """Get or generate the active one-time bootstrap token."""
    global _BOOTSTRAP_TOKEN
    env_token = os.environ.get("GRIDSHIELD_BOOTSTRAP_TOKEN")
    if env_token:
        _BOOTSTRAP_TOKEN = env_token
        return _BOOTSTRAP_TOKEN
    if _BOOTSTRAP_TOKEN is None:
        _BOOTSTRAP_TOKEN = secrets.token_hex(16)
    return _BOOTSTRAP_TOKEN


def invalidate_bootstrap_token() -> None:
    """Permanently consume the one-time bootstrap token."""
    global _BOOTSTRAP_TOKEN
    _BOOTSTRAP_TOKEN = "CONSUMED"


def is_bootstrap_token_valid(token: str) -> bool:
    """Check if provided token matches active bootstrap token."""
    global _BOOTSTRAP_TOKEN
    if not _BOOTSTRAP_TOKEN or _BOOTSTRAP_TOKEN == "CONSUMED":
        return False
    return hmac.compare_digest(token.strip(), _BOOTSTRAP_TOKEN.strip())

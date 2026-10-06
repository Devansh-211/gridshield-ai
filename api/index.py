"""
GridShield AI — Vercel Serverless ASGI Entrypoint.
Imports and exposes the FastAPI app for Vercel's Python runtime.
"""

import sys
import os

# Ensure project root is on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.main import app

# Export ASGI handler
__all__ = ["app"]

#!/usr/bin/env python3
"""
GridShield AI — Serverless Bundle Size Checker (Section 12.1).
Ensures total repository size for Vercel deployment remains < 400 MB.
"""

import os
import sys

MAX_BUNDLE_MB = 400.0


def get_dir_size_mb(path: str, exclude_dirs: list) -> float:
    total_bytes = 0
    for root, dirs, files in os.walk(path):
        # Remove excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
        for f in files:
            fp = os.path.join(root, f)
            if not os.path.islink(fp):
                total_bytes += os.path.getsize(fp)
    return total_bytes / (1024 * 1024)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    exclude = ["node_modules", ".git", ".venv", "venv", "__pycache__", ".pytest_cache", ".agents"]
    
    size_mb = get_dir_size_mb(root, exclude)
    print(f"Total deployment bundle size (excluding node_modules/.git): {size_mb:.2f} MB")
    
    if size_mb > MAX_BUNDLE_MB:
        print(f"[FAIL] Bundle size exceeds {MAX_BUNDLE_MB} MB limit!")
        sys.exit(1)
    else:
        print(f"[PASS] Bundle size is well within Vercel's {MAX_BUNDLE_MB} MB limit.")
        sys.exit(0)


if __name__ == "__main__":
    main()

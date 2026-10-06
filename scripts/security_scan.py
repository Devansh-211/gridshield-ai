#!/usr/bin/env python3
"""
Lightweight Secret and Dependency Scanner for GridShield CI (Phase P1).
Scans codebase for leaked private keys, hardcoded credentials, and unsafe patterns.
"""
import os
import re
import sys

FORBIDDEN_PATTERNS = [
    (r'(?i)api[_-]?key\s*=\s*["\'][A-Za-z0-9_\-]{20,}["\']', "Potential Hardcoded API Key"),
    (r'(?i)secret[_-]?key\s*=\s*["\'][A-Za-z0-9_\-]{20,}["\']', "Potential Hardcoded Secret Key"),
    (r'(?i)postgres(?:ql)?:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+@', "Hardcoded Database Connection URI with credentials"),
    (r'-----BEGIN (?:RSA |EC )?PRIVATE KEY-----', "Hardcoded PEM Private Key")
]

IGNORE_DIRS = {".git", ".venv", "node_modules", "dist", ".pytest_cache", "__pycache__"}
IGNORE_FILES = {".env.example", "security_scan.py"}

def scan():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    violations = []

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

        for filename in filenames:
            if filename in IGNORE_FILES or filename.endswith(".joblib") or filename.endswith(".db"):
                continue

            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, 1):
                        for pattern, desc in FORBIDDEN_PATTERNS:
                            if re.search(pattern, line):
                                violations.append(f"{filepath}:{line_num} - {desc}")
            except Exception as e:
                pass

    if violations:
        print(f"SECURITY SCAN FAILED: {len(violations)} violations found:")
        for v in violations:
            print(f"  - {v}")
        sys.exit(1)
    else:
        print("SECURITY SCAN PASSED: 0 hardcoded secrets found.")

if __name__ == "__main__":
    scan()

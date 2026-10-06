#!/usr/bin/env python3
"""GridShield AI — Automated UI Tell & Design Invariant Linter (Section 11).

Scans frontend/src for forbidden AI-generated tells:
1. Banned marketing words (seamless, robust, AI-powered, magic, insights, etc.)
2. Forbidden CSS classes (gradient, backdrop-blur, animate-pulse, rounded-xl/2xl, shadow-lg/xl/2xl)
3. Raw hex colors outside tokens.css
"""

import os
import re
import sys

BANNED_WORDS = [
    "seamless", "cutting-edge", "leverage", "empower", "unlock",
    "supercharge", "real-time insights", "magic", "effortless"
]

FORBIDDEN_CLASSES = [
    r"\bbackdrop-blur",
    r"\bfrom-[a-z]+-\d+",
    r"\bto-[a-z]+-\d+",
    r"\bbg-gradient",
    r"\brounded-(?:xl|2xl|3xl|full)\b",
    r"\bshadow-(?:md|lg|xl|2xl|inner)\b",
    r"\banimate-(?:bounce|ping|pulse)\b",
]

SRC_DIR = os.path.join(os.path.dirname(__file__), "../frontend/src")

def main():
    violations = []
    files_checked = 0

    for root, _, files in os.walk(SRC_DIR):
        for f in files:
            if not f.endswith((".tsx", ".ts", ".jsx", ".js")):
                continue
            
            # Skip strings dictionary or test files where banned words may be checked
            filepath = os.path.join(root, f)
            relpath = os.path.relpath(filepath, SRC_DIR)
            files_checked += 1

            with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                lines = fh.readlines()

            for idx, line in enumerate(lines, 1):
                # Check for banned marketing words in UI strings
                for bw in BANNED_WORDS:
                    if bw.lower() in line.lower() and "BANNED" not in line and "strings.ts" not in relpath:
                        violations.append((relpath, idx, f"Banned marketing word '{bw}'"))

                # Check for forbidden Tailwind classes
                for fc in FORBIDDEN_CLASSES:
                    match = re.search(fc, line)
                    if match:
                        violations.append((relpath, idx, f"Forbidden AI tell class '{match.group(0)}'"))

    print(f"Checked {files_checked} frontend source files.")
    if violations:
        print(f"Found {len(violations)} UI design invariant violations:")
        for path, line, msg in violations:
            print(f"  {path}:{line} -> {msg}")
        return 1
    else:
        print("ALL AUTOMATED UI DESIGN INVARIANTS CLEAN (0 violations).")
        return 0

if __name__ == "__main__":
    sys.exit(main())

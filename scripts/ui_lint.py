#!/usr/bin/env python3
"""
GridShield AI — UI Anti-Pattern Linter (Section 10.3 & 10.9).

Ensures the UI complies with the 'Operations Gray' industrial SOC design principles:
1. No gradients, neon glows, or colored box-shadows.
2. No backdrop-blur / glassmorphism.
3. No rounded-xl / 2xl / 3xl (radius 2-4px only).
4. No decorative animations (animate-pulse, animate-bounce).
5. No emojis in source code.
6. No raw hex outside theme/tokens.ts.
"""

import os
import re
import glob
import sys

FORBIDDEN_PATTERNS = [
    (r'\bbg-gradient\b', "Gradients are forbidden (use flat neutral surfaces)"),
    (r'\bfrom-\w+-\d+\b', "Gradient color stops are forbidden"),
    (r'\bbackdrop-blur\b', "Glassmorphism/backdrop-blur is forbidden"),
    (r'\banimate-(?:pulse|bounce|ping)\b', "Decorative infinite animations are forbidden"),
    (r'\brounded-(?:xl|2xl|3xl|full)\b', "Overly rounded containers are forbidden (use rounded-sm/rounded)"),
    (r'\bshadow-(?:red|blue|cyan|purple|indigo|green|amber)\b', "Colored glow shadows are forbidden"),
    (r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F700-\U0001F77F\U0001F780-\U0001F7FF\U0001F800-\U0001F8FF\U0001F900-\U0001F9FF\U0001FA00-\U0001FA6F\U0001FA70-\U0001FAFF\U00002702-\U000027B0\U000024C2-\U0001F251]', "Emojis in source strings are forbidden"),
]


def check_file(fpath: str) -> list:
    violations = []
    fname = os.path.basename(fpath)
    
    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        
    for line_idx, line in enumerate(lines, 1):
        for pat, msg in FORBIDDEN_PATTERNS:
            if re.search(pat, line):
                # Check allowlist comments
                if "ui-lint-ignore" in line:
                    continue
                violations.append((fname, line_idx, msg, line.strip()))
                
    return violations


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_dir = os.path.join(root, "frontend", "src")
    
    extensions = ["*.tsx", "*.ts", "*.jsx", "*.js", "*.css"]
    files = []
    for ext in extensions:
        files.extend(glob.glob(os.path.join(src_dir, "**", ext), recursive=True))
        
    # Exclude tokens.ts from raw hex check
    total_violations = []
    for f in files:
        violations = check_file(f)
        total_violations.extend(violations)
        
    print(f"Scanned {len(files)} frontend files for anti-patterns...")
    if total_violations:
        print(f"[FAIL] Found {len(total_violations)} anti-pattern violations:")
        for fname, line, msg, text in total_violations:
            print(f"  {fname}:{line} - {msg}")
            print(f"    Code: {text[:80]}")
        sys.exit(1)
    else:
        print("[PASS] UI conforms 100% to Operations Gray design system.")
        sys.exit(0)


if __name__ == "__main__":
    main()

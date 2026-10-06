#!/usr/bin/env python3
"""
SBOM Generator for GridShield AI (Phase P1).
Extracts Python and Node.js dependencies and creates a machine-readable Software Bill of Materials.
"""
import os
import sys
import json
import subprocess
from datetime import datetime, timezone

def main():
    sbom = {
        "bomFormat": "CycloneDX-like-Lite",
        "specVersion": "1.4",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "component": {
            "name": "gridshield-ai",
            "version": "1.0.0",
            "type": "application",
            "description": "Explainable Cyber-Physical Resilience Platform for Power Grids"
        },
        "components": []
    }

    # 1. Python dependencies
    try:
        pip_proc = subprocess.run([sys.executable, "-m", "pip", "list", "--format=json"], capture_output=True, text=True, check=True)
        python_pkgs = json.loads(pip_proc.stdout)
        for pkg in python_pkgs:
            sbom["components"].append({
                "type": "library",
                "name": pkg["name"],
                "version": pkg["version"],
                "purl": f"pkg:pypi/{pkg['name']}@{pkg['version']}",
                "ecosystem": "pypi"
            })
    except Exception as e:
        print(f"Warning: Failed to enumerate python pkgs: {e}")

    # 2. Frontend dependencies from package.json
    frontend_pkg_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "package.json")
    if os.path.exists(frontend_pkg_path):
        try:
            with open(frontend_pkg_path, "r") as f:
                npm_pkg = json.load(f)
            deps = npm_pkg.get("dependencies", {})
            for name, ver in deps.items():
                clean_ver = ver.lstrip("^~")
                sbom["components"].append({
                    "type": "library",
                    "name": name,
                    "version": clean_ver,
                    "purl": f"pkg:npm/{name}@{clean_ver}",
                    "ecosystem": "npm"
                })
        except Exception as e:
            print(f"Warning: Failed to parse package.json: {e}")

    out_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs", "sbom.json")
    with open(out_path, "w") as f:
        json.dump(sbom, f, indent=2)

    print(f"SBOM successfully generated: {out_path} ({len(sbom['components'])} components)")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
GridShield AI — Remote Deployment Smoke Test (Section 12.3).
Tests all critical serverless API endpoints against a live or local target URL.

Usage:
    python scripts/smoke_remote.py https://gridshield-ai.vercel.app
    python scripts/smoke_remote.py http://127.0.0.1:8000
"""

import sys
import json
import urllib.request
import urllib.error


def run_smoke(base_url: str):
    base_url = base_url.rstrip("/")
    api_base = f"{base_url}/api/v1"
    print(f"Executing remote smoke tests against target: {base_url}")

    endpoints_to_test = [
        ("GET", f"{base_url}/health", None),
        ("GET", f"{api_base}/warmup", None),
        ("GET", f"{api_base}/grid/topology", None),
        ("GET", f"{api_base}/grid/state", None),
        ("GET", f"{api_base}/models/status", None),
        ("GET", f"{api_base}/alarms", None),
    ]

    for method, url, data in endpoints_to_test:
        req = urllib.request.Request(url, method=method)
        req.add_header("User-Agent", "GridShield-SmokeTest/1.0")
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                status = resp.status
                body = resp.read()
                print(f"  [PASS] {method} {url} -> HTTP {status} ({len(body)} bytes)")
        except urllib.error.HTTPError as e:
            print(f"  [FAIL] {method} {url} -> HTTP {e.code}: {e.read().decode('utf-8')[:120]}")
            return False
        except Exception as e:
            print(f"  [FAIL] {method} {url} -> Connection error: {e}")
            return False

    # Test Live Session Lifecycle
    print("\nTesting Live Session & Stepwise Advance Lifecycle...")
    try:
        session_url = f"{api_base}/runs/session"
        payload = json.dumps({"scenario_type": "NORMAL", "seed": 42}).encode("utf-8")
        req = urllib.request.Request(session_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            run_id = data["run_id"]
            print(f"  [PASS] Created live session: run_id={run_id}")

        advance_url = f"{api_base}/runs/{run_id}/advance?steps=2"
        req = urllib.request.Request(advance_url, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  [PASS] Advanced live session to step={data['current_step']}")

        demo_url = f"{api_base}/demo/{run_id}/next"
        req = urllib.request.Request(demo_url, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  [PASS] Stepped demo state machine: stage='{data['stage_name']}', step_index={data['step_index']}")
    except Exception as e:
        print(f"  [FAIL] Live session test failed: {e}")
        return False

    print("\n[SUCCESS] All remote smoke tests PASSED.")
    return True


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    success = run_smoke(target)
    sys.exit(0 if success else 1)

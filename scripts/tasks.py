#!/usr/bin/env python3
"""GridShield AI — Cross-Platform Task Runner (stdlib only).

Provides unified command execution for:
- setup, dev, train, eval, test, check, demo-test
- db-migrate, db-reset, bundle-check, smoke-remote
"""

import sys
import os
import subprocess
import argparse

PYTHON = sys.executable
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def run_cmd(cmd: list[str], cwd: str = ROOT_DIR, env_extra: dict = None) -> int:
    env = os.environ.copy()
    if env_extra:
        env.update(env_extra)
    print(f"\n[RUNNING] {' '.join(cmd)} (in {cwd})")
    res = subprocess.run(cmd, cwd=cwd, env=env)
    if res.returncode != 0:
        print(f"[FAILED] Exit code {res.returncode}")
    else:
        print(f"[SUCCESS] Command passed")
    return res.returncode

def task_setup():
    print("=== Task: Setup Dependencies ===")
    c1 = run_cmd([PYTHON, "-m", "pip", "install", "-r", "backend/requirements.txt"])
    if c1 != 0:
        return c1
    # Check if npm is available
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    return run_cmd([npm_cmd, "install"], cwd=os.path.join(ROOT_DIR, "frontend"))

def task_dev():
    print("=== Task: Dev Servers ===")
    print("Starting FastAPI backend on http://127.0.0.1:8000 ...")
    return run_cmd([PYTHON, "-m", "uvicorn", "backend.app.main:app", "--reload", "--port", "8000"])

def task_train():
    print("=== Task: Train Offline Baseline Models ===")
    return run_cmd([PYTHON, "-m", "backend.app.services.train_models"])

def task_eval():
    print("=== Task: Evaluate Models & Generate Metrics Report ===")
    if os.path.exists(os.path.join(ROOT_DIR, "scripts", "evaluate.py")):
        return run_cmd([PYTHON, "scripts/evaluate.py"])
    else:
        return run_cmd([PYTHON, "-m", "backend.app.services.train_models"])

def task_test():
    print("=== Task: Run Test Suite ===")
    return run_cmd([PYTHON, "-m", "pytest", "backend/tests/", "-v"])

def task_demo_test():
    print("=== Task: Run Headless Demo Verification ===")
    return run_cmd([PYTHON, "scripts/run_demo_test.py"])

def task_check():
    print("=== Task: Master Check Gate ===")
    if os.path.exists(os.path.join(ROOT_DIR, "scripts", "check.py")):
        return run_cmd([PYTHON, "scripts/check.py"])
    return task_test()

def task_bundle_check():
    print("=== Task: Check Serverless Bundle Size ===")
    if os.path.exists(os.path.join(ROOT_DIR, "scripts", "check_bundle_size.py")):
        return run_cmd([PYTHON, "scripts/check_bundle_size.py"])
    print("[WARN] scripts/check_bundle_size.py not yet implemented.")
    return 0

def task_smoke_remote(url: str):
    print(f"=== Task: Smoke Test Remote Deployment: {url} ===")
    if os.path.exists(os.path.join(ROOT_DIR, "scripts", "smoke_remote.py")):
        return run_cmd([PYTHON, "scripts/smoke_remote.py", url])
    print("[WARN] scripts/smoke_remote.py not yet implemented.")
    return 0

def task_db_migrate():
    print("=== Task: Run Database Migrations ===")
    return run_cmd([PYTHON, "-m", "alembic", "upgrade", "head"])

def task_db_reset():
    print("=== Task: Reset Local Database ===")
    db_file = os.path.join(ROOT_DIR, "data", "gridshield.db")
    if os.path.exists(db_file):
        os.remove(db_file)
        print(f"Removed {db_file}")
    return task_db_migrate()

def main():
    parser = argparse.ArgumentParser(description="GridShield AI Task Runner")
    parser.add_argument("task", choices=[
        "setup", "dev", "train", "eval", "test", "check", "demo-test",
        "db-migrate", "db-reset", "bundle-check", "smoke-remote"
    ], help="Task to execute")
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="Target URL for smoke-remote")

    args = parser.parse_args()

    task_map = {
        "setup": task_setup,
        "dev": task_dev,
        "train": task_train,
        "eval": task_eval,
        "test": task_test,
        "check": task_check,
        "demo-test": task_demo_test,
        "db-migrate": task_db_migrate,
        "db-reset": task_db_reset,
        "bundle-check": task_bundle_check,
        "smoke-remote": lambda: task_smoke_remote(args.url),
    }

    exit_code = task_map[args.task]()
    sys.exit(exit_code if exit_code is not None else 0)

if __name__ == "__main__":
    main()

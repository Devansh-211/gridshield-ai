import subprocess
import sys
import os
import json
import time

def run_step(name, cmd):
    print(f"\n==========================================")
    print(f"RUNNING: {name}")
    print(f"COMMAND: {cmd}")
    print(f"==========================================")
    start_time = time.time()
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    duration = time.time() - start_time
    print(result.stdout)
    if result.stderr:
        print(f"STDERR:\n{result.stderr}")
    passed = result.returncode == 0
    print(f"RESULT: {'PASSED' if passed else 'FAILED'} in {duration:.2f}s (Exit code: {result.returncode})")
    return {
        "step": name,
        "command": cmd,
        "status": "PASSED" if passed else "FAILED",
        "exit_code": result.returncode,
        "duration_s": round(duration, 2),
        "output": result.stdout[-500:] if len(result.stdout) > 500 else result.stdout
    }

def main():
    os.makedirs("reports", exist_ok=True)
    steps = []
    
    # 1. Type Generation & OpenAPI Sync
    steps.append(run_step("Contracts & Types Generation", f'"{sys.executable}" scripts/generate_types.py'))
    
    # 2. Phase-0 Feasibility Spikes
    steps.append(run_step("Phase-0 Spikes", f'"{sys.executable}" backend/spikes/phase0_spikes.py'))
    
    # 3. Pytest Backend Tests
    steps.append(run_step("Backend Unit & Integration Tests", f'"{sys.executable}" -m pytest backend/tests -v'))
    
    # Summary
    all_passed = all(s["status"] == "PASSED" for s in steps)
    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "overall_status": "PASSED" if all_passed else "FAILED",
        "steps": steps
    }
    
    with open("reports/check_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        
    print(f"\n==========================================")
    print(f"CHECK SUMMARY: {'ALL PASSED' if all_passed else 'SOME STEPS FAILED'}")
    print(f"Saved full report to reports/check_report.json")
    print(f"==========================================")
    
    if not all_passed:
        sys.exit(1)

if __name__ == "__main__":
    main()

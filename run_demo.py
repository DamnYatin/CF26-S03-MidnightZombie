"""
Beginner-Friendly Demo Runner for Urban Infrastructure Cascade Simulator.

Run this script directly with:
    python run_demo.py

It provides an interactive menu to:
1. Run a quick offline simulation (Central Grid Blackout).
2. Run all 5 automated Pytest reproducibility tests.
3. Launch the full FastAPI backend server.
4. List all built-in crisis scenarios.
"""

import sys
import os
import subprocess

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def print_header():
    print("\n" + "=" * 76)
    print("  [CITY] URBAN INFRASTRUCTURE CASCADE SIMULATOR -- QUICK DEMO RUNNER")
    print("=" * 76)
    print("  Select an action below:")
    print("    [1] Run Offline Simulation Demo (Central Grid Blackout, Seed 42)")
    print("    [2] Run Automated Pytest Reproducibility Suite (5/5 Tests)")
    print("    [3] View All Built-in Crisis Scenarios")
    print("    [4] Start FastAPI Backend Server (Port 8000)")
    print("    [5] Exit")
    print("=" * 76)

def main():
    while True:
        print_header()
        choice = input("\n>> Enter choice [1-5] (default is 1): ").strip()
        if not choice:
            choice = "1"

        if choice == "1":
            print("\n[RUNNING] Executing Central Grid Blackout offline simulation...")
            subprocess.run([sys.executable, "backend/main.py", "--scenario", "power_grid_collapse", "--seed", "42", "--ticks", "15"])
            input("\nPress Enter to return to menu...")
        elif choice == "2":
            print("\n[RUNNING] Running Pytest Reproducibility Tests...")
            subprocess.run([sys.executable, "-m", "pytest", "backend/tests/test_reproducibility.py", "-v"])
            input("\nPress Enter to return to menu...")
        elif choice == "3":
            subprocess.run([sys.executable, "backend/main.py", "--list-scenarios"])
            input("\nPress Enter to return to menu...")
        elif choice == "4":
            print("\n[STARTING] Launching FastAPI Backend on http://localhost:8000...")
            print("Press CTRL+C to stop the server and return here.\n")
            try:
                subprocess.run(["uvicorn", "backend.api:app", "--reload", "--port", "8000"])
            except KeyboardInterrupt:
                pass
        elif choice == "5":
            print("\n[DONE] Good luck with your hackathon presentation!\n")
            break
        else:
            print("[ERROR] Invalid choice. Please enter a number from 1 to 5.")

if __name__ == "__main__":
    main()

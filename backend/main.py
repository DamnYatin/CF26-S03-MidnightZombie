"""
Offline CLI Demo Entry Point for Urban Infrastructure Cascade Simulator.

Accepts command-line arguments to run reproducible offline simulations, prints
formatted event logs and summary analytical tables, and optionally saves visual
graph snapshots.

Usage:
    python backend/main.py --scenario power_grid_collapse --seed 42 --ticks 15
    python backend/main.py --list-scenarios
    python backend/main.py --initial-failures POWER_MAIN_PLANT TRAIN_SIGNAL_CENTRAL --seed 123 --visualize
"""

import argparse
import sys
import os

# Add parent directory to path so imports work seamlessly when run from root or backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from graph_builder import build_urban_infrastructure_graph
from cascade_engine import run_simulation
from scenarios import list_scenarios, get_scenario
from visualize import render_ascii_graph_summary, plot_graph_snapshot
from metrics import metrics_to_dict


def parse_arguments() -> argparse.Namespace:
    """Parses command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Urban Infrastructure Cascade Simulator — Offline CLI Command Center",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    parser.add_argument(
        "--scenario",
        type=str,
        default="power_grid_collapse",
        help="Name of preset scenario to run (e.g. power_grid_collapse, transit_blackout_combo, telecom_fiber_sever, water_pump_surge)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Deterministic random seed governing failure propagation rolls",
    )
    parser.add_argument(
        "--ticks",
        type=int,
        default=18,
        help="Maximum discrete time steps (ticks) to simulate",
    )
    parser.add_argument(
        "--initial-failures",
        nargs="+",
        default=None,
        help="Custom list of space-separated node IDs to fail at tick 0 (overrides scenario preset)",
    )
    parser.add_argument(
        "--visualize",
        action="store_true",
        help="Generate a static PNG graph visualization snapshot using Matplotlib",
    )
    parser.add_argument(
        "--list-scenarios",
        action="store_true",
        help="Print catalog of built-in crisis scenarios and exit",
    )

    return parser.parse_args()


def display_scenario_catalog() -> None:
    """Prints a formatted catalog of all available built-in scenarios."""
    scenarios = list_scenarios()
    print("\n" + "=" * 78)
    print("  URBAN INFRASTRUCTURE CASCADE SIMULATOR -- PRESET SCENARIO CATALOG")
    print("=" * 78)
    for sc in scenarios:
        print(f"\n  [ID]        : {sc.id}")
        print(f"  [Title]     : {sc.title} ({sc.severity} SEVERITY)")
        print(f"  [Focus]     : Sector: {sc.category_focus.upper()}")
        print(f"  [Disrupts]  : {', '.join(sc.initial_failures)}")
        print(f"  [Summary]   : {sc.summary}")
    print("\n" + "=" * 78 + "\n")


def print_cli_summary(result) -> None:
    """Prints a polished ASCII telemetry report of the completed simulation run."""
    print("\n" + "#" * 78)
    print(f"  SIMULATION RUN COMPLETE: {result.run_id}")
    print(f"  Scenario: {result.config.scenario_id} | Seed: {result.config.seed} | Max Ticks: {result.config.max_ticks}")
    print("#" * 78)

    print("\n--- CHRONOLOGICAL EVENT LOG ---")
    if not result.events:
        print("  (No disruption events recorded)")
    else:
        for evt in result.events:
            parent_info = f" [Caused by {evt.source_service_id}]" if evt.source_service_id else ""
            print(f"  [Tick {evt.tick:02d}] {evt.event_type.upper():<16} | Node: {evt.node_id:<22}{parent_info}")
            if evt.details:
                print(f"            |-- {evt.details}")

    print("\n" + "=" * 78)
    print("  EXECUTIVE METRICS & TELEMETRY SUMMARY")
    print("=" * 78)
    m = result.metrics
    print(f"  * Cascade Depth (Causal Chain Length) : {m.cascade_depth}")
    print(f"  * Total Unique Affected Services       : {m.total_affected_services} / 16 nodes")
    print(f"  * System Total Recovery Time           : {m.recovery_time_ticks} ticks")
    print(f"  * Total Ticks Simulated                : {m.total_ticks_simulated} ticks")
    print(f"  * System Resilience Score              : {m.resilience_score:.1f} / 100.0")
    print(f"  * Affected Node IDs                    : {', '.join(m.affected_service_ids) if m.affected_service_ids else 'None'}")
    
    print("\n--- IMPACT BY INFRASTRUCTURE SECTOR ---")
    for cat, count in sorted(m.category_breakdown.items()):
        bar = "#" * (count * 3)
        print(f"  {cat.capitalize():<12} : {count:02d} nodes {bar}")

    print("\n--- ACTIVE DISRUPTIONS TIMELINE PER TICK ---")
    timeline_str = " -> ".join(f"T{i}:{cnt}" for i, cnt in enumerate(m.failure_timeline))
    print(f"  {timeline_str}")
    print("=" * 78 + "\n")


def main() -> None:
    """CLI execution entrypoint."""
    args = parse_arguments()

    if args.list_scenarios:
        display_scenario_catalog()
        return

    # Determine initial failures from CLI args or scenario preset
    scenario = get_scenario(args.scenario)
    if args.initial_failures:
        initial_failures = args.initial_failures
        scenario_name = "custom_cli"
    elif scenario:
        initial_failures = scenario.initial_failures
        scenario_name = scenario.id
    else:
        print(f"[ERROR] Unknown scenario '{args.scenario}'. Use --list-scenarios to view presets.")
        sys.exit(1)

    print(f"\n[INIT] Initializing Urban Infrastructure Graph...")
    graph = build_urban_infrastructure_graph()

    print(f"[RUN] Starting simulation (Scenario: '{scenario_name}', Seed: {args.seed}, Ticks: {args.ticks})...")
    result = run_simulation(
        graph=graph,
        initial_failures=initial_failures,
        seed=args.seed,
        max_ticks=args.ticks,
        scenario_id=scenario_name,
    )

    print_cli_summary(result)

    if args.visualize:
        output_file = f"cascade_run_{args.seed}.png"
        last_state = result.states[-1] if result.states else None
        saved_path = plot_graph_snapshot(
            graph=graph,
            state=last_state,
            output_filepath=output_file,
            title=f"Urban Infrastructure Cascade (Seed: {args.seed}, Scenario: {scenario_name})",
        )
        print(f"[VISUALIZE] Static graph plot saved to: {saved_path}\n")


if __name__ == "__main__":
    main()

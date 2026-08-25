"""
Reproducibility and Determinism Test Suite for Cascade Engine.

Tests:
1. Deterministic Reproducibility: Two separate runs with the same seed and scenario
   produce byte-identical event logs, tick snapshots, and metrics.
2. Divergence: Different seeds yield differing stochastic cascade sequences.
3. Multi-Node Initial Disruption: Verifies simultaneous initial failures at tick 0.
4. Causal Lineage: Verifies every cascade failure has a valid upstream parent `source_service_id`.
5. Recovery Timelines: Verifies recovery countdown decrements properly and flips status to recovered.
"""

import sys
import os
import json
import pytest

# Ensure backend modules are importable from test runner
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from cascade_engine import run_simulation
from graph_builder import build_urban_infrastructure_graph
from models import NodeStatus


def test_byte_identical_reproducibility():
    """
    Guarantees that given the exact same seed (e.g. 42) and scenario,
    two independent simulation executions produce identical event logs and JSON dumps.
    """
    graph1 = build_urban_infrastructure_graph()
    graph2 = build_urban_infrastructure_graph()

    result_1 = run_simulation(
        graph=graph1,
        initial_failures=["POWER_MAIN_PLANT"],
        seed=42,
        max_ticks=15,
        scenario_id="power_grid_collapse",
    )

    result_2 = run_simulation(
        graph=graph2,
        initial_failures=["POWER_MAIN_PLANT"],
        seed=42,
        max_ticks=15,
        scenario_id="power_grid_collapse",
    )

    # 1. Compare event logs length and content
    assert len(result_1.events) == len(result_2.events), "Event counts differ between identical runs"
    
    events_dump_1 = [e.model_dump() for e in result_1.events]
    events_dump_2 = [e.model_dump() for e in result_2.events]
    assert events_dump_1 == events_dump_2, "Event logs differ between identical runs"

    # 2. Compare tick states length and node snapshots
    assert len(result_1.states) == len(result_2.states), "Tick state counts differ"
    for s1, s2 in zip(result_1.states, result_2.states):
        assert s1.tick == s2.tick
        assert s1.active_failures_count == s2.active_failures_count
        assert s1.newly_failed == s2.newly_failed
        assert s1.newly_recovered == s2.newly_recovered
        assert s1.nodes.keys() == s2.nodes.keys()
        for nid in s1.nodes:
            assert s1.nodes[nid].status == s2.nodes[nid].status
            assert s1.nodes[nid].remaining_recovery_ticks == s2.nodes[nid].remaining_recovery_ticks

    # 3. Compare aggregate metrics
    m1 = result_1.metrics.model_dump()
    m2 = result_2.metrics.model_dump()
    assert m1 == m2, "Metrics differ between identical runs"


def test_seed_divergence():
    """
    Guarantees that different seeds produce divergent stochastic simulation outcomes.
    """
    graph_a = build_urban_infrastructure_graph()
    graph_b = build_urban_infrastructure_graph()

    result_seed_42 = run_simulation(
        graph=graph_a,
        initial_failures=["POWER_MAIN_PLANT"],
        seed=42,
        max_ticks=15,
    )

    result_seed_9999 = run_simulation(
        graph=graph_b,
        initial_failures=["POWER_MAIN_PLANT"],
        seed=9999,
        max_ticks=15,
    )

    events_42 = [e.model_dump() for e in result_seed_42.events]
    events_9999 = [e.model_dump() for e in result_seed_9999.events]

    # Different seeds should produce distinct random roll sequences
    assert events_42 != events_9999, "Different seeds unexpectedly produced identical outputs"


def test_multi_node_initial_failures():
    """
    Verifies that multiple simultaneous failures at tick 0 are all registered as manual root failures.
    """
    graph = build_urban_infrastructure_graph()
    init_fails = ["POWER_SUB_SOUTH", "TRAIN_SIGNAL_CENTRAL", "FIBER_BACKBONE"]

    result = run_simulation(
        graph=graph,
        initial_failures=init_fails,
        seed=42,
        max_ticks=10,
    )

    tick_0_state = result.states[0]
    assert tick_0_state.tick == 0
    assert set(init_fails).issubset(set(tick_0_state.newly_failed))

    for nid in init_fails:
        assert tick_0_state.nodes[nid].status == NodeStatus.FAILED
        assert tick_0_state.nodes[nid].source_service_id is None


def test_causal_lineage_and_depth():
    """
    Verifies that all cascade failures record a valid upstream source_service_id
    and cascade depth is non-negative and correctly bounded.
    """
    graph = build_urban_infrastructure_graph()
    result = run_simulation(
        graph=graph,
        initial_failures=["POWER_MAIN_PLANT"],
        seed=42,
        max_ticks=20,
    )

    cascade_events = [e for e in result.events if e.event_type == "cascade_failure"]
    for evt in cascade_events:
        assert evt.source_service_id is not None, f"Cascade event for {evt.node_id} is missing source_service_id"
        assert graph.has_edge(evt.source_service_id, evt.node_id), (
            f"Edge ({evt.source_service_id} -> {evt.node_id}) does not exist in graph"
        )

    # Metrics cascade depth must be at least 1 when cascade events occur
    if len(cascade_events) > 0:
        assert result.metrics.cascade_depth >= 1
    assert result.metrics.cascade_depth < len(graph.nodes)


def test_recovery_countdown_lifecycle():
    """
    Verifies that a failed node counts down its remaining_recovery_ticks
    and flips back to RECOVERED when the timer expires.
    """
    graph = build_urban_infrastructure_graph()
    result = run_simulation(
        graph=graph,
        initial_failures=["CELL_TOWER_NORTH"],  # telecom recovery duration is 2
        seed=42,
        max_ticks=10,
    )

    # Find node CELL_TOWER_NORTH history across states
    tower_history = [s.nodes["CELL_TOWER_NORTH"] for s in result.states]
    
    # Tick 0: Failed with remaining_recovery_ticks = 2
    assert tower_history[0].status == NodeStatus.FAILED
    assert tower_history[0].remaining_recovery_ticks == 2

    # Tick 1: In recovery countdown (remaining = 1)
    assert tower_history[1].status == NodeStatus.RECOVERING
    assert tower_history[1].remaining_recovery_ticks == 1

    # Tick 2: Fully recovered (remaining = 0)
    assert tower_history[2].status == NodeStatus.RECOVERED
    assert tower_history[2].remaining_recovery_ticks == 0

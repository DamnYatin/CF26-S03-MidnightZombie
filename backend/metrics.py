"""
Simulation Metrics Calculation Module.

This module analyzes the complete execution log of a cascade simulation to compute:
1. Cascade Depth: The maximum causal depth (length of the longest chain of
   `source_service_id` parent-child failure triggers).
2. Total Affected Services: Count of unique urban service nodes disrupted.
3. System Recovery Time: Number of discrete ticks from initial failure onset
   until all network nodes return to operational status (zero active disruptions).
4. Category Impact Breakdown: Distribution of failures across infrastructure sectors.
5. System Resilience Score: Composite score (0-100) reflecting infrastructure robustness.
"""

import sys
import os
from typing import List, Dict, Set, Optional, Any
import networkx as nx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from models import SimulationState, DisruptionEvent, SimulationMetrics, NodeStatus
except ImportError:
    from backend.models import SimulationState, DisruptionEvent, SimulationMetrics, NodeStatus


def calculate_metrics(
    states: List[SimulationState],
    events: List[DisruptionEvent],
    graph: nx.DiGraph,
) -> SimulationMetrics:
    """
    Computes analytical metrics from the simulation state snapshots and event logs.

    Args:
        states (List[SimulationState]): Chronological sequence of tick snapshots.
        events (List[DisruptionEvent]): Flat sequence of all disruption and recovery events.
        graph (nx.DiGraph): The underlying master network graph.

    Returns:
        SimulationMetrics: Calculated aggregate metrics.
    """
    total_nodes_in_system = len(graph.nodes) if graph is not None else 16
    total_ticks_simulated = len(states) - 1 if states else 0

    # 1. Identify all unique affected services
    affected_services: Set[str] = set()
    parent_map: Dict[str, Optional[str]] = {}

    for evt in events:
        if evt.event_type in ("manual_failure", "cascade_failure"):
            affected_services.add(evt.node_id)
            if evt.node_id not in parent_map or evt.source_service_id is not None:
                parent_map[evt.node_id] = evt.source_service_id

    total_affected = len(affected_services)

    # 2. Compute Cascade Depth (Longest chain of parent pointers)
    # If a node has source_service_id = None (manual root), its depth is 0.
    # If node B failed due to A (depth 0), B has depth 1.
    # If C failed due to B, C has depth 2.
    cascade_depth = 0
    depth_memo: Dict[str, int] = {}

    def get_node_depth(node_id: str, visited: Set[str]) -> int:
        if node_id in depth_memo:
            return depth_memo[node_id]
        if node_id in visited:
            # Cycle safety (should not occur in DAG cascades, but guarded)
            return 0
        
        parent_id = parent_map.get(node_id)
        if not parent_id or parent_id not in parent_map:
            depth_memo[node_id] = 0
            return 0

        visited.add(node_id)
        d = 1 + get_node_depth(parent_id, visited)
        depth_memo[node_id] = d
        return d

    for node_id in affected_services:
        d = get_node_depth(node_id, set())
        if d > cascade_depth:
            cascade_depth = d

    # 3. Compute System Recovery Time
    # First tick with active failure -> First subsequent tick where active_failures == 0
    first_failure_tick: Optional[int] = None
    full_recovery_tick: Optional[int] = None

    failure_timeline: List[int] = []

    for state in states:
        failure_timeline.append(state.active_failures_count)
        if state.active_failures_count > 0 and first_failure_tick is None:
            first_failure_tick = state.tick
        elif first_failure_tick is not None and state.active_failures_count == 0 and full_recovery_tick is None:
            full_recovery_tick = state.tick

    if first_failure_tick is None:
        recovery_time_ticks = 0
    elif full_recovery_tick is not None:
        recovery_time_ticks = full_recovery_tick - first_failure_tick
    else:
        # System did not fully recover within max_ticks
        recovery_time_ticks = total_ticks_simulated - first_failure_tick

    # 4. Sector Breakdown
    category_breakdown: Dict[str, int] = {}
    if states:
        # Sample metadata from first state
        nodes_ref = states[0].nodes
        for node_id in affected_services:
            if node_id in nodes_ref:
                cat = nodes_ref[node_id].category.value
                category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

    # 5. Composite Resilience Score (0 to 100)
    # Higher score = less impact, shallower depth, faster recovery.
    # Score formula penalizes proportion of affected nodes, depth, and duration.
    if total_affected == 0:
        resilience_score = 100.0
    else:
        fraction_affected = total_affected / max(1, total_nodes_in_system)
        depth_penalty = min(1.0, cascade_depth / 4.0)
        time_penalty = min(1.0, recovery_time_ticks / 15.0)

        # Weighted impact deduction
        deduction = (0.50 * fraction_affected + 0.25 * depth_penalty + 0.25 * time_penalty) * 100.0
        resilience_score = max(5.0, round(100.0 - deduction, 1))

    return SimulationMetrics(
        cascade_depth=cascade_depth,
        total_affected_services=total_affected,
        affected_service_ids=sorted(list(affected_services)),
        recovery_time_ticks=recovery_time_ticks,
        total_ticks_simulated=total_ticks_simulated,
        resilience_score=resilience_score,
        failure_timeline=failure_timeline,
        category_breakdown=category_breakdown,
    )


def metrics_to_dict(metrics: SimulationMetrics) -> Dict[str, Any]:
    """
    Converts SimulationMetrics model into a clean plain dictionary for CLI formatting.
    """
    return metrics.model_dump()

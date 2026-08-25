"""
Discrete-Time Cascade Simulation Engine.

This module implements the core discrete tick loop (t = 0 .. max_ticks) that models
stochastic failure propagation and recovery dynamics across interdependent urban services.

Key Principles:
1. Strict Reproducibility: All probabilistic decisions are governed exclusively by a
   dedicated `random.Random(seed)` instance passed to the engine. Global random is never touched.
2. Next-Tick Propagation: When node `u` fails at tick `t`, its downstream neighbors `v`
   roll against edge probability `P(u -> v)` and, if triggered, fail at tick `t + 1`.
3. Causal Lineage: Every cascade disruption records `source_service_id` (the parent node),
   enabling exact tree reconstruction for cascade depth metrics.
4. Immutable State Snapshots: Each tick produces an independent, deep snapshot
   (`SimulationState`) rather than mutating shared memory.
"""

import copy
import random
import uuid
import sys
import os
from typing import Dict, List, Optional, Set, Generator, Tuple
import networkx as nx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from models import (
        NodeStatus,
        ServiceCategory,
        ServiceNode,
        ServiceEdge,
        DisruptionEvent,
        SimulationState,
        SimulationConfig,
        SimulationResult,
    )
    from graph_builder import build_urban_infrastructure_graph, get_all_service_nodes, get_all_service_edges
    from metrics import calculate_metrics
except ImportError:
    from backend.models import (
        NodeStatus,
        ServiceCategory,
        ServiceNode,
        ServiceEdge,
        DisruptionEvent,
        SimulationState,
        SimulationConfig,
        SimulationResult,
    )
    from backend.graph_builder import build_urban_infrastructure_graph, get_all_service_nodes, get_all_service_edges
    from backend.metrics import calculate_metrics


def run_simulation(
    graph: Optional[nx.DiGraph] = None,
    initial_failures: Optional[List[str]] = None,
    seed: int = 42,
    max_ticks: int = 20,
    scenario_id: str = "custom",
    custom_failure_schedule: Optional[Dict[int, List[str]]] = None,
) -> SimulationResult:
    """
    Executes a complete batch simulation run and returns all states, events, and metrics.

    Args:
        graph (Optional[nx.DiGraph]): The base infrastructure graph. If None, builds default graph.
        initial_failures (Optional[List[str]]): List of node IDs to manually fail at tick 0.
        seed (int): Deterministic RNG seed.
        max_ticks (int): Upper bound of discrete ticks to simulate.
        scenario_id (str): Label for the scenario.
        custom_failure_schedule (Optional[Dict[int, List[str]]]): Additional manual failures by tick.

    Returns:
        SimulationResult: Complete execution artifact containing snapshots and metrics.
    """
    # Instantiate isolated deterministic RNG instance
    rng = random.Random(seed)

    if graph is None:
        graph = build_urban_infrastructure_graph()

    initial_fails = list(initial_failures) if initial_failures else []
    schedule = dict(custom_failure_schedule) if custom_failure_schedule else {}

    config = SimulationConfig(
        scenario_id=scenario_id,
        initial_failures=initial_fails,
        seed=seed,
        max_ticks=max_ticks,
    )

    states: List[SimulationState] = []
    all_events: List[DisruptionEvent] = []

    # Stream through tick generator to build immutable state history
    for state in step_simulation_generator(
        graph=graph,
        initial_failures=initial_fails,
        rng=rng,
        max_ticks=max_ticks,
        failure_schedule=schedule,
    ):
        states.append(state)
        all_events.extend(state.events)

    # Compute analytical metrics from the completed run history
    metrics = calculate_metrics(states=states, events=all_events, graph=graph)

    run_id = f"run_{scenario_id}_{seed}_{uuid.uuid4().hex[:8]}"

    return SimulationResult(
        run_id=run_id,
        config=config,
        states=states,
        events=all_events,
        metrics=metrics,
    )


def step_simulation_generator(
    graph: nx.DiGraph,
    initial_failures: List[str],
    rng: random.Random,
    max_ticks: int = 20,
    failure_schedule: Optional[Dict[int, List[str]]] = None,
) -> Generator[SimulationState, None, None]:
    """
    Generator yielding an immutable `SimulationState` snapshot for each discrete tick (t=0..T).
    
    This generator powers both the offline CLI loop and the real-time FastAPI WebSocket stream.

    Simulation Tick Lifecycle:
        Step 1: Apply scheduled manual disruptions for current tick `t`.
        Step 2: Decrement recovery countdowns for active failures and transition zeroed nodes to UP.
        Step 3: Propagate cascade failures from newly failed nodes (from previous tick) to un-failed neighbors.
        Step 4: Emit deep immutable `SimulationState` snapshot.
        Step 5: Check early termination conditions if all infrastructure has fully recovered and no new failures are scheduled.
    """
    schedule = failure_schedule or {}
    
    # Initialize internal mutable tracking state from graph
    nodes_state: Dict[str, ServiceNode] = get_all_service_nodes(graph)
    edges_list: List[ServiceEdge] = get_all_service_edges(graph)

    # Track nodes that failed in tick t-1 to propagate their cascades into tick t
    pending_propagators: List[Tuple[str, str]] = []  # [(parent_node_id, failing_child_node_id)]
    
    for t in range(max_ticks + 1):
        tick_events: List[DisruptionEvent] = []
        newly_failed_this_tick: List[str] = []
        newly_recovered_this_tick: List[str] = []

        # ---------------------------------------------------------------------
        # STEP 1: APPLY SCHEDULED MANUAL DISRUPTIONS (at tick 0 or scheduled t)
        # ---------------------------------------------------------------------
        manual_failures_to_apply: List[str] = []
        if t == 0:
            manual_failures_to_apply.extend(initial_failures)
        if t in schedule:
            manual_failures_to_apply.extend(schedule[t])

        for node_id in manual_failures_to_apply:
            if node_id in nodes_state and nodes_state[node_id].status != NodeStatus.FAILED:
                node = nodes_state[node_id]
                node.status = NodeStatus.FAILED
                node.remaining_recovery_ticks = node.recovery_duration
                node.failed_at_tick = t
                node.recovered_at_tick = None
                node.source_service_id = None  # Manual root disruption has no parent

                event = DisruptionEvent(
                    tick=t,
                    node_id=node_id,
                    event_type="manual_failure",
                    source_service_id=None,
                    details=f"Manual initial failure triggered on {node.name} (Recovery: {node.recovery_duration} ticks)."
                )
                tick_events.append(event)
                newly_failed_this_tick.append(node_id)

        # ---------------------------------------------------------------------
        # STEP 2: APPLY CASCADE FAILURES SCHEDULED FROM TICK t-1
        # ---------------------------------------------------------------------
        # Pending propagators are pairs (parent, child) computed from last tick's rolls
        for parent_id, child_id in pending_propagators:
            if child_id in nodes_state:
                child = nodes_state[child_id]
                # Only fail if child is currently UP or RECOVERED (not already failed)
                if child.status in (NodeStatus.UP, NodeStatus.RECOVERED):
                    child.status = NodeStatus.FAILED
                    child.remaining_recovery_ticks = child.recovery_duration
                    child.failed_at_tick = t
                    child.recovered_at_tick = None
                    child.source_service_id = parent_id

                    parent_name = nodes_state[parent_id].name if parent_id in nodes_state else parent_id
                    event = DisruptionEvent(
                        tick=t,
                        node_id=child_id,
                        event_type="cascade_failure",
                        source_service_id=parent_id,
                        details=f"Cascade failure propagated from [{parent_name}] to [{child.name}]."
                    )
                    tick_events.append(event)
                    newly_failed_this_tick.append(child_id)

        # Clear pending propagators now that they've been applied at tick t
        pending_propagators.clear()

        # ---------------------------------------------------------------------
        # STEP 3: DECREMENT RECOVERY COUNTERS & RESTORE RECOVERED NODES
        # ---------------------------------------------------------------------
        # For nodes that were already failed before this tick (or during this tick),
        # decrement remaining_recovery_ticks. (Only decrement nodes that didn't just fail this tick)
        for node_id, node in nodes_state.items():
            if node.status in (NodeStatus.FAILED, NodeStatus.RECOVERING):
                if node_id not in newly_failed_this_tick:
                    node.remaining_recovery_ticks = max(0, node.remaining_recovery_ticks - 1)

                    if node.remaining_recovery_ticks == 0:
                        # Recovery completed: flip back to RECOVERED / UP
                        node.status = NodeStatus.RECOVERED
                        node.recovered_at_tick = t
                        newly_recovered_this_tick.append(node_id)

                        event = DisruptionEvent(
                            tick=t,
                            node_id=node_id,
                            event_type="recovered",
                            source_service_id=None,
                            details=f"Service [{node.name}] successfully completed recovery and returned to operational status."
                        )
                        tick_events.append(event)
                    else:
                        # Node is actively in recovery countdown
                        node.status = NodeStatus.RECOVERING

        # ---------------------------------------------------------------------
        # STEP 4: ROLL PROBABILITIES FOR NEXT TICK's CASCADES (from newly failed)
        # ---------------------------------------------------------------------
        # For every node that failed on THIS tick, inspect outgoing edges (u -> v).
        # Seeded roll: if rng.random() < edge_probability, schedule v to fail on tick t + 1.
        for failing_node_id in newly_failed_this_tick:
            if graph.has_node(failing_node_id):
                # Inspect all downstream neighbors dependent on failing_node_id
                for _, target_id, edge_data in graph.out_edges(failing_node_id, data=True):
                    if target_id in nodes_state:
                        target_node = nodes_state[target_id]
                        # Target can only be disrupted if currently operational
                        if target_node.status in (NodeStatus.UP, NodeStatus.RECOVERED):
                            # Avoid double-scheduling target in same tick
                            already_scheduled = any(tgt == target_id for _, tgt in pending_propagators)
                            if not already_scheduled:
                                prob = edge_data.get("propagation_probability", 0.5)
                                # Deterministic seeded random roll
                                roll = rng.random()
                                if roll < prob:
                                    # Roll succeeded: schedule target to fail on tick t + 1
                                    pending_propagators.append((failing_node_id, target_id))

        # Count active disruptions in the network
        active_failures_count = sum(
            1 for n in nodes_state.values()
            if n.status in (NodeStatus.FAILED, NodeStatus.RECOVERING)
        )

        # ---------------------------------------------------------------------
        # STEP 5: EMIT IMMUTABLE TICK SNAPSHOT
        # ---------------------------------------------------------------------
        # Deep copy nodes_state to ensure each tick snapshot is completely immutable
        snapshot_nodes: Dict[str, ServiceNode] = {
            nid: ServiceNode(**node.model_dump())
            for nid, node in nodes_state.items()
        }

        current_state = SimulationState(
            tick=t,
            nodes=snapshot_nodes,
            edges=edges_list,
            newly_failed=newly_failed_this_tick,
            newly_recovered=newly_recovered_this_tick,
            active_failures_count=active_failures_count,
            events=tick_events,
        )

        yield current_state

        # Early exit optimization: If system has 0 active failures, no pending propagators,
        # no future scheduled failures, and t > 0, we can safely conclude the run.
        has_future_manual_failures = any(future_t > t for future_t in schedule.keys())
        if (
            t > 0
            and active_failures_count == 0
            and len(pending_propagators) == 0
            and not has_future_manual_failures
        ):
            break

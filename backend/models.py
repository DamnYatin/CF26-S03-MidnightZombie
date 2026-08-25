"""
Data Models and Type Definitions for the Urban Infrastructure Simulator.

This module defines Pydantic models representing services, dependency links,
discrete disruption events, tick snapshots (immutable states), and post-run
aggregated telemetry metrics.
"""

from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class NodeStatus(str, Enum):
    """
    Operational statuses of an urban infrastructure node:
    - UP: Operating normally at full operational capacity (Grey / Cyan baseline).
    - FAILED: Currently disrupted; incapable of servicing downstream dependencies (Red).
    - RECOVERING: Restoration underway; countdown active until recovery completes (Yellow / Amber).
    - RECOVERED: Service has completed recovery and returned to 'UP' state (Green).
    """
    UP = "up"
    FAILED = "failed"
    RECOVERING = "recovering"
    RECOVERED = "recovered"


class ServiceCategory(str, Enum):
    """Categories of urban infrastructure services."""
    POWER = "power"
    WATER = "water"
    TELECOM = "telecom"
    TRANSIT = "transit"
    PAYMENTS = "payments"
    HEALTHCARE = "healthcare"


class DisruptionEvent(BaseModel):
    """
    Represents an atomic disruption or restoration event occurring at a specific tick.
    
    The `source_service_id` records which upstream parent node triggered this failure,
    enabling full reconstruction of the cascade dependency tree.
    """
    tick: int = Field(..., description="The simulation tick (0..max_ticks) when the event occurred.")
    node_id: str = Field(..., description="ID of the service affected.")
    event_type: str = Field(..., description="Event kind: 'manual_failure', 'cascade_failure', 'recovering', or 'recovered'.")
    source_service_id: Optional[str] = Field(
        None,
        description="The parent node that triggered this cascade failure. None if manual or root failure."
    )
    details: Optional[str] = Field(None, description="Human-readable context or explanation.")


class ServiceNode(BaseModel):
    """
    State of a single urban service node at any point in simulation time.
    """
    id: str = Field(..., description="Unique identifier (e.g., POWER_MAIN_PLANT).")
    name: str = Field(..., description="Human-readable name (e.g., 'Metropolitan Thermal Power Station').")
    category: ServiceCategory = Field(..., description="Sector category.")
    status: NodeStatus = Field(default=NodeStatus.UP, description="Current operational status.")
    recovery_duration: int = Field(default=3, description="Baseline ticks required to fully recover once failed.")
    remaining_recovery_ticks: int = Field(default=0, description="Ticks remaining until status flips to RECOVERED.")
    failed_at_tick: Optional[int] = Field(default=None, description="Tick at which this node experienced failure.")
    recovered_at_tick: Optional[int] = Field(default=None, description="Tick at which this node was restored.")
    source_service_id: Optional[str] = Field(default=None, description="Causal parent service that triggered this node's failure.")
    x: Optional[float] = Field(default=None, description="2D Canvas X coordinate for consistent HUD layout.")
    y: Optional[float] = Field(default=None, description="2D Canvas Y coordinate for consistent HUD layout.")
    importance: float = Field(default=1.0, description="Relative system criticality weight (1.0 - 5.0).")


class ServiceEdge(BaseModel):
    """
    Directed dependency edge from source to target.
    A -> B indicates that B depends on A (failure in A may propagate to B).
    """
    source: str = Field(..., description="Parent service ID whose failure can trigger downstream disruptions.")
    target: str = Field(..., description="Dependent service ID that requires the source to function.")
    propagation_probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Likelihood (0.0 to 1.0) that failure in source transmits to target in the next tick."
    )
    description: Optional[str] = Field(None, description="Functional description of why target depends on source.")


class SimulationState(BaseModel):
    """
    An immutable snapshot of the entire infrastructure network at a specific discrete tick `t`.
    """
    tick: int = Field(..., description="Current discrete time step (0..max_ticks).")
    nodes: Dict[str, ServiceNode] = Field(..., description="Map of node ID to its node snapshot.")
    edges: List[ServiceEdge] = Field(..., description="List of all directed dependency edges.")
    newly_failed: List[str] = Field(default_factory=list, description="IDs of nodes that failed exactly on this tick.")
    newly_recovered: List[str] = Field(default_factory=list, description="IDs of nodes that recovered exactly on this tick.")
    active_failures_count: int = Field(default=0, description="Total nodes currently in FAILED or RECOVERING status.")
    events: List[DisruptionEvent] = Field(default_factory=list, description="Events recorded during this tick.")


class SimulationConfig(BaseModel):
    """
    Configuration parameters used to execute a simulation run.
    """
    scenario_id: Optional[str] = Field(default="custom", description="Identifier of the scenario.")
    initial_failures: List[str] = Field(
        default_factory=list,
        description="List of node IDs subjected to manual disruption at tick 0."
    )
    seed: int = Field(default=42, description="Random seed guaranteeing byte-identical reproducibility.")
    max_ticks: int = Field(default=20, description="Maximum discrete ticks to simulate before terminating.")
    propagation_overrides: Optional[Dict[str, float]] = Field(
        default=None,
        description="Optional custom overrides for specific edge weights."
    )


class SimulationMetrics(BaseModel):
    """
    Post-run aggregated analytical metrics derived from the execution event log.
    """
    cascade_depth: int = Field(..., description="Longest causal chain of failure propagation (tree depth).")
    total_affected_services: int = Field(..., description="Total count of unique services that failed during the run.")
    affected_service_ids: List[str] = Field(default_factory=list, description="List of all affected service IDs.")
    recovery_time_ticks: int = Field(..., description="Number of ticks from first failure until system fully restored.")
    total_ticks_simulated: int = Field(..., description="Total ticks executed in this run.")
    resilience_score: float = Field(
        ...,
        description="System resilience score (0-100), where 100 = zero cascade impact and 0 = total collapse."
    )
    failure_timeline: List[int] = Field(default_factory=list, description="Count of active failures at each tick.")
    category_breakdown: Dict[str, int] = Field(
        default_factory=dict,
        description="Number of affected nodes grouped by service category."
    )


class SimulationResult(BaseModel):
    """
    Complete output bundle of a simulation run containing all tick snapshots and metrics.
    """
    run_id: str = Field(..., description="Unique identifier for the simulation execution.")
    config: SimulationConfig = Field(..., description="The configuration used for this run.")
    states: List[SimulationState] = Field(..., description="Ordered list of immutable tick snapshots (t=0..T).")
    events: List[DisruptionEvent] = Field(..., description="Chronological log of all disruption and recovery events.")
    metrics: SimulationMetrics = Field(..., description="Computed analytical metrics.")

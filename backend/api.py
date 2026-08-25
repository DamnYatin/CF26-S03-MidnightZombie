"""
FastAPI REST & WebSocket API Layer for Urban Infrastructure Cascade Simulator.

Endpoints:
- GET  /health           : Health check probe.
- GET  /scenarios        : Catalog of preset crisis scenarios.
- GET  /graph            : Initial nodes, directed edges, and metadata.
- POST /simulate         : Executes batch simulation, returns full tick states & metrics.
- WS   /ws/{run_id}      : Real-time WebSocket streaming tick snapshots (every ~300ms).

All simulation logic delegates strictly to `cascade_engine.py` and `metrics.py`.
"""

import asyncio
import json
import random
import uuid
import sys
import os
from typing import Dict, List, Optional, Any

# Ensure current module directory is on sys.path for direct imports under uvicorn
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from graph_builder import build_urban_infrastructure_graph, get_all_service_nodes, get_all_service_edges
    from cascade_engine import run_simulation, step_simulation_generator
    from scenarios import list_scenarios, get_scenario, get_scenario_catalog
    from metrics import calculate_metrics
    from models import (
        SimulationResult,
        SimulationConfig,
        SimulationState,
        DisruptionEvent,
        ServiceNode,
        ServiceEdge,
    )
    from config import DEFAULT_MAX_TICKS, DEFAULT_SEED, DEFAULT_TICK_STREAM_DELAY_SECONDS
except ImportError:
    from backend.graph_builder import build_urban_infrastructure_graph, get_all_service_nodes, get_all_service_edges
    from backend.cascade_engine import run_simulation, step_simulation_generator
    from backend.scenarios import list_scenarios, get_scenario, get_scenario_catalog
    from backend.metrics import calculate_metrics
    from backend.models import (
        SimulationResult,
        SimulationConfig,
        SimulationState,
        DisruptionEvent,
        ServiceNode,
        ServiceEdge,
    )
    from backend.config import DEFAULT_MAX_TICKS, DEFAULT_SEED, DEFAULT_TICK_STREAM_DELAY_SECONDS

app = FastAPI(
    title="Urban Infrastructure Cascade Simulator API",
    description="Real-time graph-based cascade failure and recovery simulation engine.",
    version="1.0.0",
)

# Enable CORS for seamless local Vite development (port 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulateRequest(BaseModel):
    """Payload schema for POST /simulate."""
    scenario_id: Optional[str] = Field(default="power_grid_collapse", description="Preset scenario ID")
    initial_failures: Optional[List[str]] = Field(default=None, description="Optional custom initial failure nodes")
    seed: Optional[int] = Field(default=DEFAULT_SEED, description="Deterministic random seed")
    max_ticks: Optional[int] = Field(default=DEFAULT_MAX_TICKS, description="Max ticks to run")


@app.get("/health", tags=["Health"])
def health_check() -> Dict[str, str]:
    """Health check endpoint confirming API service operational state."""
    return {"status": "ok", "service": "urban-cascade-simulator-api"}


@app.get("/scenarios", tags=["Scenarios"])
def get_scenarios() -> List[Dict[str, Any]]:
    """Returns the list of preset crisis scenario templates."""
    return get_scenario_catalog()


@app.get("/graph", tags=["Graph"])
def get_graph_definition() -> Dict[str, Any]:
    """
    Returns initial topology, nodes, categories, and directed dependency edges
    for the urban infrastructure network.
    """
    graph = build_urban_infrastructure_graph()
    nodes = get_all_service_nodes(graph)
    edges = get_all_service_edges(graph)
    return {
        "nodes": [n.model_dump() for n in nodes.values()],
        "edges": [e.model_dump() for e in edges],
        "total_nodes": len(nodes),
        "total_edges": len(edges),
    }


@app.post("/simulate", response_model=SimulationResult, tags=["Simulation"])
def simulate_batch(request: SimulateRequest) -> SimulationResult:
    """
    Executes a complete batch simulation run and returns all tick states and metrics.
    """
    graph = build_urban_infrastructure_graph()

    # Determine initial failure set
    if request.initial_failures is not None and len(request.initial_failures) > 0:
        initial_failures = request.initial_failures
        scenario_id = request.scenario_id or "custom"
    else:
        sc = get_scenario(request.scenario_id or "power_grid_collapse")
        if sc:
            initial_failures = sc.initial_failures
            scenario_id = sc.id
        else:
            initial_failures = ["POWER_MAIN_PLANT"]
            scenario_id = "custom"

    seed = request.seed if request.seed is not None else DEFAULT_SEED
    max_ticks = request.max_ticks if request.max_ticks is not None else DEFAULT_MAX_TICKS

    result = run_simulation(
        graph=graph,
        initial_failures=initial_failures,
        seed=seed,
        max_ticks=max_ticks,
        scenario_id=scenario_id,
    )
    return result


@app.websocket("/ws/{run_id}")
async def websocket_simulation_stream(
    websocket: WebSocket,
    run_id: str,
    scenario: Optional[str] = Query(default=None),
    seed: Optional[int] = Query(default=None),
    ticks: Optional[int] = Query(default=None),
    delay: Optional[float] = Query(default=DEFAULT_TICK_STREAM_DELAY_SECONDS),
):
    """
    WebSocket endpoint streaming tick-by-tick `SimulationState` frames.
    
    Protocol:
    1. Client connects to `/ws/{run_id}?scenario=...&seed=42&ticks=15` or sends a JSON start message.
    2. Server streams one `SimulationState` per discrete tick with configurable pacing (~300ms).
    3. Server sends final summary event containing calculated `SimulationMetrics`.
    4. Server cleanly closes socket with code 1000.
    """
    await websocket.accept()

    try:
        # Determine simulation parameters from query params or initial handshake message
        scenario_id = scenario or "power_grid_collapse"
        active_seed = seed if seed is not None else DEFAULT_SEED
        active_ticks = ticks if ticks is not None else DEFAULT_MAX_TICKS
        active_delay = delay if delay is not None else DEFAULT_TICK_STREAM_DELAY_SECONDS
        initial_failures: List[str] = []

        sc = get_scenario(scenario_id)
        if sc:
            initial_failures = sc.initial_failures
        else:
            initial_failures = ["POWER_MAIN_PLANT"]

        graph = build_urban_infrastructure_graph()
        rng = random.Random(active_seed)

        states_history: List[SimulationState] = []
        events_history: List[DisruptionEvent] = []

        # Send initial START banner
        await websocket.send_json({
            "type": "STREAM_START",
            "run_id": run_id,
            "scenario_id": scenario_id,
            "seed": active_seed,
            "max_ticks": active_ticks,
        })

        # Tick-by-tick generator loop
        for state in step_simulation_generator(
            graph=graph,
            initial_failures=initial_failures,
            rng=rng,
            max_ticks=active_ticks,
        ):
            states_history.append(state)
            events_history.extend(state.events)

            # Transmit current tick snapshot to frontend
            await websocket.send_json({
                "type": "TICK_UPDATE",
                "state": state.model_dump(),
            })

            # Pacing delay so frontend animation can play smoothly
            await asyncio.sleep(active_delay)

        # Compute final analytical metrics
        metrics = calculate_metrics(
            states=states_history,
            events=events_history,
            graph=graph,
        )

        # Transmit final completion payload
        await websocket.send_json({
            "type": "STREAM_COMPLETE",
            "run_id": run_id,
            "metrics": metrics.model_dump(),
            "total_states": len(states_history),
        })

    except WebSocketDisconnect:
        # Normal client disconnect
        pass
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "STREAM_ERROR",
                "message": str(e),
            })
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass

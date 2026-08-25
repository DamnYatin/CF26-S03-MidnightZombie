"""
Simulation Configuration and Domain Parameters.

This module defines standard operational parameters, category-specific recovery
timelines, default probability weights, and aesthetic metadata for the Urban
Infrastructure Cascade Simulator. Centralizing these values ensures consistent
behavior across CLI runs, unit tests, and the FastAPI/WebSocket streaming services.
"""

from typing import Dict, Any

# ============================================================================
# CATEGORY DEFINITIONS AND RECOVERY TIMELINES
# ============================================================================
# Urban infrastructure services take varying amounts of time (ticks) to restore
# after a failure occurs. For example, major power generation plants require
# extended inspection and cold-start procedures (4 ticks), whereas digital payment
# gateways fail over quickly to secondary cloud instances (2 ticks).
DEFAULT_RECOVERY_DURATIONS: Dict[str, int] = {
    "power": 4,        # High latency: thermal plants, transformer rebuilds, substation switching
    "water": 3,        # Medium latency: pressure restoration, filter backwash, pump priming
    "telecom": 2,      # Fast recovery: automatic packet rerouting, microwave backup links
    "transit": 3,      # Medium latency: physical train switching, signal resets, track clearance
    "payments": 2,     # Fast recovery: database failover, UPI payment switch fallback
    "healthcare": 4,   # High latency: generator transitions, life-support stabilization
}

# ============================================================================
# SIMULATION ENGINE DEFAULTS
# ============================================================================
DEFAULT_MAX_TICKS: int = 20
DEFAULT_SEED: int = 42
DEFAULT_TICK_STREAM_DELAY_SECONDS: float = 0.35  # Pacing for WebSocket tick animation

# ============================================================================
# CATEGORY VISUAL METADATA (Aligns with Stitch HUD Design Tokens)
# ============================================================================
CATEGORY_METADATA: Dict[str, Dict[str, Any]] = {
    "power": {
        "label": "Energy & Power Grid",
        "color": "#f59e0b",      # Amber / Electric Gold
        "bg_color": "rgba(245, 158, 11, 0.15)",
        "icon": "Zap",
        "description": "Primary electricity generation, high-voltage transmission, and substations."
    },
    "water": {
        "label": "Water & Sanitation",
        "color": "#06b6d4",      # Cyan / Water
        "bg_color": "rgba(6, 182, 212, 0.15)",
        "icon": "Droplets",
        "description": "Water filtration plants, distribution pumps, and reservoir management."
    },
    "telecom": {
        "label": "Telecom & Data",
        "color": "#8b5cf6",      # Purple / Telecommunication
        "bg_color": "rgba(139, 92, 246, 0.15)",
        "icon": "Radio",
        "description": "Cellular towers, metro fiber backbones, and central data centers."
    },
    "transit": {
        "label": "Transit & Mobility",
        "color": "#3b82f6",      # Blue / Transit
        "bg_color": "rgba(59, 130, 246, 0.15)",
        "icon": "Train",
        "description": "Metro rail signaling, subway traction power, and smart traffic grids."
    },
    "payments": {
        "label": "Financial & UPI Switch",
        "color": "#10b981",      # Emerald / Fintech
        "bg_color": "rgba(16, 185, 129, 0.15)",
        "icon": "CreditCard",
        "description": "Real-time UPI payment switches, ATM networks, and core banking gateways."
    },
    "healthcare": {
        "label": "Emergency & Healthcare",
        "color": "#ec4899",      # Rose / Healthcare
        "bg_color": "rgba(236, 72, 153, 0.15)",
        "icon": "Activity",
        "description": "Trauma hospitals, ICU ventilation grids, and 911 dispatch networks."
    }
}

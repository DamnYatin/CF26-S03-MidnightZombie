"""
Scenario Definitions and Crisis Presets.

This module defines hard-coded scenario templates for the Urban Infrastructure Cascade
Simulator. These presets allow operators to trigger reproducible single-node and
multi-node failure cascades from both the CLI and web interface without manual parameter entry.
"""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class ScenarioDefinition(BaseModel):
    """Metadata and initial condition configuration for a simulation scenario."""
    id: str = Field(..., description="Unique slug for the scenario.")
    title: str = Field(..., description="Human-friendly scenario title.")
    summary: str = Field(..., description="Short one-line description.")
    narrative: str = Field(..., description="Detailed briefing narrative explaining the crisis context.")
    category_focus: str = Field(..., description="Primary sector under initial stress.")
    initial_failures: List[str] = Field(..., description="Node IDs disrupted at tick 0.")
    severity: str = Field(default="HIGH", description="Severity level: LOW, MEDIUM, HIGH, CRITICAL.")
    recommended_ticks: int = Field(default=15, description="Recommended tick limit to observe full cascade & recovery.")
    recommended_seed: int = Field(default=42, description="Recommended seed demonstrating characteristic cascade.")


SCENARIO_REGISTRY: Dict[str, ScenarioDefinition] = {
    "power_grid_collapse": ScenarioDefinition(
        id="power_grid_collapse",
        title="Central Grid Blackout",
        summary="Catastrophic thermal plant failure triggering broad cascading outages.",
        narrative=(
            "A catastrophic transformer explosion at the Central Thermal Power Station knocks out "
            "the city's primary high-voltage feed. Without generation, Northern and Southern substations "
            "trip, threatening the water treatment plant, cloud data centers, train signaling, and "
            "hospital emergency generators."
        ),
        category_focus="power",
        initial_failures=["POWER_MAIN_PLANT"],
        severity="CRITICAL",
        recommended_ticks=18,
        recommended_seed=42,
    ),
    "transit_blackout_combo": ScenarioDefinition(
        id="transit_blackout_combo",
        title="Dual Sector Mobility & Industrial Collapse",
        summary="Simultaneous failure of South Substation and Metro Automated Signaling.",
        narrative=(
            "A coordinated cyber-physical disruption disables the South Industrial Substation while "
            "a software race condition simultaneously crashes the Central Rail Signaling Hub. "
            "Trains halt immediately, water booster pumps lose power, and optical fiber repeaters go dark."
        ),
        category_focus="transit",
        initial_failures=["POWER_SUB_SOUTH", "TRAIN_SIGNAL_CENTRAL"],
        severity="HIGH",
        recommended_ticks=16,
        recommended_seed=101,
    ),
    "telecom_fiber_sever": ScenarioDefinition(
        id="telecom_fiber_sever",
        title="Telecom Core & Fiber Sever",
        summary="Underground optical ring cut coupled with 5G cellular cluster failure.",
        narrative=(
            "Construction excavation severs the municipal underground optical fiber ring while a storm "
            "disrupts the Northern 5G cellular cluster. The metro data center loses connection, causing "
            "the national UPI payment switch to drop transactions, knocking out intelligent traffic lights, "
            "and crippling 911 dispatch communication."
        ),
        category_focus="telecom",
        initial_failures=["FIBER_BACKBONE", "CELL_TOWER_NORTH"],
        severity="HIGH",
        recommended_ticks=14,
        recommended_seed=77,
    ),
    "water_pump_surge": ScenarioDefinition(
        id="water_pump_surge",
        title="Aqueduct Pressure Contamination",
        summary="Central water treatment plant shut down following biological contaminant surge.",
        narrative=(
            "Turbidity sensors detect an acute contaminant surge at the Metropolitan Water Treatment "
            "Facility, triggering an automated emergency shutoff. Pressurized supply to northern booster "
            "pumps collapses, leading to secondary cooling failures at metropolitan data centers and "
            "sanitation crisis across regional trauma hospitals."
        ),
        category_focus="water",
        initial_failures=["WATER_TREATMENT_MAIN"],
        severity="MEDIUM",
        recommended_ticks=14,
        recommended_seed=88,
    ),
}


def get_scenario(scenario_id: str) -> Optional[ScenarioDefinition]:
    """
    Retrieves a scenario definition by ID.

    Args:
        scenario_id (str): The identifier key (e.g., 'power_grid_collapse').

    Returns:
        Optional[ScenarioDefinition]: The scenario model, or None if not found.
    """
    return SCENARIO_REGISTRY.get(scenario_id)


def list_scenarios() -> List[ScenarioDefinition]:
    """
    Returns a list of all available preset scenario definitions.
    """
    return list(SCENARIO_REGISTRY.values())


def get_scenario_catalog() -> List[Dict[str, Any]]:
    """
    Returns serializable dictionaries for all scenarios, suitable for API JSON responses.
    """
    return [sc.model_dump() for sc in SCENARIO_REGISTRY.values()]

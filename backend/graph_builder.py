"""
Urban Infrastructure Graph Builder using NetworkX.

This module constructs the directed dependency graph representing interdependent
urban services across Power, Water, Telecom, Transit, Financial Payments (UPI),
and Healthcare sectors.

Edge Semantics:
    Directed edge (u, v) signifies that service `v` depends on service `u`.
    Therefore, if `u` fails, disruption may propagate downstream to `v` with
    a probability defined on the edge attribute `propagation_probability`.
"""

import sys
import os
from typing import Dict, List, Tuple, Any
import networkx as nx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from models import ServiceCategory, ServiceNode, ServiceEdge, NodeStatus
    from config import DEFAULT_RECOVERY_DURATIONS
except ImportError:
    from backend.models import ServiceCategory, ServiceNode, ServiceEdge, NodeStatus
    from backend.config import DEFAULT_RECOVERY_DURATIONS


def build_urban_infrastructure_graph() -> nx.DiGraph:
    """
    Constructs and returns the master directed graph (nx.DiGraph) for the urban
    infrastructure network.

    The graph contains 16 interconnected nodes across 6 sectors with calibrated
    propagation probabilities reflecting real-world physical and digital dependencies.

    Returns:
        nx.DiGraph: Directed dependency graph populated with node attributes and
                   weighted directed edges.
    """
    G = nx.DiGraph()

    # =========================================================================
    # 1. NODES DEFINITION (16 Urban Services across 6 Categories)
    # =========================================================================
    # Nodes are positioned on a normalized 2D coordinate grid (x: 0..1000, y: 0..700)
    # for consistent, polished visualization across frontend Canvas/SVG graphs.
    nodes_data = [
        # --- POWER SECTOR ---
        {
            "id": "POWER_MAIN_PLANT",
            "name": "Central Thermal Power Station",
            "category": ServiceCategory.POWER,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["power"],
            "x": 180.0,
            "y": 140.0,
            "importance": 5.0,
        },
        {
            "id": "POWER_SUB_NORTH",
            "name": "North Grid Substation 110kV",
            "category": ServiceCategory.POWER,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["power"],
            "x": 420.0,
            "y": 110.0,
            "importance": 4.0,
        },
        {
            "id": "POWER_SUB_SOUTH",
            "name": "South Industrial Substation",
            "category": ServiceCategory.POWER,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["power"],
            "x": 380.0,
            "y": 260.0,
            "importance": 4.0,
        },

        # --- WATER SECTOR ---
        {
            "id": "WATER_TREATMENT_MAIN",
            "name": "Metropolitan Water Treatment Facility",
            "category": ServiceCategory.WATER,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["water"],
            "x": 200.0,
            "y": 420.0,
            "importance": 4.5,
        },
        {
            "id": "WATER_PUMP_NORTH",
            "name": "Northern Reservoir & Booster Pump",
            "category": ServiceCategory.WATER,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["water"],
            "x": 450.0,
            "y": 430.0,
            "importance": 3.5,
        },
        {
            "id": "WATER_DISTRIB_METRO",
            "name": "Downtown Potable Water Distribution",
            "category": ServiceCategory.WATER,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["water"],
            "x": 700.0,
            "y": 440.0,
            "importance": 3.5,
        },

        # --- TELECOM & DATA SECTOR ---
        {
            "id": "DATA_CENTER_METRO",
            "name": "Metropolitan Cloud & Telco Data Center",
            "category": ServiceCategory.TELECOM,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["telecom"],
            "x": 600.0,
            "y": 160.0,
            "importance": 4.5,
        },
        {
            "id": "FIBER_BACKBONE",
            "name": "Underground Optical Fiber Ring",
            "category": ServiceCategory.TELECOM,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["telecom"],
            "x": 420.0,
            "y": 340.0,
            "importance": 4.0,
        },
        {
            "id": "CELL_TOWER_NORTH",
            "name": "5G Macro Cellular Cluster North",
            "category": ServiceCategory.TELECOM,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["telecom"],
            "x": 680.0,
            "y": 280.0,
            "importance": 3.0,
        },

        # --- TRANSIT & MOBILITY SECTOR ---
        {
            "id": "TRAIN_SIGNAL_CENTRAL",
            "name": "Metro Rail Automated Signaling Center",
            "category": ServiceCategory.TRANSIT,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["transit"],
            "x": 720.0,
            "y": 120.0,
            "importance": 4.0,
        },
        {
            "id": "METRO_SUBWAY_SYS",
            "name": "Urban Rapid Transit Line 1 & 2",
            "category": ServiceCategory.TRANSIT,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["transit"],
            "x": 900.0,
            "y": 190.0,
            "importance": 4.5,
        },
        {
            "id": "TRAFFIC_LIGHT_GRID",
            "name": "Smart City Intelligent Traffic Lights",
            "category": ServiceCategory.TRANSIT,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["transit"],
            "x": 880.0,
            "y": 320.0,
            "importance": 3.0,
        },

        # --- FINANCIAL & PAYMENTS SECTOR ---
        {
            "id": "UPI_SWITCH_CENTRAL",
            "name": "National UPI / Instant Payment Switch",
            "category": ServiceCategory.PAYMENTS,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["payments"],
            "x": 820.0,
            "y": 480.0,
            "importance": 4.0,
        },
        {
            "id": "BANKING_GATEWAY_METRO",
            "name": "Commercial Core Banking Gateway",
            "category": ServiceCategory.PAYMENTS,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["payments"],
            "x": 940.0,
            "y": 550.0,
            "importance": 3.5,
        },

        # --- EMERGENCY & HEALTHCARE SECTOR ---
        {
            "id": "REGIONAL_HOSPITAL_ICU",
            "name": "Metropolitan Central Trauma & ICU Hospital",
            "category": ServiceCategory.HEALTHCARE,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["healthcare"],
            "x": 640.0,
            "y": 590.0,
            "importance": 5.0,
        },
        {
            "id": "EMERGENCY_DISPATCH_911",
            "name": "Central Emergency 911 / EMS Command Hub",
            "category": ServiceCategory.HEALTHCARE,
            "recovery_duration": DEFAULT_RECOVERY_DURATIONS["healthcare"],
            "x": 400.0,
            "y": 570.0,
            "importance": 4.5,
        },
    ]

    for nd in nodes_data:
        G.add_node(
            nd["id"],
            name=nd["name"],
            category=nd["category"].value,
            status=NodeStatus.UP.value,
            recovery_duration=nd["recovery_duration"],
            remaining_recovery_ticks=0,
            failed_at_tick=None,
            recovered_at_tick=None,
            source_service_id=None,
            x=nd["x"],
            y=nd["y"],
            importance=nd["importance"],
        )

    # =========================================================================
    # 2. DIRECTED EDGES DEFINITION (Physical & Cyber Dependencies)
    # =========================================================================
    # Directed edge (A, B) with weight/probability P means:
    # "If A fails, B has probability P of failing on the subsequent tick."
    edges_data: List[Tuple[str, str, float, str]] = [
        # Power Generation -> Substations
        ("POWER_MAIN_PLANT", "POWER_SUB_NORTH", 0.90, "High-voltage transmission line feed to North Substation"),
        ("POWER_MAIN_PLANT", "POWER_SUB_SOUTH", 0.85, "High-voltage transmission line feed to South Substation"),
        ("POWER_MAIN_PLANT", "WATER_TREATMENT_MAIN", 0.80, "Dedicated 33kV direct feed for high-volume water aeration"),

        # Power Substations -> Downstream Critical Infrastructure
        ("POWER_SUB_NORTH", "DATA_CENTER_METRO", 0.75, "Primary utility grid feed for Data Center server chillers"),
        ("POWER_SUB_NORTH", "TRAIN_SIGNAL_CENTRAL", 0.80, "Traction substation power for rail interlocking controllers"),
        ("POWER_SUB_NORTH", "CELL_TOWER_NORTH", 0.70, "Grid connection to cellular radio base transceivers"),
        ("POWER_SUB_SOUTH", "WATER_PUMP_NORTH", 0.75, "Heavy electrical supply to pressure booster pump turbines"),
        ("POWER_SUB_SOUTH", "FIBER_BACKBONE", 0.60, "Line-powered optical repeater and amplifier nodes"),
        ("POWER_SUB_SOUTH", "REGIONAL_HOSPITAL_ICU", 0.70, "Hospital primary grid feed (auxiliary generator transition risk)"),

        # Water Dependencies
        ("WATER_TREATMENT_MAIN", "WATER_PUMP_NORTH", 0.85, "Primary raw water output for distribution pumping"),
        ("WATER_PUMP_NORTH", "WATER_DISTRIB_METRO", 0.90, "Pressurized municipal water supply for metropolitan grid"),
        ("WATER_PUMP_NORTH", "DATA_CENTER_METRO", 0.65, "Cooling tower water supply required to prevent thermal throttling"),
        ("WATER_DISTRIB_METRO", "REGIONAL_HOSPITAL_ICU", 0.75, "Sterilization, dialysis, and sanitation water supply"),

        # Telecom & Network Dependencies
        ("DATA_CENTER_METRO", "UPI_SWITCH_CENTRAL", 0.85, "Cloud infrastructure hosting the national UPI transaction engine"),
        ("DATA_CENTER_METRO", "BANKING_GATEWAY_METRO", 0.80, "Interbank settlement processing and ledger synchronizer"),
        ("DATA_CENTER_METRO", "TRAIN_SIGNAL_CENTRAL", 0.65, "Cloud telemetry and automated schedule dispatch server"),
        ("FIBER_BACKBONE", "DATA_CENTER_METRO", 0.85, "High-speed optical link for multi-site data ingestion"),
        ("FIBER_BACKBONE", "CELL_TOWER_NORTH", 0.75, "Cellular tower backhaul connectivity to telecom core"),
        ("FIBER_BACKBONE", "EMERGENCY_DISPATCH_911", 0.80, "VoIP and CAD (Computer Aided Dispatch) emergency trunk line"),
        ("CELL_TOWER_NORTH", "TRAFFIC_LIGHT_GRID", 0.60, "Wireless cellular backhaul for dynamic traffic camera synchronization"),
        ("CELL_TOWER_NORTH", "EMERGENCY_DISPATCH_911", 0.70, "Mobile caller geolocation and first-responder radio uplink"),

        # Transit Dependencies
        ("TRAIN_SIGNAL_CENTRAL", "METRO_SUBWAY_SYS", 0.95, "Automatic Train Control (ATC) safety interlocking signaling"),
        ("TRAFFIC_LIGHT_GRID", "METRO_SUBWAY_SYS", 0.40, "Intermodal street-level transfer connection coordination"),
        ("TRAFFIC_LIGHT_GRID", "EMERGENCY_DISPATCH_911", 0.50, "Emergency vehicle preemption routing corridor"),

        # Financial Dependencies
        ("UPI_SWITCH_CENTRAL", "BANKING_GATEWAY_METRO", 0.75, "Instant payment routing to member bank core settlement accounts"),

        # Cross-Sector Interdependencies (Feedback Loops)
        ("EMERGENCY_DISPATCH_911", "REGIONAL_HOSPITAL_ICU", 0.65, "Paramedic routing and trauma triage coordination"),
    ]

    for src, dst, prob, desc in edges_data:
        G.add_edge(src, dst, propagation_probability=prob, description=desc)

    return G


def get_all_service_nodes(graph: nx.DiGraph) -> Dict[str, ServiceNode]:
    """
    Extracts all nodes from a NetworkX graph as a dictionary of `ServiceNode` models.

    Args:
        graph (nx.DiGraph): The infrastructure dependency graph.

    Returns:
        Dict[str, ServiceNode]: Map from node ID to its typed `ServiceNode` instance.
    """
    nodes_dict: Dict[str, ServiceNode] = {}
    for node_id, attrs in graph.nodes(data=True):
        nodes_dict[node_id] = ServiceNode(
            id=node_id,
            name=attrs.get("name", node_id),
            category=ServiceCategory(attrs.get("category", "power")),
            status=NodeStatus(attrs.get("status", "up")),
            recovery_duration=attrs.get("recovery_duration", 3),
            remaining_recovery_ticks=attrs.get("remaining_recovery_ticks", 0),
            failed_at_tick=attrs.get("failed_at_tick"),
            recovered_at_tick=attrs.get("recovered_at_tick"),
            source_service_id=attrs.get("source_service_id"),
            x=attrs.get("x"),
            y=attrs.get("y"),
            importance=attrs.get("importance", 1.0),
        )
    return nodes_dict


def get_all_service_edges(graph: nx.DiGraph) -> List[ServiceEdge]:
    """
    Extracts all directed dependency edges from a NetworkX graph as a list of `ServiceEdge` models.

    Args:
        graph (nx.DiGraph): The infrastructure dependency graph.

    Returns:
        List[ServiceEdge]: List of typed directed edges with propagation probabilities.
    """
    edges_list: List[ServiceEdge] = []
    for u, v, attrs in graph.edges(data=True):
        edges_list.append(
            ServiceEdge(
                source=u,
                target=v,
                propagation_probability=attrs.get("propagation_probability", 0.5),
                description=attrs.get("description", ""),
            )
        )
    return edges_list

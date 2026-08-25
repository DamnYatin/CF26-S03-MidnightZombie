"""
Offline Fallback Visualization Module.

This module provides static and ASCII graph rendering capabilities using Matplotlib
and NetworkX as a standalone offline fallback when the web frontend is not in use.
"""

import sys
import os
from typing import Optional, List, Dict
import networkx as nx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure Matplotlib for headless backend execution
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

try:
    from models import SimulationState, NodeStatus, ServiceCategory
    from config import CATEGORY_METADATA
except ImportError:
    from backend.models import SimulationState, NodeStatus, ServiceCategory
    from backend.config import CATEGORY_METADATA


def render_ascii_graph_summary(state: SimulationState) -> str:
    """
    Renders a quick ASCII table summarizing node statuses and active cascades.

    Args:
        state (SimulationState): The tick snapshot to format.

    Returns:
        str: Formatted ASCII text block.
    """
    lines = [
        f"==================================================================",
        f"  TICK {state.tick:02d} | ACTIVE FAILURES: {state.active_failures_count:02d} | NEWLY FAILED: {len(state.newly_failed)}",
        f"==================================================================",
        f"  {'SERVICE ID':<24} | {'CATEGORY':<12} | {'STATUS':<10} | {'RECOVERY'}",
        f"------------------------------------------------------------------"
    ]

    status_symbols = {
        NodeStatus.UP: "[  UP  ]",
        NodeStatus.FAILED: "[ FAIL ]",
        NodeStatus.RECOVERING: "[ RECV ]",
        NodeStatus.RECOVERED: "[ REST ]",
    }

    for nid, node in sorted(state.nodes.items(), key=lambda x: (x[1].category.value, x[0])):
        sym = status_symbols.get(node.status, "[  ??  ]")
        rem = f"{node.remaining_recovery_ticks} ticks" if node.status in (NodeStatus.FAILED, NodeStatus.RECOVERING) else "-"
        lines.append(f"  {nid:<24} | {node.category.value:<12} | {sym:<10} | {rem}")

    lines.append("==================================================================")
    return "\n".join(lines)


def plot_graph_snapshot(
    graph: nx.DiGraph,
    state: Optional[SimulationState] = None,
    output_filepath: str = "cascade_snapshot.png",
    title: str = "Urban Infrastructure Dependency Graph",
) -> str:
    """
    Generates a 2D network diagram visualization of the infrastructure network
    and saves it to disk as an image.

    Args:
        graph (nx.DiGraph): The network graph.
        state (Optional[SimulationState]): Snapshot used to color nodes. If None, uses baseline colors.
        output_filepath (str): Destination path for the saved PNG.
        title (str): Plot header title.

    Returns:
        str: Path to the generated image file.
    """
    plt.figure(figsize=(14, 9), facecolor="#0b0f17")
    ax = plt.gca()
    ax.set_facecolor("#0b0f17")

    # Extract or compute layout positions
    pos = {}
    for n, data in graph.nodes(data=True):
        x = data.get("x", 500)
        # Flip Y for standard Cartesian Matplotlib plotting
        y = 700 - data.get("y", 350)
        pos[n] = (x, y)

    # Determine node colors based on status
    node_colors = []
    for n in graph.nodes:
        if state and n in state.nodes:
            status = state.nodes[n].status
            if status == NodeStatus.FAILED:
                node_colors.append("#ef4444")  # Red
            elif status == NodeStatus.RECOVERING:
                node_colors.append("#f59e0b")  # Yellow / Amber
            elif status == NodeStatus.RECOVERED:
                node_colors.append("#10b981")  # Green
            else:
                node_colors.append("#38bdf8")  # Sky Blue / Up
        else:
            cat = graph.nodes[n].get("category", "power")
            node_colors.append(CATEGORY_METADATA.get(cat, {}).get("color", "#38bdf8"))

    # Draw directed edges
    nx.draw_networkx_edges(
        graph,
        pos,
        ax=ax,
        edge_color="#334155",
        width=1.5,
        arrows=True,
        arrowsize=18,
        arrowstyle="-|>",
        connectionstyle="arc3,rad=0.08",
        min_source_margin=18,
        min_target_margin=18,
    )

    # Draw nodes
    nx.draw_networkx_nodes(
        graph,
        pos,
        ax=ax,
        node_color=node_colors,
        node_size=850,
        edgecolors="#ffffff",
        linewidths=1.2,
    )

    # Draw node labels
    labels = {n: n.replace("_", "\n") for n in graph.nodes}
    nx.draw_networkx_labels(
        graph,
        pos,
        labels=labels,
        ax=ax,
        font_size=7,
        font_family="sans-serif",
        font_color="#ffffff",
        font_weight="bold",
    )

    plt.title(title, color="#00d1c1", fontsize=15, fontweight="bold", pad=20)
    plt.axis("off")
    plt.tight_layout()

    os.makedirs(os.path.dirname(os.path.abspath(output_filepath)), exist_ok=True)
    plt.savefig(output_filepath, dpi=180, bbox_inches="tight", facecolor="#0b0f17")
    plt.close()

    return output_filepath

# 🏙️ Urban Infrastructure Cascade Simulator
### Smart Cities & Urban Infrastructure — Track S-03

> **An interactive, dynamic graph-based simulation engine and mission-control command center dashboard for modeling how disruptions propagate through interdependent municipal services over discrete time steps.**

---

## 📌 1. Problem Statement & Solution Overview

### Problem Statement (Track S-03)
Urban services are deeply interconnected. A localized disruption in a single physical or digital service (such as a power transformer blowout or a severed optical fiber link) does not remain isolated. Instead, it cascades unpredictably into dependent utilities—water pumps lose pressure, cloud data centers overheat, rail signaling halts, UPI payment gateways drop transactions, and emergency 911 dispatch networks fail.

Traditional emergency planning tools operate in isolated organizational silos, making it virtually impossible to detect second- and third-order systemic collapse before disaster strikes.

```
                   [TRADITIONAL SILOED MODEL]
         [Power Grid]    [Water Grid]    [Transit]    [Fintech]
             (No cross-sector visibility or cascade tracking)

                                vs.

            [OUR INTERDEPENDENT DYNAMIC GRAPH MODEL]
                      ┌───► Water Pumps
                      │
   Power Substation ──┼───► Data Center ──► UPI Payments Switch
                      │
                      └───► Train Signals ──► Subway Lines & 911 Dispatch
```

### Known Constraints Addressed
- ✅ **Dynamic Graph Modeling**: Directed graph representing 16 services across 6 municipal sectors.
- ✅ **Time-Dependent Discrete States**: Step-by-step tick simulation loop ($t = 0 \dots T$).
- ✅ **Failure & Recovery Actions**: Stochastic forward propagation + sector-specific countdown recovery.
- ✅ **Multi-Node Simultaneous Disruptions**: Coordinated multi-point crisis injection.
- ✅ **Quantitative Resiliency Metrics**: Cascade Depth, Blast Radius, Recovery Ticks, and Resilience Score ($0 - 100$).
- ✅ **Deterministic Reproducibility**: Isolated RNG seeds (`random.Random(seed)`) generating byte-identical runs.

---

## 🏛️ 2. System Architecture & Workflow

The system is built as a decoupled, zero-database architecture with dual execution interfaces (a **React Vite Command Center HUD** and an **Air-Gapped Headless CLI**):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                SYSTEM ARCHITECTURE WORKFLOW                            │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [USER INPUT / OPERATOR]
   │
   ├── Web HUD: Scenario Picker / RNG Seed / Custom Chaos
   └── CLI Menu: python run_demo.py / python backend/main.py
         │
         ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────┐
 │ FASTAPI BACKEND SERVER (Port 8000)                                                    │
 │                                                                                       │
 │   [REST Endpoints]                       [WebSocket Channel]                          │
 │   GET /graph | GET /scenarios            WS /ws/{run_id} (Streaming ~350ms/tick)      │
 │                                                   │                                   │
 │   ┌───────────────────────────────────────────────┴───────────────────────────────┐   │
 │   │ DISCRETE SIMULATION ENGINE (cascade_engine.py)                                │   │
 │   │   1. Apply Root Disruptions (Tick 0)                                          │   │
 │   │   2. Stochastic Propagation (NetworkX DiGraph Edge Probabilities)             │   │
 │   │   3. Decrement Sector Recovery Countdowns (config.py)                         │   │
 │   │   4. Yield Immutable State Snapshot S(t)                                      │   │
 │   └───────────────────────────────────────────────┬───────────────────────────────┘   │
 │                                                   │                                   │
 │   ┌───────────────────────────────────────────────┴───────────────────────────────┐   │
 │   │ RESILIENCE ANALYTICS ENGINE (metrics.py)                                      │   │
 │   │   - Causal Tree Lineage Backtracking (source_service_id)                      │   │
 │   │   - Cascade Depth, Recovery Duration, System Resilience Score (0-100)          │   │
 │   └───────────────────────────────────────────────────────────────────────────────┘   │
 └───────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼ (Real-time JSON Frames over WebSocket)
 ┌───────────────────────────────────────────────────────────────────────────────────────┐
 │ REACT 18 + TYPESCRIPT MISSION CONTROL HUD (Port 5173)                                 │
 │                                                                                       │
 │   [SVG Topology Canvas]           [Telemetry KPI Cards]       [Timeline Replay Bar]   │
 │   - Glowing shockwave rings       - Cascade Depth (3)         - Time travel scrubber  │
 │   - Countdown badge overlays      - Blast Radius (16/16)      - Speed: 0.5x - 4x      │
 │   - Upstream/Downstream drawer    - Resilience Score (19.6)   - Causal event feed     │
 └───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ 3. Core Technical Mechanism

### A. Graph Topology & Directed Dependencies
We model the city as a directed graph $\mathcal{G} = (\mathcal{V}, \mathcal{E})$ with **16 nodes across 6 sectors**:
1. **Power Grid**: `POWER_MAIN_PLANT`, `POWER_SUB_NORTH`, `POWER_SUB_SOUTH`
2. **Water & Sanitation**: `WATER_TREATMENT_MAIN`, `WATER_PUMP_NORTH`, `WATER_DISTRIB_METRO`
3. **Telecom & Data**: `DATA_CENTER_METRO`, `FIBER_BACKBONE`, `CELL_TOWER_NORTH`
4. **Transit & Mobility**: `TRAIN_SIGNAL_CENTRAL`, `METRO_SUBWAY_SYS`, `TRAFFIC_LIGHT_GRID`
5. **Financial (UPI)**: `UPI_SWITCH_CENTRAL`, `BANKING_GATEWAY_METRO`
6. **Healthcare & EMS**: `REGIONAL_HOSPITAL_ICU`, `EMERGENCY_DISPATCH_911`

Directed edge $(u \rightarrow v)$ with weight $P(u \rightarrow v) \in [0.0, 1.0]$ means **$v$ depends on $u$**. If $u$ fails, $v$ rolls against $P(u \rightarrow v)$ to determine if it collapses on the next tick.

---

### B. Discrete Tick Simulation Loop ($t = 0 \dots T$)
At each discrete time step $t$:
1. **Phase 1 (Manual / Scheduled Disruptions)**: Root disruptions are applied ($S_u \leftarrow \text{FAILED}$).
2. **Phase 2 (Cascade Execution)**: Nodes scheduled from $t-1$ fail, recording their causal parent:
   $$\text{source\_service\_id}(v) \leftarrow u$$
3. **Phase 3 (Recovery Lifecycle)**: Active failures decrement their remaining repair timers:
   $$\text{remaining}_v(t) = \max(0, \text{remaining}_v(t-1) - 1)$$
   When $\text{remaining}_v(t) = 0$, status flips to $\text{RECOVERED}$.
4. **Phase 4 (Stochastic Rolls)**: For every newly failed node $u$, iterate over operational downstream neighbors $v \in \text{Out}(u)$. Roll pseudo-random $R \sim \text{Uniform}(0, 1)$ via `rng.random()`. If $R < P(u \rightarrow v)$, queue $v$ to fail at $t+1$.
5. **Phase 5 (Immutable Snapshot)**: Deep-copy all nodes and edges into an immutable `SimulationState` model and yield to the WebSocket channel.

---

### C. Domain-Specific Recovery Latencies
Repair times mirror realistic operational recovery constraints:
* **Telecom & Payments (2 Ticks)**: Fast automated cloud replica failover and packet rerouting.
* **Water & Transit (3 Ticks)**: Line repressurization, filter backwash cycles, and rail track clearance.
* **Power & Healthcare (4 Ticks)**: Thermal plant cold-start procedures, transformer rebuilds, and ICU life-support stabilization.

---

### D. Mathematical Metrics Formulation

#### 1. Cascade Depth (Causal Tree Height)
Computed by recursively backtracking parent pointers ($\text{source\_service\_id}$) to find the longest causal path:
$$\text{Cascade Depth} = \max_{v \in \mathcal{V}_{\text{failed}}} \text{Depth}(v)$$

#### 2. Composite Resilience Score ($0.0 - 100.0$)
$$\text{Resilience Score} = 100 - \left( 0.50 \cdot \frac{|\mathcal{V}_{\text{affected}}|}{|\mathcal{V}_{\text{total}}|} + 0.25 \cdot \frac{\text{Depth}}{D_{\text{max}}} + 0.25 \cdot \frac{\text{Recovery Time}}{T_{\text{max}}} \right) \times 100$$
* **$100.0$**: Perfectly immune network (no dominoes).
* **$< 25.0$**: Critical systemic collapse across multiple sectors.

---

## 🛠️ 4. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Language** | **Python 3.11** | Core simulation engine and mathematical graph calculations |
| **Web Server** | **FastAPI + Uvicorn** | High-performance REST API and real-time WebSocket streaming |
| **Graph Modeling** | **NetworkX** | Directed graph construction, edge weight traversal, and adjacency lookup |
| **Data Validation** | **Pydantic v2** | Strict schema validation and auto-serialization to JSON models |
| **Testing Suite** | **Pytest** | Automated unit tests proving determinism and mathematical integrity |
| **Frontend Framework**| **React 18 + TypeScript**| Component-based single-page application with strict type safety |
| **UI Styling** | **Tailwind CSS** | Custom Google Stitch Kinetic Grid HUD design system |

---

## 💻 5. Setup & Installation Instructions

### Prerequisites
* **Python 3.10+** (Tested on Python 3.11)
* **Node.js 18+** & **npm**

---

### ⚡ Option A: One-Click Launchers (Easiest)

- **Windows (Double-click)**: Run [`start.bat`](start.bat)  
  *(Automatically checks environments, installs dependencies, launches backend & frontend in separate terminals, and opens `http://localhost:5173`).*
- **macOS / Linux**: Run [`./start.sh`](start.sh) in your terminal.
- **Interactive Terminal Menu**: Run `python run_demo.py`.

---

### 🛠️ Option B: Manual Step-by-Step Launch

#### 1. Backend Server
```bash
# From project root:
cd urban-cascade-simulator
pip install -r backend/requirements.txt
uvicorn backend.api:app --reload --port 8000
```
* API Health Probe: `http://localhost:8000/health`
* Interactive OpenAPI Docs: `http://localhost:8000/docs`
* WebSocket Stream: `ws://localhost:8000/ws/{run_id}`

#### 2. Frontend Dashboard
```bash
# In a second terminal:
cd urban-cascade-simulator/frontend
npm install
npm run dev
```
* Open `http://localhost:5173` in your browser.

---

## 🕹️ 6. Usage Instructions

### A. Web Command Center HUD (`http://localhost:5173`)
1. **Select Crisis Scenario**: Click any scenario card (e.g., **"Central Grid Blackout"**).
2. **Configure Parameters**: Set `RNG SEED` (default: `42`) and `MAX TICKS` (default: `18`).
3. **Stream Live**: Click **"STREAM LIVE"** to watch the real-time WebSocket cascade unfold.
4. **Inspect Causal Lineage**: Click on any disrupted node (e.g., `EMERGENCY_DISPATCH_911`) to open the telemetry drawer and view upstream triggers.
5. **Timeline Scrubbing**: Drag the scrub bar to rewind time to $T_0, T_1, T_2$ or hit **Replay (2x)**.
6. **Custom Chaos**: Toggle **"Custom Mode"** to select arbitrary simultaneous multi-node failures.

---

### B. Interactive Terminal Menu (`run_demo.py`)
Run `python run_demo.py` in your terminal for an interactive numbered menu:
```text
============================================================================
  [CITY] URBAN INFRASTRUCTURE CASCADE SIMULATOR -- QUICK DEMO RUNNER
============================================================================
  Select an action below:
    [1] Run Offline Simulation Demo (Central Grid Blackout, Seed 42)
    [2] Run Automated Pytest Reproducibility Suite (5/5 Tests)
    [3] View All Built-in Crisis Scenarios
    [4] Start FastAPI Backend Server (Port 8000)
    [5] Exit
============================================================================
```

---

### C. Headless CLI Runner (`main.py`)
Run simulations completely offline without a browser:
```bash
# Run Central Grid Blackout with Seed 42 for 15 ticks
python backend/main.py --scenario power_grid_collapse --seed 42 --ticks 15

# Export a static Matplotlib plot to cascade_run_42.png
python backend/main.py --scenario power_grid_collapse --seed 42 --visualize

# List all scenario presets
python backend/main.py --list-scenarios
```

---

## 🧪 7. Validation, Experiments & Results

### A. Automated Pytest Verification Suite
Run the test suite with:
```bash
python -m pytest backend/tests/test_reproducibility.py -v
```

```text
============================= test session starts =============================
platform win32 -- Python 3.11.0, pytest-9.1.1
collected 5 items

backend/tests/test_reproducibility.py::test_byte_identical_reproducibility PASSED [ 20%]
backend/tests/test_reproducibility.py::test_seed_divergence                 PASSED [ 40%]
backend/tests/test_reproducibility.py::test_multi_node_initial_failures     PASSED [ 60%]
backend/tests/test_reproducibility.py::test_causal_lineage_and_depth        PASSED [ 80%]
backend/tests/test_reproducibility.py::test_recovery_countdown_lifecycle    PASSED [100%]

============================== 5 passed in 0.56s ==============================
```

---

### B. Experimental Results Across Scenarios

| Scenario | Seed | Root Disruption | Cascade Depth | Affected Nodes | Recovery Time | Resilience Score | Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Central Grid Blackout** | `42` | `POWER_MAIN_PLANT` | **3** | **16 / 16 (100%)** | **7 ticks** | **19.6 / 100** | Full systemic collapse |
| **Dual Mobility Collapse** | `42` | `POWER_SUB_SOUTH`, `TRAIN_SIGNAL` | **3** | **10 / 16 (62%)** | **6 ticks** | **40.0 / 100** | Water & Transit hit |
| **Aqueduct Contamination**| `42` | `WATER_TREATMENT_MAIN` | **3** | **7 / 16 (44%)** | **7 ticks** | **47.7 / 100** | Water & Healthcare hit |
| **Solo Leaf Disruption** | `42` | `BANKING_GATEWAY_METRO`| **0** | **1 / 16 (6%)** | **2 ticks** | **93.5 / 100** | Completely isolated |
| **Solo Healthcare Node** | `42` | `EMERGENCY_DISPATCH_911`| **1** | **2 / 16 (12%)** | **5 ticks** | **79.2 / 100** | Localized to hospital |

---

## 🔮 8. Limitations & Future Scope

### Current Limitations
1. **Synthetic Calibrated Probabilities**: Edge weights ($P(u \rightarrow v)$) are currently calibrated domain heuristics rather than live physical sensor feeds.
2. **Homogeneous Ticks**: All simulation ticks are uniform discrete steps rather than real-time continuous differential equations.
3. **In-Memory Volatility**: Simulation snapshots exist in memory; no persistent SQL database is used (by design for zero-latency hackathon execution).

### Future Scope & Roadmap
1. **Live SCADA / IoT Telemetry Ingestion**: Ingest real-time power grid Phasor Measurement Units (PMUs) and water pressure sensors to dynamic-tune edge weights.
2. **AI-Driven Preventive Dispatch**: Integrate Reinforcement Learning agents to automatically recommend optimal generator dispatch and emergency valve shutoffs to halt cascades.
3. **Multi-City Geographical GIS Mapping**: Expand from normalized 2D SVG canvas to real Mapbox/Deck.gl GIS spatial coordinate overlays.
4. **WebGL / Canvas Scalability**: Transition from SVG to PixiJS / Three.js to scale from 16 nodes to 50,000+ urban telemetry assets.

---

## 👥 Team Members & Contributions

| Name | Role | Responsibilities |
| :--- | :--- | :--- |
| **Arya Rathore** | **Team Leader** | Project Leadership, Architecture Planning & Presentation PPT |
| **Suhani Nankani** | **Frontend & Pitch Lead** | Pitch Delivery, UI/UX Implementation & Frontend Integration |
| **Atharv Dubey** | **Backend & Technical Writer** | Backend Engine, Technical Explanation & Presentation PPT |
| **Yatin Mishra** | **Tech Lead & Demo Specialist** | Core Technical Implementation, Testing Suite & Live Demonstration |

---

<div align="center">
  <b>Urban Infrastructure Cascade Simulator — Smart Cities Hackathon</b><br>
  <i>Built with FastAPI, NetworkX, Pydantic, React, Vite, and Tailwind CSS</i>
</div>

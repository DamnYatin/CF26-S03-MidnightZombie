# 🏙️ Urban Infrastructure Cascade Simulator
### 🚀 Smart Cities & Urban Infrastructure — Track S-03

<div align="center">

[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Pytest](https://img.shields.io/badge/Pytest-5%20PASSED-brightgreen?style=for-the-badge&logo=pytest&logoColor=white)](https://pytest.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br />

**A dynamic directed-graph simulation engine and tactical mission-control HUD for modeling how disruptions cascade through interdependent municipal utilities over discrete time steps.**

[Explore Live Demo](#-quickstart-guide) • [Architecture](#-system-architecture) • [Mathematical Model](#-mathematical-formulation) • [Pytest Suite](#-automated-testing--validation) • [Team](#-team-members--contributions)

<br />

```
  ========================================================================================
   POWER FAILURE  ──►  WATER PUMPS  ──►  DATA CENTERS  ──►  UPI SWITCH  ──►  911 DISPATCH
  ========================================================================================
```

</div>

---

## 📑 Table of Contents
- [Executive Summary](#-executive-summary)
- [Problem Statement & Constraints](#-problem-statement--constraints)
- [System Architecture](#-system-architecture)
- [Core Mathematical Mechanism](#-core-mathematical-mechanism)
- [Technology Stack](#-technology-stack)
- [Quickstart Guide](#-quickstart-guide)
- [Usage Modes](#-usage-modes)
- [Automated Testing & Validation](#-automated-testing--validation)
- [Experimental Results](#-experimental-results)
- [Limitations & Future Roadmap](#-limitations--future-roadmap)
- [Team Members & Roles](#-team-members--contributions)

---

## 💡 Executive Summary

Modern urban centers are marvels of interconnected engineering. However, hyper-connectivity introduces dangerous hidden fragilities: **interdependent cascading failure**.

When an electrical substation trips, the consequences are rarely confined to a simple blackout:
* **Water Treatment Plants** lose pump pressure within minutes.
* **Cloud Data Centers** overheat as chiller towers lose water.
* **Metro Rail Systems** halt due to automated signaling interlocking failure.
* **National UPI & Payment Switches** drop transactions as servers desynchronize.
* **Emergency 911 Dispatch Hubs** lose caller routing and traffic camera synchronization.

The **Urban Infrastructure Cascade Simulator** provides disaster response coordinators, municipal planners, and critical infrastructure engineers with a **real-time digital twin** to model, visualize, and stress-test these cascading vulnerabilities before crisis strikes.

---

## 🎯 Problem Statement & Constraints

> **Track S-03: Smart Cities & Urban Infrastructure**
> 
> *"Urban services are interconnected. A failure in one digital or operational service can propagate into other services, creating cascading failures that are difficult to detect using isolated monitoring systems. Develop an Urban Infrastructure Cascade Simulator that represents interdependent urban services as a dynamic graph and simulates how disruptions propagate through the system."*

### 📋 Constraints & Capabilities Matrix

| Constraint / Requirement | Implementation in Our System | Status |
| :--- | :--- | :---: |
| **Dynamic Graph Representation** | 16 nodes across 6 sectors in a directed $\text{NetworkX}$ `DiGraph` with weighted propagation edges | `SUPPORTED` |
| **Time-Dependent Discrete States** | Discrete tick loop ($t = 0 \dots T$) yielding immutable state snapshots $S(t)$ | `SUPPORTED` |
| **Failure & Recovery Actions** | Stochastic Bernoulli rolls for cascade propagation + sector-specific countdown recovery timers | `SUPPORTED` |
| **Multi-Node Simultaneous Disruptions** | Multi-point root disruptions at Tick 0 and custom chaos injection | `SUPPORTED` |
| **Quantitative Resilience Metrics** | Real-time calculation of Cascade Depth, Blast Radius, Recovery Ticks, and Resilience Score | `SUPPORTED` |
| **Deterministic Reproducibility** | Isolated PRNG instances (`random.Random(seed)`) guaranteeing byte-identical event logs | `SUPPORTED` |

---

## 🏛️ System Architecture

The project features a decoupled, zero-database architecture designed for sub-millisecond local execution and air-gapped deployment:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              END-TO-END SYSTEM WORKFLOW                                │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [OPERATOR CONTROLS]
   │
   ├── Scenario Picker Matrix (4 Presets: Power, Transit, Telecom, Water)
   ├── Isolated RNG Seed Input (e.g., Seed 42) + Max Ticks Slider
   └── Custom Multi-Node Chaos Injector
         │
         ▼
 ┌───────────────────────────────────────────────────────────────────────────────────────┐
 │ FASTAPI BACKEND SERVER (Port 8000)                                                    │
 │                                                                                       │
 │   [REST Endpoints]                       [WebSocket Real-Time Stream]                 │
 │   GET  /graph                            WS  /ws/{run_id}                             │
 │   GET  /scenarios                        Pushes JSON frame every ~350ms               │
 │   POST /simulate                                 │                                    │
 │                                                  ▼                                    │
 │   ┌───────────────────────────────────────────────────────────────────────────────┐   │
 │   │ DISCRETE SIMULATION ENGINE (cascade_engine.py)                                │   │
 │   │   Phase 1: Apply Root Disruptions at t = 0                                    │   │
 │   │   Phase 2: Apply Scheduled Cascades from t-1                                  │   │
 │   │   Phase 3: Decrement Sector Recovery Counters & Restore Healthy Nodes         │   │
 │   │   Phase 4: Roll Stochastic Edge Probabilities: P(u -> v)                      │   │
 │   │   Phase 5: Emit Deep Immutable Snapshot S(t)                                  │   │
 │   └──────────────────────────────────────────────┬────────────────────────────────┘   │
 │                                                  │                                    │
 │   ┌──────────────────────────────────────────────┴────────────────────────────────┐   │
 │   │ RESILIENCE ANALYTICS ENGINE (metrics.py)                                      │   │
 │   │   - Causal Tree Lineage Backtracking (source_service_id)                      │   │
 │   │   - Maximum Cascade Depth, System Recovery Ticks, Resilience Score (0-100)     │   │
 │   └───────────────────────────────────────────────────────────────────────────────┘   │
 └───────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼ (Low-Latency WebSocket Streaming)
 ┌───────────────────────────────────────────────────────────────────────────────────────┐
 │ REACT 18 + TAILWIND MISSION CONTROL HUD (Port 5173)                                   │
 │                                                                                       │
 │   ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────┐   │
 │   │   SVG Graph Canvas      │  │    Telemetry Cards      │  │  Timeline Scrubber  │   │
 │   │ • Glowing shockwaves    │  │ • Cascade Depth: 3      │  │ • Frame time-travel │   │
 │   │ • Sector color coding   │  │ • Blast Radius: 16/16   │  │ • Speeds: 0.5x - 4x │   │
 │   │ • Recovery badges (2t)  │  │ • Resilience: 19.6/100  │  │ • Causal event logs │   │
 │   └─────────────────────────┘  └─────────────────────────┘  └─────────────────────┘   │
 └───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 Core Mathematical Mechanism

### 1. The Directed Dependency Graph ($\mathcal{G}$)
We model the city as $\mathcal{G} = (\mathcal{V}, \mathcal{E})$, where:
* $\mathcal{V}$ contains **16 urban services across 6 sectors** (Power, Water, Telecom, Transit, UPI, Healthcare).
* $\mathcal{E}$ contains **directed dependency links** $(u \rightarrow v)$, meaning *service $v$ depends on service $u$*.
* Each edge carries a calibrated failure probability $P(u \rightarrow v) \in [0.0, 1.0]$.

```
                                  [POWER_MAIN_PLANT]
                                     (Root Power)
                                    /            \
                       P = 0.90    /              \   P = 0.90
                                  ▼                ▼
                          [POWER_SUB_NORTH]   [POWER_SUB_SOUTH]
                             /        \             /        \
                   P = 0.80 /   P=0.75 \   P = 0.75/   P=0.70 \
                           ▼            ▼         ▼            ▼
                   [WATER_TREAT]  [DATA_CENTER] [PUMP_NORTH] [HOSPITAL_ICU]
```

### 2. Discrete-Time Propagation Loop ($t = 0 \dots T$)
For every node $u$ that fails on tick $t-1$:
$$\forall v \in \text{Out}(u) \quad \text{such that } \text{Status}(v) = \text{UP}:$$
$$\text{Roll } R \sim \text{Uniform}(0, 1) \quad \Longrightarrow \quad \text{If } R < P(u \rightarrow v), \quad v \text{ fails at tick } t \text{ with parent } u$$

### 3. Sector Recovery Durations
Each sector has realistic operational repair latencies configured in `backend/config.py`:

$$\text{Recovery Ticks} = \begin{cases} 
2 \text{ ticks} & \text{Telecom \& UPI Payments (cloud failover)} \\
3 \text{ ticks} & \text{Water \& Transit (line pressure \& track safety clearance)} \\
4 \text{ ticks} & \text{Power \& Healthcare (thermal boiler cold-start \& ICU triage)}
\end{cases}$$

### 4. Metrics Formulation

#### A. Cascade Depth (Causal Tree Height)
Using recursive parent-pointer traversal across `source_service_id`:
$$\text{Cascade Depth} = \max_{v \in \mathcal{V}_{\text{failed}}} \text{Depth}(v)$$

#### B. Composite Resilience Score ($0.0 - 100.0$)
$$\text{Score} = 100 - \left( 0.50 \cdot \frac{|\mathcal{V}_{\text{affected}}|}{|\mathcal{V}_{\text{total}}|} + 0.25 \cdot \frac{\text{Depth}}{4} + 0.25 \cdot \frac{\text{Recovery Time}}{15} \right) \times 100$$

---

## 💻 Technology Stack

```
   BACKEND INFRASTRUCTURE                 FRONTEND MISSION CONTROL
┌──────────────────────────────┐       ┌──────────────────────────────┐
│ • Python 3.11                │       │ • React 18 (Hooks & Context) │
│ • FastAPI (REST + WS)        │       │ • TypeScript 5.6             │
│ • NetworkX 3.3 (Graph Math)  │  ◄──► │ • Vite 5.4                   │
│ • Pydantic v2 (Validation)   │       │ • Tailwind CSS 3.4           │
│ • Pytest 8.2 (Testing)       │       │ • Recharts (Telemetry Curves)│
│ • Matplotlib (Offline CLI)   │       │ • Lucide React (HUD Icons)   │
└──────────────────────────────┘       └──────────────────────────────┘
```

---

## 🚀 Quickstart Guide

### Prerequisites
* **Python 3.10+** (Python 3.11 recommended)
* **Node.js 18+** & **npm**

---

### ⚡ Option 1: One-Click Startup

<details open>
<summary><b>Windows (One-Click)</b></summary>

Simply double-click [`start.bat`](start.bat) or run from CMD:
```bat
start.bat
```
*Automatically installs dependencies, launches the backend on port 8000, launches Vite on port 5173, and opens your browser.*
</details>

<details>
<summary><b>Linux / macOS (One-Click)</b></summary>

```bash
chmod +x start.sh
./start.sh
```
</details>

---

### 🛠️ Option 2: Manual Terminal Launch

#### Step 1: Start Backend API & WebSocket Server
```bash
cd urban-cascade-simulator
pip install -r backend/requirements.txt
uvicorn backend.api:app --reload --port 8000
```
* API Health Probe: `http://localhost:8000/health`
* Interactive Swagger Docs: `http://localhost:8000/docs`
* WebSocket Stream: `ws://localhost:8000/ws/{run_id}`

#### Step 2: Start React Frontend HUD
```bash
cd urban-cascade-simulator/frontend
npm install
npm run dev
```
* Open **`http://localhost:5173`** to access the Command Center.

---

## 🕹️ Usage Modes

### Mode 1: Mission Control Web HUD (`http://localhost:5173`)
1. **Choose a Scenario**: Select **Central Grid Blackout**, **Dual Sector Mobility Collapse**, **Fiber Sever**, or **Water Contamination**.
2. **Set Parameters**: Adjust the **RNG Seed** (e.g. `42`) or click **Reroll**.
3. **Stream Live**: Click **`STREAM LIVE`** to watch the real-time cascading shockwave.
4. **Time Travel Scrubbing**: Drag the scrub bar to rewind time to $T_0 \dots T_N$ and replay at $0.5\times - 4\times$ speed.
5. **Inspect Causal Lineage**: Click any node on the graph to open the telemetry drawer and view upstream triggers.

---

### Mode 2: Interactive Terminal Quick Demo (`run_demo.py`)
```bash
python run_demo.py
```
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

### Mode 3: Headless CLI Runner (`main.py`)
Run simulations in air-gapped environments without a browser:
```bash
# Run simulation and print ASCII event log
python backend/main.py --scenario power_grid_collapse --seed 42 --ticks 15

# Export static graph plot to cascade_run_42.png
python backend/main.py --scenario power_grid_collapse --seed 42 --visualize

# List all scenario presets
python backend/main.py --list-scenarios
```

---

## 🧪 Automated Testing & Validation

All stochastic simulation decisions are isolated inside dedicated `random.Random(seed)` instances. The test suite proves deterministic reproducibility and mathematical validity:

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

| Test Case | Verification Target |
| :--- | :--- |
| `test_byte_identical_reproducibility` | Two runs with `seed=42` produce 100% byte-identical event logs and metrics |
| `test_seed_divergence` | Different seeds (`42` vs `9999`) produce distinct stochastic cascade branches |
| `test_multi_node_initial_failures` | Verifies multi-point simultaneous root failures at Tick 0 |
| `test_causal_lineage_and_depth` | Verifies every cascading node has a valid parent link and computes correct tree depth |
| `test_recovery_countdown_lifecycle` | Verifies the complete state machine: $\text{UP} \rightarrow \text{FAILED} \rightarrow \text{RECOVERING} \rightarrow \text{RECOVERED}$ |

---

## 📊 Experimental Results

Experimental metrics across built-in scenarios and control runs:

| Scenario / Experiment | Seed | Root Disruption | Cascade Depth | Affected Nodes | Recovery Time | Resilience Score | System Outcome |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **Central Grid Blackout** | `42` | `POWER_MAIN_PLANT` | **3** | **16 / 16 (100%)** | **7 ticks** | **19.6 / 100** | Full systemic collapse |
| **Dual Mobility Collapse** | `42` | `POWER_SUB_SOUTH`, `TRAIN_SIGNAL` | **3** | **10 / 16 (62%)** | **6 ticks** | **40.0 / 100** | Transit, Water & 911 disrupted |
| **Aqueduct Contamination**| `42` | `WATER_TREATMENT_MAIN` | **3** | **7 / 16 (44%)** | **7 ticks** | **47.7 / 100** | Water, Payments & ICU disrupted |
| **Solo Leaf Node** | `42` | `BANKING_GATEWAY_METRO`| **0** | **1 / 16 (6%)** | **2 ticks** | **93.5 / 100** | Completely isolated failure |
| **Solo Healthcare Node** | `42` | `EMERGENCY_DISPATCH_911`| **1** | **2 / 16 (12%)** | **5 ticks** | **79.2 / 100** | Localized to hospital cluster |

---

## 🔮 Limitations & Future Roadmap

### Current Scope & Limitations
- **Calibrated Probabilities**: Edge failure probabilities $P(u \rightarrow v)$ are currently calibrated domain heuristics rather than live hardware telemetry feeds.
- **Discrete Uniform Time**: Ticks represent discrete operational phases rather than real-time continuous differential equations.
- **In-Memory Snapshots**: Designed for zero-latency in-memory execution without persistent SQL overhead.

### Future Roadmap
- 📡 **Live SCADA & IoT Sensor Ingestion**: Real-time integration with power grid Phasor Measurement Units (PMUs) and municipal hydraulic pressure transducers.
- 🤖 **Reinforcement Learning Preventive Dispatch**: An AI agent that recommends optimal generator reallocation and emergency valve closures in real time to halt cascades.
- 🗺️ **Geographical GIS Overlays**: Integration with Mapbox and Deck.gl for spatial 3D city mapping.
- ⚡ **Large-Scale WebGL Acceleration**: Migration from SVG to PixiJS/Three.js to support 50,000+ urban telemetry assets at 60 FPS.

---

## 👥 Team Members & Contributions

<div align="center">

| Member | Role | Key Contributions |
| :--- | :--- | :--- |
| **Arya Rathore** | **Team Leader** | Project Leadership, Architectural Planning, Slide Deck & Presentation |
| **Suhani Nankani** | **Frontend & Pitch Lead** | UI/UX Design System (Stitch HUD), Pitch Delivery & Component Integration |
| **Atharv Dubey** | **Backend & Technical Writer** | Discrete Tick Simulation Engine, Documentation & Presentation PPT |
| **Yatin Mishra** | **Tech Lead & Demo Specialist** | NetworkX Graph Engine, Pytest Automated Suite & Live Demonstration |

</div>

---

<div align="center">

**⭐ If you find this simulator useful for disaster management or smart city research, consider starring the repository!**

Made with ❤️ by the **Track S-03 Hackathon Team**

</div>

/**
 * Main Application Shell for Urban Infrastructure Cascade Simulator.
 *
 * Implements the Google Stitch Kinetic Grid HUD Command Center layout:
 * - Top telemetry bar with live pulse status and network statistics
 * - Scenario selector matrix and custom chaos injector
 * - Real-time directed graph visualizer
 * - Live KPI metrics and Recharts telemetry curves
 * - Granular timeline scrubber & event log feed
 */

import { useState, useEffect } from 'react';
import { GraphView } from './components/GraphView';
import { MetricsPanel } from './components/MetricsPanel';
import { ScenarioPicker } from './components/ScenarioPicker';
import { TickTimeline } from './components/TickTimeline';
import { useSimulationSocket } from './hooks/useSimulationSocket';
import { ServiceNode, ServiceEdge, ScenarioDefinition } from './types';
import { 
  Activity, 
  ShieldAlert, 
  Cpu, 
  AlertTriangle, 
  Layers,
  Sparkles
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export function App() {
  const [initialNodes, setInitialNodes] = useState<ServiceNode[]>([]);
  const [initialEdges, setInitialEdges] = useState<ServiceEdge[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('power_grid_collapse');
  const [seed, setSeed] = useState<number>(42);
  const [maxTicks, setMaxTicks] = useState<number>(18);
  const [customFailures, setCustomFailures] = useState<string[]>([]);
  const [showPitchGuide, setShowPitchGuide] = useState<boolean>(false);

  // Hook managing WebSocket streaming and REST batch fallback
  const {
    isRunning,
    currentTickIndex,
    currentTickState,
    allStates,
    events,
    metrics,
    error,
    connectionStatus,
    startSimulation,
    selectTick,
  } = useSimulationSocket();

  // Load initial graph topology and scenario catalog on startup
  useEffect(() => {
    async function loadData() {
      try {
        const [graphRes, scenariosRes] = await Promise.all([
          fetch(`${API_BASE_URL}/graph`),
          fetch(`${API_BASE_URL}/scenarios`),
        ]);

        if (graphRes.ok) {
          const graphData = await graphRes.json();
          setInitialNodes(graphData.nodes || []);
          setInitialEdges(graphData.edges || []);
        }

        if (scenariosRes.ok) {
          const scenariosData = await scenariosRes.json();
          setScenarios(scenariosData || []);
        }
      } catch (err) {
        console.warn('Could not connect to API backend. Ensure FastAPI server is running.', err);
      }
    }
    loadData();
  }, []);

  const handleToggleCustomFailure = (nodeId: string) => {
    setCustomFailures((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleRunSimulation = (isLiveStream: boolean) => {
    startSimulation({
      scenario_id: selectedScenarioId,
      initial_failures: customFailures,
      seed,
      max_ticks: maxTicks,
      isLiveStream,
    });
  };

  // Allow clicking on graph node to manually inject failure
  const handleManualNodeFailure = (nodeId: string) => {
    if (!customFailures.includes(nodeId)) {
      setCustomFailures((prev) => [...prev, nodeId]);
    }
    startSimulation({
      scenario_id: 'custom_manual',
      initial_failures: [nodeId],
      seed,
      max_ticks: maxTicks,
      isLiveStream: true,
    });
  };

  const activeFailuresCount = currentTickState?.active_failures_count ?? 0;
  const totalNodesCount = initialNodes.length || 16;
  const healthyNodesCount = totalNodesCount - activeFailuresCount;

  return (
    <div className="min-h-screen bg-hud-bg bg-grid-hud text-hud-text flex flex-col selection:bg-hud-primary selection:text-black">
      {/* Top HUD Command Center Header Bar */}
      <header className="sticky top-0 z-30 bg-hud-bg-deep/90 backdrop-blur-md border-b border-hud-border px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-hud-primary/10 border border-hud-primary/40 text-hud-primary shadow-hud-glow">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono font-bold text-sm sm:text-base tracking-wider text-hud-bright uppercase">
                  Urban Infrastructure Cascade Simulator
                </h1>
                <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-hud-primary/20 text-hud-primary border border-hud-primary/30">
                  STITCH HUD V1.0
                </span>
              </div>
              <p className="text-[11px] text-hud-muted font-mono hidden sm:block">
                Interdependent Dynamic Graph Failure & Discrete-Time Recovery Engine
              </p>
            </div>
          </div>

          {/* Real-time System Status Telemetry Badges */}
          <div className="flex items-center gap-3 text-xs font-mono">
            {/* Live Pulse Indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-hud-border">
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-hud-primary animate-pulse'}`} />
              <span className="text-hud-bright">
                {isRunning ? 'SIMULATION RUNNING' : 'SYSTEM READY'}
              </span>
            </div>

            {/* Health / Failure Ratio Pip */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-hud-border">
              <span className="text-hud-muted">Nodes:</span>
              <span className="text-emerald-400 font-bold">{healthyNodesCount} Healthy</span>
              <span className="text-hud-muted">/</span>
              <span className={activeFailuresCount > 0 ? 'text-red-400 font-bold' : 'text-slate-500'}>
                {activeFailuresCount} Disrupted
              </span>
            </div>

            {/* Connection Status */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-hud-border text-hud-muted">
              <span>Socket:</span>
              <span className={connectionStatus === 'connected' ? 'text-hud-primary' : 'text-slate-400'}>
                {connectionStatus.toUpperCase()}
              </span>
            </div>

            {/* Presentation Helper Toggle */}
            <button
              onClick={() => setShowPitchGuide(!showPitchGuide)}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 border ${
                showPitchGuide
                  ? 'bg-hud-primary text-black border-hud-primary shadow-hud-glow'
                  : 'bg-slate-800 hover:bg-slate-700 text-hud-primary border-hud-primary/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showPitchGuide ? 'Close Pitch Guide' : 'Judge Pitch Guide'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Command Center Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* Interactive Pitch Guide Banner */}
        {showPitchGuide && (
          <div className="p-4 rounded-lg bg-slate-900/95 border-2 border-hud-primary text-hud-bright shadow-hud-glow animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-hud-primary" />
                <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-hud-primary">
                  Interactive Pitch Walkthrough (3-Minute Judge Demo Guide)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-hud-muted">Follow these 5 steps in order:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-hud-primary font-bold">STEP 1</span>
                <h4 className="font-bold text-hud-bright mt-0.5">Pick Scenario</h4>
                <p className="text-[11px] text-hud-muted mt-1 leading-tight">
                  Click <strong>Central Grid Blackout</strong> below (Seed: 42).
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-hud-primary font-bold">STEP 2</span>
                <h4 className="font-bold text-hud-bright mt-0.5">Stream Live</h4>
                <p className="text-[11px] text-hud-muted mt-1 leading-tight">
                  Click <strong>Stream Live</strong> to show real-time WebSocket cascading.
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-hud-primary font-bold">STEP 3</span>
                <h4 className="font-bold text-hud-bright mt-0.5">Inspect Lineage</h4>
                <p className="text-[11px] text-hud-muted mt-1 leading-tight">
                  Click <strong>911 Dispatch</strong> on graph to show causal parent trigger.
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-hud-primary font-bold">STEP 4</span>
                <h4 className="font-bold text-hud-bright mt-0.5">Explain Metrics</h4>
                <p className="text-[11px] text-hud-muted mt-1 leading-tight">
                  Highlight <strong>Cascade Depth (3)</strong> and <strong>Resilience Score</strong>.
                </p>
              </div>

              <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-hud-primary font-bold">STEP 5</span>
                <h4 className="font-bold text-hud-bright mt-0.5">Scrub & Replay</h4>
                <p className="text-[11px] text-hud-muted mt-1 leading-tight">
                  Drag the slider to rewind time and hit <strong>Replay (2x)</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-lg bg-red-950/80 border border-red-500 text-red-200 text-xs font-mono flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <span className="text-[10px] text-red-400">Ensure backend server is running on http://localhost:8000</span>
          </div>
        )}

        {/* Section 1: Scenario Picker & Control HUD */}
        <section>
          <ScenarioPicker
            scenarios={scenarios}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={setSelectedScenarioId}
            seed={seed}
            onSeedChange={setSeed}
            maxTicks={maxTicks}
            onMaxTicksChange={setMaxTicks}
            availableNodes={initialNodes}
            customFailures={customFailures}
            onToggleCustomFailure={handleToggleCustomFailure}
            onRunSimulation={handleRunSimulation}
            isRunning={isRunning}
          />
        </section>

        {/* Section 2: Live Dependency Graph Visualization */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-hud-primary" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-hud-bright">
                Network Interdependence Topology (Directed DiGraph)
              </h2>
            </div>
            <span className="text-xs font-mono text-hud-muted">
              Click node to inspect dependencies or force disruption
            </span>
          </div>

          <GraphView
            state={currentTickState}
            initialNodes={initialNodes}
            initialEdges={initialEdges}
            onManualFail={handleManualNodeFailure}
          />
        </section>

        {/* Section 3: Live Metrics & Recharts Telemetry */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-hud-primary" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-hud-bright">
              Cascade Telemetry & Analytical Metrics
            </h2>
          </div>

          <MetricsPanel
            metrics={metrics}
            currentState={currentTickState}
            allStates={allStates}
          />
        </section>

        {/* Section 4: Timeline Scrubber & Event Stream */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-hud-primary" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-hud-bright">
              Timeline Replay Controller & Causal Logs
            </h2>
          </div>

          <TickTimeline
            allStates={allStates}
            currentTickIndex={currentTickIndex}
            onSelectTick={selectTick}
            events={events}
            isLiveStreaming={isRunning}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-hud-border/70 py-4 px-4 text-center text-xs font-mono text-hud-muted bg-hud-bg-deep">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Urban Infrastructure Cascade Simulator — Hackathon Edition</span>
          <span>FastAPI + WebSocket + NetworkX + React / Vite / Tailwind</span>
        </div>
      </footer>
    </div>
  );
}

export default App;

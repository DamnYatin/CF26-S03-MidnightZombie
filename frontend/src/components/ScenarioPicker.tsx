/**
 * Scenario Picker and Crisis Simulation Configurator Component.
 *
 * Provides high-tech HUD cards for selecting built-in crisis scenarios or configuring
 * custom multi-node failures, seeds, and tick limits.
 */

import React, { useState } from 'react';
import { ScenarioDefinition, ServiceNode } from '../types';
import { 
  Zap, 
  Radio, 
  Train, 
  Droplets, 
  Dices, 
  Play, 
  RadioTower, 
  Sliders, 
  AlertTriangle,
  Flame,
  Check
} from 'lucide-react';

interface ScenarioPickerProps {
  scenarios: ScenarioDefinition[];
  selectedScenarioId: string;
  onSelectScenario: (scenarioId: string) => void;
  seed: number;
  onSeedChange: (seed: number) => void;
  maxTicks: number;
  onMaxTicksChange: (ticks: number) => void;
  availableNodes: ServiceNode[];
  customFailures: string[];
  onToggleCustomFailure: (nodeId: string) => void;
  onRunSimulation: (isLiveStream: boolean) => void;
  isRunning: boolean;
}

const SCENARIO_ICONS: Record<string, any> = {
  power_grid_collapse: Zap,
  transit_blackout_combo: Train,
  telecom_fiber_sever: Radio,
  water_pump_surge: Droplets,
};

const SEVERITY_BADGES: Record<string, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40',
  HIGH: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  MEDIUM: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
};

export const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  seed,
  onSeedChange,
  maxTicks,
  onMaxTicksChange,
  availableNodes,
  customFailures,
  onToggleCustomFailure,
  onRunSimulation,
  isRunning,
}) => {
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const rollRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 9000) + 1000;
    onSeedChange(randomSeed);
  };

  return (
    <div className="space-y-4">
      {/* Simulation Engine Global Controls Bar */}
      <div className="hud-card p-4 rounded-lg border border-hud-border flex flex-wrap items-center justify-between gap-4">
        {/* Seed Input Control */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase font-semibold text-hud-text">
              RNG Seed:
            </span>
            <input
              type="number"
              value={seed}
              onChange={(e) => onSeedChange(parseInt(e.target.value) || 0)}
              className="w-24 px-2.5 py-1.5 rounded bg-slate-900 border border-hud-border focus:border-hud-primary text-hud-bright font-mono text-xs focus:outline-none focus:ring-1 focus:ring-hud-primary"
            />
          </div>
          <button
            onClick={rollRandomSeed}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-hud-primary border border-hud-border transition flex items-center gap-1 text-xs font-mono"
            title="Roll Random Deterministic Seed"
          >
            <Dices className="w-4 h-4" />
            <span className="hidden sm:inline">Reroll</span>
          </button>
        </div>

        {/* Max Ticks Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase font-semibold text-hud-text">
            Max Ticks: <strong className="text-hud-primary">{maxTicks}</strong>
          </span>
          <input
            type="range"
            min="6"
            max="30"
            step="1"
            value={maxTicks}
            onChange={(e) => onMaxTicksChange(parseInt(e.target.value))}
            className="w-28 sm:w-36 accent-hud-primary cursor-pointer"
          />
        </div>

        {/* Mode Toggle & Trigger Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCustomMode(!isCustomMode)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border transition flex items-center gap-1.5 ${
              isCustomMode
                ? 'bg-purple-950/80 border-purple-500 text-purple-300 shadow-hud-glow'
                : 'bg-slate-800/80 border-hud-border text-hud-text hover:text-hud-bright'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            {isCustomMode ? 'Custom Chaos Active' : 'Custom Mode'}
          </button>

          {/* Action: Run Live WebSocket Stream */}
          <button
            disabled={isRunning}
            onClick={() => onRunSimulation(true)}
            className={`px-4 py-1.5 rounded text-xs font-mono font-bold tracking-wider uppercase border transition flex items-center gap-1.5 ${
              isRunning
                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                : 'bg-hud-primary/20 hover:bg-hud-primary/30 border-hud-primary text-hud-primary shadow-hud-glow active:scale-95'
            }`}
          >
            <RadioTower className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'animate-pulse'}`} />
            {isRunning ? 'Streaming...' : 'Stream Live'}
          </button>

          {/* Action: Fast Batch Run (POST /simulate) */}
          <button
            disabled={isRunning}
            onClick={() => onRunSimulation(false)}
            className="px-3.5 py-1.5 rounded text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 border border-hud-border hover:border-slate-500 text-hud-bright transition flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 text-hud-cyan" />
            Batch Run
          </button>
        </div>
      </div>

      {/* Preset Scenario Cards Matrix */}
      {!isCustomMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {scenarios.map((sc) => {
            const isSelected = selectedScenarioId === sc.id;
            const IconComp = SCENARIO_ICONS[sc.id] || Flame;
            const severityClass = SEVERITY_BADGES[sc.severity] || SEVERITY_BADGES.HIGH;

            return (
              <div
                key={sc.id}
                onClick={() => {
                  onSelectScenario(sc.id);
                  if (sc.recommended_seed) onSeedChange(sc.recommended_seed);
                  if (sc.recommended_ticks) onMaxTicksChange(sc.recommended_ticks);
                }}
                className={`hud-card p-4 rounded-lg border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'border-hud-primary bg-hud-surface/90 shadow-hud-glow scale-[1.01]'
                    : 'border-hud-border hover:border-hud-border-light hover:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded ${isSelected ? 'bg-hud-primary/20 text-hud-primary' : 'bg-slate-800 text-slate-400'}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono uppercase text-hud-muted">
                        Sector: {sc.category_focus}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${severityClass}`}>
                      {sc.severity}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-hud-bright mb-1">{sc.title}</h3>
                  <p className="text-xs text-hud-muted line-clamp-2 leading-relaxed mb-3">
                    {sc.summary}
                  </p>
                </div>

                <div className="pt-2 border-t border-hud-border/70 flex items-center justify-between text-[11px] font-mono text-hud-muted">
                  <span>Root: <strong className="text-red-400">{sc.initial_failures.length} node(s)</strong></span>
                  <span className="text-hud-primary">{isSelected ? 'ACTIVE' : 'Select'}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Custom Chaos Multi-Node Selector */
        <div className="hud-card p-4 rounded-lg border border-purple-500/40 bg-purple-950/20 animate-fadeIn">
          <div className="flex items-center justify-between mb-3 border-b border-purple-500/30 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-mono font-bold uppercase text-purple-300 tracking-wider">
                Custom Chaos Injector — Select Simultaneous Initial Failures (Tick 0)
              </h4>
            </div>
            <span className="text-xs font-mono text-purple-300">
              Selected: <strong className="text-hud-primary">{customFailures.length}</strong> / 16 nodes
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {availableNodes.map((node) => {
              const isSelected = customFailures.includes(node.id);
              return (
                <button
                  key={node.id}
                  onClick={() => onToggleCustomFailure(node.id)}
                  className={`p-2 rounded text-left font-mono text-[11px] border transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-red-500/20 border-red-500 text-red-300 shadow-hud-glow-red'
                      : 'bg-slate-900/80 border-hud-border text-hud-muted hover:border-slate-600 hover:text-hud-bright'
                  }`}
                >
                  <span className="truncate pr-1">{node.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

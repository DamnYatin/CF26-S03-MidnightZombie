/**
 * Analytical Metrics & Telemetry Panel Component.
 *
 * Visualizes post-run and streaming simulation analytics:
 * - Cascade Depth KPI Card (Longest causal parent chain)
 * - Unique Affected Services KPI Card (Fraction & percentage of urban network)
 * - Total System Recovery Time KPI Card (Ticks to full restoration)
 * - System Resilience Score Card (0-100 composite index)
 * - Active Failure Timeline (Recharts Area Chart)
 * - Sector Impact Breakdown (Recharts Bar Chart)
 */

import React from 'react';
import { SimulationMetrics, SimulationState } from '../types';
import { 
  GitFork, 
  AlertOctagon, 
  Clock, 
  ShieldCheck, 
  TrendingUp, 
  Layers 
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

interface MetricsPanelProps {
  metrics: SimulationMetrics | null;
  currentState: SimulationState | null;
  allStates: SimulationState[];
}

const CATEGORY_COLORS: Record<string, string> = {
  power: '#f59e0b',
  water: '#06b6d4',
  telecom: '#8b5cf6',
  transit: '#3b82f6',
  payments: '#10b981',
  healthcare: '#ec4899',
};

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  currentState,
  allStates,
}) => {
  // Derive live timeline data from accumulated states
  const timelineData = (allStates || []).map((s) => ({
    tick: `T${s.tick}`,
    activeFailures: s.active_failures_count,
    newFailures: s.newly_failed?.length || 0,
    newRecoveries: s.newly_recovered?.length || 0,
  }));

  // Sector breakdown chart data
  const sectorData = Object.entries(metrics?.category_breakdown || {}).map(
    ([category, count]) => ({
      category: category.toUpperCase(),
      count,
      color: CATEGORY_COLORS[category] || '#00d1c1',
    })
  );

  return (
    <div className="space-y-4">
      {/* 4 Telemetry KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Cascade Depth */}
        <div className="hud-card p-3.5 rounded-lg border border-hud-border hover:border-hud-primary/40 transition">
          <div className="flex items-center justify-between text-hud-muted mb-1.5">
            <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-hud-text">
              Cascade Depth
            </span>
            <GitFork className="w-4 h-4 text-hud-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-hud-bright">
              {metrics ? metrics.cascade_depth : currentState ? '...' : 0}
            </span>
            <span className="text-xs text-hud-muted font-mono">levels</span>
          </div>
          <p className="text-[11px] text-hud-muted mt-1 truncate">
            Longest causal trigger chain
          </p>
        </div>

        {/* Metric 2: Total Affected Services */}
        <div className="hud-card p-3.5 rounded-lg border border-hud-border hover:border-red-500/40 transition">
          <div className="flex items-center justify-between text-hud-muted mb-1.5">
            <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-hud-text">
              Affected Services
            </span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-red-400">
              {metrics ? metrics.total_affected_services : currentState?.active_failures_count ?? 0}
            </span>
            <span className="text-xs text-hud-muted font-mono">/ 16 nodes</span>
          </div>
          <p className="text-[11px] text-hud-muted mt-1 truncate">
            {metrics
              ? `${((metrics.total_affected_services / 16) * 100).toFixed(0)}% network impact`
              : 'Disrupted infrastructure'}
          </p>
        </div>

        {/* Metric 3: System Recovery Time */}
        <div className="hud-card p-3.5 rounded-lg border border-hud-border hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-hud-muted mb-1.5">
            <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-hud-text">
              System Recovery
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-amber-400">
              {metrics ? `${metrics.recovery_time_ticks}` : currentState ? `${currentState.tick}` : '0'}
            </span>
            <span className="text-xs text-hud-muted font-mono">ticks</span>
          </div>
          <p className="text-[11px] text-hud-muted mt-1 truncate">
            Time to full grid restoration
          </p>
        </div>

        {/* Metric 4: Resilience Score */}
        <div className="hud-card p-3.5 rounded-lg border border-hud-border hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between text-hud-muted mb-1.5">
            <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-hud-text">
              Resilience Score
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-emerald-400">
              {metrics ? `${metrics.resilience_score.toFixed(1)}` : '100.0'}
            </span>
            <span className="text-xs text-hud-muted font-mono">/ 100</span>
          </div>
          <p className="text-[11px] text-hud-muted mt-1 truncate">
            Network robustness index
          </p>
        </div>
      </div>

      {/* 2 Recharts Telemetry Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Active Failures Over Time Curve */}
        <div className="hud-card p-4 rounded-lg border border-hud-border">
          <div className="flex items-center justify-between mb-3 border-b border-hud-border pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-hud-primary" />
              <h4 className="text-xs font-mono font-bold uppercase text-hud-bright tracking-wider">
                Active Failure & Recovery Curve
              </h4>
            </div>
            <span className="text-[10px] font-mono text-hud-muted">T0 .. T{allStates.length > 0 ? allStates.length - 1 : 0}</span>
          </div>

          <div className="h-44 w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="failureGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="tick" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono',
                    }}
                    itemStyle={{ color: '#ef4444' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="activeFailures"
                    name="Active Failures"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#failureGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-hud-muted">
                Run a simulation to generate failure curve telemetry.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Sector Breakdown Bar Chart */}
        <div className="hud-card p-4 rounded-lg border border-hud-border">
          <div className="flex items-center justify-between mb-3 border-b border-hud-border pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-mono font-bold uppercase text-hud-bright tracking-wider">
                Impact by Infrastructure Sector
              </h4>
            </div>
            <span className="text-[10px] font-mono text-hud-muted">Unique Nodes</span>
          </div>

          <div className="h-44 w-full">
            {sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <Bar dataKey="count" name="Disrupted Nodes" radius={[4, 4, 0, 0]}>
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-hud-muted">
                No sector disruptions recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

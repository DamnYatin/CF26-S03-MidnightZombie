/**
 * Live Urban Infrastructure Dependency Graph View Component.
 *
 * Renders the 2D directed dependency network with real-time recoloring:
 * - UP: Grey/Slate/Cyan baseline
 * - FAILED: High-saturation glowing Red with animated shockwave pulse
 * - RECOVERING: Amber/Yellow with remaining tick countdown badge
 * - RECOVERED: Vibrant Emerald Green
 *
 * Includes directional edge arrows, active cascade propagation particle effects,
 * and interactive node telemetry inspection drawer.
 */

import React, { useState, useMemo } from 'react';
import { ServiceNode, ServiceEdge, SimulationState, NodeStatus } from '../types';
import { 
  Zap, 
  Droplets, 
  Radio, 
  Train, 
  CreditCard, 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw 
} from 'lucide-react';

interface GraphViewProps {
  state: SimulationState | null;
  initialNodes: ServiceNode[];
  initialEdges: ServiceEdge[];
  onManualFail?: (nodeId: string) => void;
}

const CATEGORY_STYLES = {
  power: { color: '#f59e0b', stroke: '#d97706', label: 'Power Grid', icon: Zap },
  water: { color: '#06b6d4', stroke: '#0891b2', label: 'Water & Sanitation', icon: Droplets },
  telecom: { color: '#8b5cf6', stroke: '#7c3aed', label: 'Telecom & Core', icon: Radio },
  transit: { color: '#3b82f6', stroke: '#2563eb', label: 'Transit & Rail', icon: Train },
  payments: { color: '#10b981', stroke: '#059669', label: 'UPI & Payments', icon: CreditCard },
  healthcare: { color: '#ec4899', stroke: '#db2777', label: 'Emergency & Health', icon: Activity },
};

export const GraphView: React.FC<GraphViewProps> = ({
  state,
  initialNodes,
  initialEdges,
  onManualFail,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Merge tick state snapshots with initial nodes layout
  const nodesMap = useMemo(() => {
    const map = new Map<string, ServiceNode>();
    initialNodes.forEach((n) => map.set(n.id, n));
    if (state && state.nodes) {
      Object.entries(state.nodes).forEach(([id, node]) => {
        const existing = map.get(id);
        map.set(id, { ...existing, ...node });
      });
    }
    return map;
  }, [state, initialNodes]);

  const edges = state?.edges || initialEdges;
  const nodesList = Array.from(nodesMap.values());
  const selectedNode = selectedNodeId ? nodesMap.get(selectedNodeId) : null;

  // Compute node dependencies & dependents for telemetry drawer
  const upstreamDependencies = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges.filter((e) => e.target === selectedNodeId);
  }, [selectedNodeId, edges]);

  const downstreamDependents = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges.filter((e) => e.source === selectedNodeId);
  }, [selectedNodeId, edges]);

  const getNodeColor = (node: ServiceNode) => {
    switch (node.status) {
      case 'failed':
        return '#ef4444'; // Red
      case 'recovering':
        return '#f59e0b'; // Amber
      case 'recovered':
        return '#10b981'; // Green
      default:
        return '#38bdf8'; // Sky / Up
    }
  };

  const getNodeStatusBadge = (status: NodeStatus, remainingTicks: number) => {
    switch (status) {
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/50">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            FAILED ({remainingTicks}t)
          </span>
        );
      case 'recovering':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/50">
            <Clock className="w-3 h-3 animate-spin" />
            RECOVERING ({remainingTicks}t)
          </span>
        );
      case 'recovered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
            <ShieldCheck className="w-3 h-3" />
            RECOVERED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            OPERATIONAL
          </span>
        );
    }
  };

  return (
    <div className="relative w-full h-[620px] bg-hud-bg-deep rounded-lg border border-hud-border overflow-hidden bg-grid-hud shadow-hud-card flex flex-col">
      {/* HUD Top Bar Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-2.5 bg-hud-surface/90 backdrop-blur-md border-b border-hud-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-hud-primary animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider text-hud-bright uppercase">
              Live Topology Visualizer
            </span>
          </div>
          <span className="text-xs text-hud-muted">|</span>
          <div className="flex items-center gap-2 text-xs font-mono text-hud-text">
            <span>Tick: <strong className="text-hud-primary">{state?.tick ?? 0}</strong></span>
            <span>Active Failures: <strong className={state?.active_failures_count ? 'text-red-400' : 'text-emerald-400'}>{state?.active_failures_count ?? 0}</strong></span>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-hud-text">Up</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400">Failed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-amber-400">Recovering</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400">Recovered</span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
            className="p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-hud-text hover:text-hud-primary transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
            className="p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-hud-text hover:text-hud-primary transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoomLevel(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-hud-text hover:text-hud-primary transition"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 w-full h-full pt-10 overflow-hidden relative cursor-grab active:cursor-grabbing">
        <svg
          viewBox="0 0 1060 700"
          className="w-full h-full select-none"
          style={{
            transform: `scale(${zoomLevel}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
        >
          <defs>
            {/* Arrow Marker Definitions */}
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#334155" />
            </marker>

            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
            </marker>

            <marker
              id="arrow-teal"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#00d1c1" />
            </marker>

            {/* Glowing Filters */}
            <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="glow-teal" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Sector Zone Background Highlights */}
          <g className="sector-zones opacity-30">
            {/* Power Zone */}
            <rect x="120" y="80" width="370" height="240" rx="12" fill="rgba(245, 158, 11, 0.05)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
            <text x="135" y="105" fill="#f59e0b" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">ZONE 01: POWER GRID</text>

            {/* Telecom Zone */}
            <rect x="360" y="130" width="380" height="260" rx="12" fill="rgba(139, 92, 246, 0.05)" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4 4" />
            <text x="375" y="155" fill="#8b5cf6" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">ZONE 02: TELECOM & DATA CORE</text>

            {/* Water Zone */}
            <rect x="150" y="380" width="620" height="120" rx="12" fill="rgba(6, 182, 212, 0.05)" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 4" />
            <text x="165" y="405" fill="#06b6d4" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">ZONE 03: WATER & RESERVOIRS</text>

            {/* Transit & Mobility */}
            <rect x="680" y="80" width="320" height="300" rx="12" fill="rgba(59, 130, 246, 0.05)" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" />
            <text x="695" y="105" fill="#3b82f6" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">ZONE 04: TRANSIT & SIGNALS</text>

            {/* Financial & UPI */}
            <rect x="760" y="420" width="250" height="190" rx="12" fill="rgba(16, 185, 129, 0.05)" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
            <text x="775" y="445" fill="#10b981" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">ZONE 05: UPI & BANKING</text>

            {/* Healthcare & EMS */}
            <rect x="340" y="520" width="370" height="140" rx="12" fill="rgba(236, 72, 153, 0.05)" stroke="#ec4899" strokeWidth="1" strokeDasharray="4 4" />
            <text x="355" y="545" fill="#ec4899" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">ZONE 06: HEALTH & EMERGENCY</text>
          </g>

          {/* Render Directed Dependency Edges */}
          <g className="edges">
            {edges.map((edge, idx) => {
              const srcNode = nodesMap.get(edge.source);
              const dstNode = nodesMap.get(edge.target);
              if (!srcNode || !dstNode || srcNode.x === undefined || srcNode.y === undefined || dstNode.x === undefined || dstNode.y === undefined) {
                return null;
              }

              const isSourceFailed = srcNode.status === 'failed';
              const isTargetFailed = dstNode.status === 'failed';
              const isCascading = isSourceFailed && (isTargetFailed || dstNode.status === 'recovering');
              const isSelected = selectedNodeId === edge.source || selectedNodeId === edge.target;

              let strokeColor = '#1e293b';
              let markerId = 'arrow-default';
              let strokeWidth = 1.5;

              if (isCascading) {
                strokeColor = '#ef4444';
                markerId = 'arrow-active';
                strokeWidth = 2.5;
              } else if (isSelected) {
                strokeColor = '#00d1c1';
                markerId = 'arrow-teal';
                strokeWidth = 2;
              }

              // Quadratic curve calculation for clean routing
              const midX = (srcNode.x + dstNode.x) / 2;
              const midY = (srcNode.y + dstNode.y) / 2;
              const dx = dstNode.x - srcNode.x;
              const dy = dstNode.y - srcNode.y;
              const curveOffset = Math.sin(idx) * 20;
              const ctrlX = midX - dy * 0.05 + curveOffset * 0.2;
              const ctrlY = midY + dx * 0.05 + curveOffset * 0.2;

              const pathD = `M ${srcNode.x} ${srcNode.y} Q ${ctrlX} ${ctrlY} ${dstNode.x} ${dstNode.y}`;

              return (
                <g key={`edge-${edge.source}-${edge.target}-${idx}`}>
                  {/* Background Path for hover target */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    className="cursor-pointer"
                  >
                    <title>{`${srcNode.name} -> ${dstNode.name} (Propagation Probability: ${(edge.propagation_probability * 100).toFixed(0)}%)`}</title>
                  </path>

                  {/* Visual Dependency Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isCascading ? '4 2' : undefined}
                    markerEnd={`url(#${markerId})`}
                    className={isCascading ? 'animate-pulse' : ''}
                  />

                  {/* Probability Edge Weight Badge */}
                  <text
                    x={ctrlX}
                    y={ctrlY - 4}
                    fill={isCascading ? '#ef4444' : isSelected ? '#00d1c1' : '#475569'}
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {(edge.propagation_probability * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}
          </g>

          {/* Render Service Nodes */}
          <g className="nodes">
            {nodesList.map((node) => {
              if (node.x === undefined || node.y === undefined) return null;
              const isSelected = selectedNodeId === node.id;
              const isFailed = node.status === 'failed';
              const isRecovering = node.status === 'recovering';
              const nodeColor = getNodeColor(node);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
                  className="cursor-pointer group"
                >
                  {/* Shockwave ripple animation for failed nodes */}
                  {isFailed && (
                    <>
                      <circle
                        r="32"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        opacity="0.7"
                        className="animate-ping"
                      />
                      <circle
                        r="24"
                        fill="rgba(239, 68, 68, 0.2)"
                        filter="url(#glow-red)"
                      />
                    </>
                  )}

                  {/* Pulse ring for recovering nodes */}
                  {isRecovering && (
                    <circle
                      r="26"
                      fill="rgba(245, 158, 11, 0.15)"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      filter="url(#glow-amber)"
                    />
                  )}

                  {/* Outer Target Selection Ring */}
                  {isSelected && (
                    <circle
                      r="27"
                      fill="none"
                      stroke="#00d1c1"
                      strokeWidth="2"
                      filter="url(#glow-teal)"
                    />
                  )}

                  {/* Main Node Housing Circle */}
                  <circle
                    r="18"
                    fill="#0f172a"
                    stroke={isSelected ? '#00d1c1' : nodeColor}
                    strokeWidth={isSelected ? '2.5' : '1.8'}
                    className="transition-all duration-200 group-hover:scale-110"
                  />

                  {/* Center Node Category Pip */}
                  <circle
                    r="9"
                    fill={nodeColor}
                    opacity={isFailed ? 1 : 0.85}
                  />

                  {/* Sector Icon Indicator overlay in center */}
                  <circle
                    r="3"
                    fill="#ffffff"
                  />

                  {/* Remaining Recovery Ticks Mini Pip */}
                  {(isFailed || isRecovering) && node.remaining_recovery_ticks > 0 && (
                    <g transform="translate(12, -12)">
                      <rect
                        x="-8"
                        y="-7"
                        width="16"
                        height="14"
                        rx="3"
                        fill={isFailed ? '#ef4444' : '#f59e0b'}
                      />
                      <text
                        x="0"
                        y="3"
                        fill="#000000"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="JetBrains Mono"
                        textAnchor="middle"
                      >
                        {node.remaining_recovery_ticks}
                      </text>
                    </g>
                  )}

                  {/* Primary Node Label */}
                  <text
                    x="0"
                    y="29"
                    fill={isSelected ? '#00d1c1' : isFailed ? '#f87171' : isRecovering ? '#fbbf24' : '#e2e8f0'}
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                    fontWeight={isSelected ? 'bold' : '500'}
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {node.name.length > 22 ? `${node.name.substring(0, 20)}...` : node.name}
                  </text>

                  {/* Category Identifier */}
                  <text
                    x="0"
                    y="39"
                    fill="#64748b"
                    fontSize="8"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    [{node.id}]
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Node Telemetry Inspection Overlay Drawer */}
      {selectedNode && (
        <div className="absolute bottom-3 right-3 w-84 bg-hud-surface/95 backdrop-blur-md border border-hud-border-active/60 rounded-lg p-4 shadow-hud-glow text-xs z-20 animate-fadeIn">
          <div className="flex items-start justify-between border-b border-hud-border pb-2.5 mb-2.5">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {(() => {
                  const style = CATEGORY_STYLES[selectedNode.category] || CATEGORY_STYLES.power;
                  const Icon = style.icon;
                  return (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-hud-primary border border-hud-primary/30">
                      <Icon className="w-3 h-3" />
                      {style.label}
                    </span>
                  );
                })()}
                <span className="font-mono text-hud-muted text-[10px]">ID: {selectedNode.id}</span>
              </div>
              <h4 className="font-bold text-sm text-hud-bright leading-tight">{selectedNode.name}</h4>
            </div>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="text-hud-muted hover:text-hud-bright p-1"
            >
              &times;
            </button>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-hud-text">Operational Status:</span>
              {getNodeStatusBadge(selectedNode.status, selectedNode.remaining_recovery_ticks)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-hud-text">Standard Recovery:</span>
              <span className="font-mono text-hud-bright">{selectedNode.recovery_duration} ticks</span>
            </div>
            {selectedNode.source_service_id && (
              <div className="flex justify-between items-center">
                <span className="text-red-400 font-medium">Disruption Trigger:</span>
                <span className="font-mono text-red-300 font-bold">[{selectedNode.source_service_id}]</span>
              </div>
            )}
          </div>

          {/* Dependencies / Dependents Breakdown */}
          <div className="pt-2 border-t border-hud-border space-y-1.5 text-[11px] font-mono">
            <div className="flex justify-between text-hud-muted">
              <span>Upstream Feeds: {upstreamDependencies.length}</span>
              <span>Downstream Consumers: {downstreamDependents.length}</span>
            </div>
            {downstreamDependents.length > 0 && (
              <div className="text-[10px] text-hud-muted truncate">
                Cascades to: {downstreamDependents.map((d) => d.target).join(', ')}
              </div>
            )}
          </div>

          {/* Manual Trigger Action */}
          {onManualFail && selectedNode.status === 'up' && (
            <button
              onClick={() => onManualFail(selectedNode.id)}
              className="w-full mt-3 py-1.5 px-3 bg-red-950/60 hover:bg-red-900 border border-red-500/60 rounded text-red-300 font-mono text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Force Disrupt Node
            </button>
          )}
        </div>
      )}
    </div>
  );
};

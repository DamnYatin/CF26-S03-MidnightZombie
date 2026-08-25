export type ServiceCategory = 'power' | 'water' | 'telecom' | 'transit' | 'payments' | 'healthcare';

export type NodeStatus = 'up' | 'failed' | 'recovering' | 'recovered';

export interface DisruptionEvent {
  tick: number;
  node_id: string;
  event_type: 'manual_failure' | 'cascade_failure' | 'recovering' | 'recovered';
  source_service_id?: string | null;
  details?: string;
}

export interface ServiceNode {
  id: string;
  name: string;
  category: ServiceCategory;
  status: NodeStatus;
  recovery_duration: number;
  remaining_recovery_ticks: number;
  failed_at_tick?: number | null;
  recovered_at_tick?: number | null;
  source_service_id?: string | null;
  x?: number;
  y?: number;
  importance: number;
}

export interface ServiceEdge {
  source: string;
  target: string;
  propagation_probability: number;
  description?: string;
}

export interface SimulationState {
  tick: number;
  nodes: Record<string, ServiceNode>;
  edges: ServiceEdge[];
  newly_failed: string[];
  newly_recovered: string[];
  active_failures_count: number;
  events: DisruptionEvent[];
}

export interface SimulationMetrics {
  cascade_depth: number;
  total_affected_services: number;
  affected_service_ids: string[];
  recovery_time_ticks: number;
  total_ticks_simulated: number;
  resilience_score: number;
  failure_timeline: number[];
  category_breakdown: Record<string, number>;
}

export interface SimulationConfig {
  scenario_id?: string;
  initial_failures: string[];
  seed: number;
  max_ticks: number;
  propagation_overrides?: Record<string, number>;
}

export interface SimulationResult {
  run_id: string;
  config: SimulationConfig;
  states: SimulationState[];
  events: DisruptionEvent[];
  metrics: SimulationMetrics;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  summary: string;
  narrative: string;
  category_focus: ServiceCategory;
  initial_failures: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommended_ticks: number;
  recommended_seed: number;
}

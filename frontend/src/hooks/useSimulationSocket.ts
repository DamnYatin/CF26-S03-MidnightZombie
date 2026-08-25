/**
 * Custom hook for WebSocket tick streaming and REST fallback simulation.
 *
 * Connects to the backend FastAPI WebSocket endpoint `/ws/{run_id}` to stream
 * discrete-time simulation states in real-time, while accumulating immutable
 * state snapshots for replay scrubbing.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { SimulationState, SimulationMetrics, DisruptionEvent, SimulationResult } from '../types';

const API_BASE_URL = 'http://localhost:8000';
const WS_BASE_URL = 'ws://localhost:8000';

interface StartSimulationParams {
  scenario_id?: string;
  initial_failures?: string[];
  seed: number;
  max_ticks: number;
  isLiveStream?: boolean;
}

export function useSimulationSocket() {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentTickIndex, setCurrentTickIndex] = useState<number>(0);
  const [allStates, setAllStates] = useState<SimulationState[]>([]);
  const [events, setEvents] = useState<DisruptionEvent[]>([]);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [runId, setRunId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  const socketRef = useRef<WebSocket | null>(null);

  // Active tick state derived from scrub position or live stream
  const currentTickState: SimulationState | null = allStates[currentTickIndex] || null;

  /**
   * Cleans up any active WebSocket connection.
   */
  const stopSimulation = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsRunning(false);
    setConnectionStatus('idle');
  }, []);

  /**
   * Initiates a simulation run via WebSocket streaming or REST batch fallback.
   */
  const startSimulation = useCallback(
    async ({ scenario_id = 'power_grid_collapse', initial_failures = [], seed = 42, max_ticks = 18, isLiveStream = true }: StartSimulationParams) => {
      // Reset state for new run
      stopSimulation();
      const newRunId = `run_${scenario_id}_${seed}_${Math.random().toString(36).substring(2, 7)}`;
      setRunId(newRunId);
      setIsRunning(true);
      setIsCompleted(false);
      setError(null);
      setAllStates([]);
      setEvents([]);
      setMetrics(null);
      setCurrentTickIndex(0);

      if (isLiveStream) {
        // Attempt WebSocket real-time stream
        setConnectionStatus('connecting');
        const query = new URLSearchParams({
          scenario: scenario_id,
          seed: seed.toString(),
          ticks: max_ticks.toString(),
          delay: '0.35',
        });

        const wsUrl = `${WS_BASE_URL}/ws/${newRunId}?${query.toString()}`;

        try {
          const ws = new WebSocket(wsUrl);
          socketRef.current = ws;

          ws.onopen = () => {
            setConnectionStatus('connected');
          };

          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);

              if (msg.type === 'TICK_UPDATE') {
                const tickState: SimulationState = msg.state;
                setAllStates((prev) => {
                  const updated = [...prev, tickState];
                  setCurrentTickIndex(updated.length - 1);
                  return updated;
                });
                if (tickState.events && tickState.events.length > 0) {
                  setEvents((prev) => [...prev, ...tickState.events]);
                }
              } else if (msg.type === 'STREAM_COMPLETE') {
                setMetrics(msg.metrics);
                setIsRunning(false);
                setIsCompleted(true);
                setConnectionStatus('idle');
              } else if (msg.type === 'STREAM_ERROR') {
                setError(msg.message || 'Stream simulation failed');
                setIsRunning(false);
                setConnectionStatus('error');
              }
            } catch (err) {
              console.error('Error parsing WS message:', err);
            }
          };

          ws.onerror = async () => {
            console.warn('WebSocket connection error, falling back to REST POST /simulate...');
            ws.close();
            // Fallback to REST execution
            await executeRestFallback({ scenario_id, initial_failures, seed, max_ticks });
          };

          ws.onclose = () => {
            setConnectionStatus('idle');
          };
        } catch (err) {
          console.warn('Failed to initiate WebSocket, falling back to REST...', err);
          await executeRestFallback({ scenario_id, initial_failures, seed, max_ticks });
        }
      } else {
        // Direct REST execution
        await executeRestFallback({ scenario_id, initial_failures, seed, max_ticks });
      }
    },
    [stopSimulation]
  );

  /**
   * REST execution fallback
   */
  const executeRestFallback = async (params: { scenario_id: string; initial_failures: string[]; seed: number; max_ticks: number }) => {
    try {
      setConnectionStatus('connecting');
      const response = await fetch(`${API_BASE_URL}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: params.scenario_id,
          initial_failures: params.initial_failures.length > 0 ? params.initial_failures : undefined,
          seed: params.seed,
          max_ticks: params.max_ticks,
        }),
      });

      if (!response.ok) {
        throw new Error(`Simulation failed with status ${response.status}`);
      }

      const data: SimulationResult = await response.json();
      setAllStates(data.states);
      setEvents(data.events);
      setMetrics(data.metrics);
      setRunId(data.run_id);
      setCurrentTickIndex(data.states.length - 1);
      setIsRunning(false);
      setIsCompleted(true);
      setConnectionStatus('idle');
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend simulation API');
      setIsRunning(false);
      setConnectionStatus('error');
    }
  };

  /**
   * Selects a specific tick for timeline scrubbing.
   */
  const selectTick = useCallback((tickIndex: number) => {
    if (tickIndex >= 0 && tickIndex < allStates.length) {
      setCurrentTickIndex(tickIndex);
    }
  }, [allStates.length]);

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return {
    isRunning,
    isCompleted,
    currentTickIndex,
    currentTickState,
    allStates,
    events,
    metrics,
    runId,
    error,
    connectionStatus,
    startSimulation,
    stopSimulation,
    selectTick,
  };
}

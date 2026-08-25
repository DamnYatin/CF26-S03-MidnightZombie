/**
 * Tick Timeline and Interactive Replay Scrub Bar Component.
 *
 * Provides granular playback controls (Play, Pause, Step Back, Step Forward, Speed Multipliers),
 * a scrub slider across all simulated states, and a real-time chronological event log.
 */

import React, { useState, useEffect, useRef } from 'react';
import { SimulationState, DisruptionEvent } from '../types';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  ListOrdered 
} from 'lucide-react';

interface TickTimelineProps {
  allStates: SimulationState[];
  currentTickIndex: number;
  onSelectTick: (index: number) => void;
  events: DisruptionEvent[];
  isLiveStreaming: boolean;
}

export const TickTimeline: React.FC<TickTimelineProps> = ({
  allStates,
  currentTickIndex,
  onSelectTick,
  events,
  isLiveStreaming,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [eventFilter, setEventFilter] = useState<'all' | 'failure' | 'recovery'>('all');
  
  const timerRef = useRef<any>(null);

  const totalStates = allStates.length;
  const maxIndex = Math.max(0, totalStates - 1);
  const currentState = allStates[currentTickIndex] || null;

  // Automated playback loop
  useEffect(() => {
    if (isPlaying && totalStates > 1) {
      const intervalMs = Math.max(100, 600 / playbackSpeed);
      timerRef.current = setInterval(() => {
        onSelectTick(
          currentTickIndex >= maxIndex ? 0 : currentTickIndex + 1
        );
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, currentTickIndex, maxIndex, totalStates, playbackSpeed, onSelectTick]);

  // Pause playback if live stream starts
  useEffect(() => {
    if (isLiveStreaming) {
      setIsPlaying(false);
    }
  }, [isLiveStreaming]);

  // Filter events up to currently scrubbed tick
  const visibleEvents = events
    .filter((e) => e.tick <= (currentState?.tick ?? 999))
    .filter((e) => {
      if (eventFilter === 'failure') return e.event_type.includes('failure');
      if (eventFilter === 'recovery') return e.event_type === 'recovered';
      return true;
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Playback Scrub Control Panel */}
      <div className="lg:col-span-2 hud-card p-4 rounded-lg border border-hud-border flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-hud-border pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-hud-primary" />
              <h4 className="text-xs font-mono font-bold uppercase text-hud-bright tracking-wider">
                Replay Scrub Bar & Time Controller
              </h4>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-hud-muted">
              <span>Position: <strong className="text-hud-primary">T{currentState?.tick ?? 0}</strong> / T{maxIndex}</span>
            </div>
          </div>

          {/* Interactive Scrub Slider */}
          <div className="space-y-2 my-4">
            <input
              type="range"
              min="0"
              max={maxIndex}
              value={currentTickIndex}
              disabled={totalStates <= 1}
              onChange={(e) => {
                setIsPlaying(false);
                onSelectTick(parseInt(e.target.value));
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-hud-primary"
            />

            {/* Tick Markers */}
            <div className="flex justify-between text-[10px] font-mono text-hud-muted px-1">
              {allStates.map((s, idx) => (
                <button
                  key={s.tick}
                  onClick={() => onSelectTick(idx)}
                  className={`hover:text-hud-primary transition ${
                    idx === currentTickIndex ? 'text-hud-primary font-bold scale-110' : ''
                  }`}
                >
                  T{s.tick}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Playback Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-hud-border">
          {/* Main Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectTick(0)}
              disabled={totalStates <= 1}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-hud-text hover:text-hud-bright transition"
              title="Jump to Start (Tick 0)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onSelectTick(Math.max(0, currentTickIndex - 1))}
              disabled={currentTickIndex === 0 || totalStates <= 1}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-hud-text hover:text-hud-bright transition"
              title="Step Back 1 Tick"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={totalStates <= 1}
              className={`px-4 py-2 rounded font-mono text-xs font-bold transition flex items-center gap-1.5 ${
                isPlaying
                  ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                  : 'bg-hud-primary/20 border border-hud-primary text-hud-primary shadow-hud-glow'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Replay
                </>
              )}
            </button>

            <button
              onClick={() => onSelectTick(Math.min(maxIndex, currentTickIndex + 1))}
              disabled={currentTickIndex >= maxIndex || totalStates <= 1}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-hud-text hover:text-hud-bright transition"
              title="Step Forward 1 Tick"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Playback Speed Multipliers */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-hud-border">
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                  playbackSpeed === speed
                    ? 'bg-hud-primary text-black font-bold'
                    : 'text-hud-muted hover:text-hud-bright'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Chronological Event Log Stream */}
      <div className="hud-card p-4 rounded-lg border border-hud-border flex flex-col h-[230px]">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-hud-border">
          <div className="flex items-center gap-1.5">
            <ListOrdered className="w-4 h-4 text-hud-primary" />
            <h4 className="text-xs font-mono font-bold uppercase text-hud-bright tracking-wider">
              Disruption Event Log
            </h4>
          </div>

          {/* Event Filter */}
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <button
              onClick={() => setEventFilter('all')}
              className={`px-1.5 py-0.5 rounded ${eventFilter === 'all' ? 'bg-slate-700 text-hud-bright' : 'text-hud-muted'}`}
            >
              All
            </button>
            <button
              onClick={() => setEventFilter('failure')}
              className={`px-1.5 py-0.5 rounded ${eventFilter === 'failure' ? 'bg-red-950 text-red-300' : 'text-hud-muted'}`}
            >
              Fails
            </button>
            <button
              onClick={() => setEventFilter('recovery')}
              className={`px-1.5 py-0.5 rounded ${eventFilter === 'recovery' ? 'bg-emerald-950 text-emerald-300' : 'text-hud-muted'}`}
            >
              Restored
            </button>
          </div>
        </div>

        {/* Scrollable Event Feed */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs font-mono">
          {visibleEvents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-hud-muted text-xs">
              No events recorded at or before current tick.
            </div>
          ) : (
            visibleEvents.map((evt, idx) => {
              const isFailure = evt.event_type.includes('failure');
              const isRecovered = evt.event_type === 'recovered';

              return (
                <div
                  key={`evt-${idx}-${evt.tick}-${evt.node_id}`}
                  className={`p-2 rounded border text-[11px] transition ${
                    isFailure
                      ? 'bg-red-950/40 border-red-500/30 text-red-200'
                      : isRecovered
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                      : 'bg-slate-900 border-hud-border text-hud-text'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-hud-primary">TICK {String(evt.tick).padStart(2, '0')}</span>
                    <span className="uppercase text-[9px] px-1 rounded bg-black/40">
                      {evt.event_type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="font-semibold text-hud-bright truncate">
                    Node: {evt.node_id}
                  </div>

                  {evt.source_service_id && (
                    <div className="text-[10px] text-red-300">
                      └─ Triggered by: <strong>{evt.source_service_id}</strong>
                    </div>
                  )}

                  {evt.details && (
                    <div className="text-[10px] text-hud-muted mt-0.5 truncate">
                      {evt.details}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

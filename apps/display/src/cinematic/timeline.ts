import type { CinematicPhase } from './types';

export interface TimelineKeyframe {
  time: number;
  phase: CinematicPhase;
  action?: string;
  params?: Record<string, unknown>;
}

export interface TimelineConfig {
  totalDuration: number;
  keyframes: TimelineKeyframe[];
  loop: boolean;
}

export type TimelineListener = (phase: CinematicPhase, elapsedMs: number, keyframe?: TimelineKeyframe) => void;

export class CinematicTimeline {
  private _config: TimelineConfig;
  private _elapsed = 0;
  private _running = false;
  private _currentPhaseIndex = -1;
  private _listeners = new Set<TimelineListener>();
  private _rafId: number | null = null;
  private _lastTimestamp = 0;

  constructor(config: TimelineConfig) {
    this._config = config;
    this._config.keyframes.sort((a, b) => a.time - b.time);
  }

  get elapsed(): number {
    return this._elapsed;
  }

  get currentPhase(): CinematicPhase | null {
    if (this._currentPhaseIndex < 0) return null;
    return this._config.keyframes[this._currentPhaseIndex].phase;
  }

  get progress(): number {
    return Math.min(this._elapsed / this._config.totalDuration, 1);
  }

  get isRunning(): boolean {
    return this._running;
  }

  onPhaseChange(listener: TimelineListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify(phase: CinematicPhase, keyframe?: TimelineKeyframe): void {
    for (const listener of this._listeners) {
      listener(phase, this._elapsed, keyframe);
    }
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this._lastTimestamp = performance.now();
    this._tick();
  }

  stop(): void {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  reset(): void {
    this.stop();
    this._elapsed = 0;
    this._currentPhaseIndex = -1;
  }

  seek(timeMs: number): void {
    this._elapsed = Math.max(0, Math.min(timeMs, this._config.totalDuration));
    this._updatePhase();
  }

  private _tick = (): void => {
    if (!this._running) return;

    const now = performance.now();
    const delta = now - this._lastTimestamp;
    this._lastTimestamp = now;
    this._elapsed += delta;

    if (this._elapsed >= this._config.totalDuration) {
      if (this._config.loop) {
        this._elapsed %= this._config.totalDuration;
        this._currentPhaseIndex = -1;
      } else {
        this._elapsed = this._config.totalDuration;
        this._updatePhase();
        this._running = false;
        return;
      }
    }

    this._updatePhase();

    this._rafId = requestAnimationFrame(this._tick);
  };

  private _updatePhase(): void {
    const keyframes = this._config.keyframes;
    let newIndex = -1;

    for (let i = keyframes.length - 1; i >= 0; i--) {
      if (this._elapsed >= keyframes[i].time) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== this._currentPhaseIndex && newIndex >= 0) {
      this._currentPhaseIndex = newIndex;
      this._notify(keyframes[newIndex].phase, keyframes[newIndex]);
    }
  }

  dispose(): void {
    this.stop();
    this._listeners.clear();
  }
}

export function createTimeline(preset: {
  phases: Array<{ phase: CinematicPhase; durationMs: number; action?: string }>;
  loop?: boolean;
}): CinematicTimeline {
  let accumulated = 0;
  const keyframes: TimelineKeyframe[] = [];

  for (const p of preset.phases) {
    keyframes.push({
      time: accumulated,
      phase: p.phase,
      action: p.action,
    });
    accumulated += p.durationMs;
  }

  return new CinematicTimeline({
    totalDuration: accumulated,
    keyframes,
    loop: preset.loop ?? false,
  });
}

import type {
  CinematicPhase,
  CinematicContext,
  DrawResult,
  CinematicSnapshot,
  CinematicPhaseListener,
} from './types';

export interface CinematicEffect {
  readonly id: string;
  readonly phase: CinematicPhase;
  prepare(context: CinematicContext): Promise<void>;
  start(): Promise<void>;
  finish(result: DrawResult): Promise<void>;
  stop(): Promise<void>;
  replay(): Promise<void>;
  recover(snapshot: CinematicSnapshot): Promise<void>;
  takeSnapshot(): CinematicSnapshot;
  onPhaseChange(listener: CinematicPhaseListener): () => void;
  dispose(): void;
}

export abstract class BaseCinematicEffect implements CinematicEffect {
  readonly id: string;
  protected _phase: CinematicPhase = 'IDLE';
  protected _context: CinematicContext | null = null;
  protected _result: DrawResult | null = null;
  protected _elapsedMs = 0;
  protected _startTime = 0;
  private _phaseListeners = new Set<CinematicPhaseListener>();

  constructor(id: string) {
    this.id = id;
  }

  get phase(): CinematicPhase {
    return this._phase;
  }

  onPhaseChange(listener: CinematicPhaseListener): () => void {
    this._phaseListeners.add(listener);
    return () => {
      this._phaseListeners.delete(listener);
    };
  }

  protected setPhase(phase: CinematicPhase): void {
    if (this._phase === phase) return;
    this._phase = phase;
    for (const listener of this._phaseListeners) {
      listener(phase, this.takeSnapshot());
    }
  }

  async prepare(context: CinematicContext): Promise<void> {
    this._context = context;
    this.setPhase('PREPARE');
    await this.onPrepare(context);
  }

  async start(): Promise<void> {
    this._startTime = performance.now();
    this.setPhase('BUILD_UP');
    await this.onStart();
  }

  async finish(result: DrawResult): Promise<void> {
    this._result = result;
    this.setPhase('FINAL_APPROACH');
    await this.onFinalApproach(result);
    this.setPhase('WINNER_FOCUS');
    await this.onWinnerFocus(result);
    this.setPhase('REVEAL');
    await this.onReveal(result);
    this.setPhase('CELEBRATION');
    await this.onCelebration(result);
    this.setPhase('RESULT_HOLD');
  }

  async stop(): Promise<void> {
    this.setPhase('STOPPED');
    await this.onStop();
  }

  async replay(): Promise<void> {
    this._elapsedMs = 0;
    this._startTime = performance.now();
    if (this._result) {
      this.setPhase('BUILD_UP');
      await this.onStart();
    }
  }

  async recover(snapshot: CinematicSnapshot): Promise<void> {
    this._context = snapshot.context;
    this._result = snapshot.result ?? null;
    this._elapsedMs = snapshot.elapsedMs;
    this.setPhase('RECOVERING');
    await this.onRecover(snapshot);
  }

  takeSnapshot(): CinematicSnapshot {
    return {
      cinematicType: this._context?.cinematicType ?? 'AVATAR_GALAXY',
      phase: this._phase,
      context: this._context!,
      elapsedMs: this._elapsedMs,
      result: this._result ?? undefined,
      customState: this.getCustomState(),
      timestamp: Date.now(),
    };
  }

  dispose(): void {
    this._phaseListeners.clear();
    this._context = null;
    this._result = null;
  }

  protected getCustomState(): Record<string, unknown> {
    return {};
  }

  protected abstract onPrepare(context: CinematicContext): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onFinalApproach(result: DrawResult): Promise<void>;
  protected abstract onWinnerFocus(result: DrawResult): Promise<void>;
  protected abstract onReveal(result: DrawResult): Promise<void>;
  protected abstract onCelebration(result: DrawResult): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onRecover(snapshot: CinematicSnapshot): Promise<void>;
}

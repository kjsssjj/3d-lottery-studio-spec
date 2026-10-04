import { BaseCinematicEffect } from '../cinematic/cinematic-effect';
import type { CinematicContext, DrawResult, CinematicSnapshot } from '../cinematic/types';
import { createTimeline, type CinematicTimeline } from '../cinematic/timeline';

export class CrystalSphereEffect extends BaseCinematicEffect {
  private _timeline: CinematicTimeline | null = null;

  protected async onPrepare(_context: CinematicContext): Promise<void> {
    this._timeline = createTimeline({
      phases: [
        { phase: 'PREPARE', durationMs: 1500 },
        { phase: 'BUILD_UP', durationMs: 2500 },
        { phase: 'ROLLING', durationMs: 8000 },
        { phase: 'FINAL_APPROACH', durationMs: 2500 },
        { phase: 'WINNER_FOCUS', durationMs: 2500 },
        { phase: 'REVEAL', durationMs: 2500 },
        { phase: 'CELEBRATION', durationMs: 2500 },
      ],
    });
  }

  protected async onStart(): Promise<void> {
    this._timeline?.start();
  }

  protected async onFinalApproach(_result: DrawResult): Promise<void> {}
  protected async onWinnerFocus(_result: DrawResult): Promise<void> {}
  protected async onReveal(_result: DrawResult): Promise<void> {}
  protected async onCelebration(_result: DrawResult): Promise<void> {}
  protected async onStop(): Promise<void> {
    this._timeline?.stop();
  }
  protected async onRecover(_snapshot: CinematicSnapshot): Promise<void> {}

  dispose(): void {
    this._timeline?.dispose();
    this._timeline = null;
    super.dispose();
  }
}

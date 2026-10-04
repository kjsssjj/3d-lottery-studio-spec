import type { CinematicEffect } from './cinematic-effect';
import { presetLibrary } from './preset-library';
import { cinematicAudioEngine } from './cinematic-audio';
import type {
  CinematicType,
  CinematicPhase,
  CinematicContext,
  DrawResult,
  CinematicSnapshot,
  CinematicPhaseListener,
} from './types';

export type { CinematicType, CinematicPhase, CinematicContext, DrawResult, CinematicSnapshot, CinematicPhaseListener };

interface CinematicDirectorState {
  currentEffect: CinematicEffect | null;
  cinematicPhase: CinematicPhase;
  cinematicType: CinematicType | null;
  context: CinematicContext | null;
  result: DrawResult | null;
}

type CinematicDirectorListener = (state: CinematicDirectorState) => void;

class CinematicDirector {
  private _state: CinematicDirectorState = {
    currentEffect: null,
    cinematicPhase: 'IDLE',
    cinematicType: null,
    context: null,
    result: null,
  };
  private _listeners = new Set<CinematicDirectorListener>();
  private _phaseUnsub: (() => void) | null = null;
  private _defaultCinematicType: CinematicType = 'AVATAR_GALAXY';

  get state(): Readonly<CinematicDirectorState> {
    return this._state;
  }

  setDefaultCinematicType(type: CinematicType): void {
    this._defaultCinematicType = type;
  }

  onStateChange(listener: CinematicDirectorListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      listener({ ...this._state });
    }
  }

  private _update(partial: Partial<CinematicDirectorState>): void {
    Object.assign(this._state, partial);
    this._notify();
  }

  async prepare(
    cinematicType: CinematicType | null,
    context: Omit<CinematicContext, 'cinematicType'>,
  ): Promise<void> {
    await this.cleanup();

    const type = cinematicType ?? this._defaultCinematicType;
    if (!presetLibrary.has(type)) {
      throw new Error(`Cinematic type not available: ${type}`);
    }

    const fullContext: CinematicContext = { ...context, cinematicType: type };
    const effect = presetLibrary.create(type, `cinematic-${Date.now()}`);

    this._phaseUnsub = effect.onPhaseChange((phase) => {
      this._update({ cinematicPhase: phase });
      if (this._state.cinematicType) {
        cinematicAudioEngine.playPhaseSound(this._state.cinematicType, phase);
      }
    });

    this._update({
      currentEffect: effect,
      cinematicType: type,
      context: fullContext,
      cinematicPhase: 'IDLE',
      result: null,
    });

    await effect.prepare(fullContext);
  }

  async start(): Promise<void> {
    const { currentEffect } = this._state;
    if (!currentEffect) throw new Error('No active cinematic to start');
    await currentEffect.start();
  }

  async finish(committedResult: DrawResult): Promise<void> {
    const { currentEffect } = this._state;
    if (!currentEffect) throw new Error('No active cinematic to finish');
    this._update({ result: committedResult });
    await currentEffect.finish(committedResult);
  }

  async stop(): Promise<void> {
    const { currentEffect } = this._state;
    if (!currentEffect) return;
    await currentEffect.stop();
  }

  async replay(): Promise<void> {
    const { currentEffect } = this._state;
    if (!currentEffect) throw new Error('No active cinematic to replay');
    await currentEffect.replay();
  }

  async recover(snapshot: CinematicSnapshot): Promise<void> {
    await this.cleanup();

    const type = snapshot.cinematicType;
    if (!presetLibrary.has(type)) {
      throw new Error(`Cinematic type not available for recovery: ${type}`);
    }

    const effect = presetLibrary.create(type, `cinematic-recover-${Date.now()}`);
    this._phaseUnsub = effect.onPhaseChange((phase) => {
      this._update({ cinematicPhase: phase });
      if (this._state.cinematicType) {
        cinematicAudioEngine.playPhaseSound(this._state.cinematicType, phase);
      }
    });

    this._update({
      currentEffect: effect,
      cinematicType: type,
      context: snapshot.context,
      result: snapshot.result ?? null,
      cinematicPhase: 'RECOVERING',
    });

    await effect.recover(snapshot);
  }

  async cleanup(): Promise<void> {
    if (this._phaseUnsub) {
      this._phaseUnsub();
      this._phaseUnsub = null;
    }
    cinematicAudioEngine.stopAll();
    if (this._state.currentEffect) {
      this._state.currentEffect.dispose();
    }
    this._update({
      currentEffect: null,
      cinematicPhase: 'IDLE',
      cinematicType: null,
      context: null,
      result: null,
    });
  }

  takeSnapshot(): CinematicSnapshot | null {
    const { currentEffect } = this._state;
    if (!currentEffect) return null;
    return currentEffect.takeSnapshot();
  }
}

export const cinematicDirector = new CinematicDirector();

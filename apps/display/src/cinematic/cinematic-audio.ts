export class CinematicAudioEngine {
  private _muted = false;
  private _volume = 0.7;

  setMuted(muted: boolean): void {
    this._muted = muted;
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
  }

  playPhaseSound(_cinematicType: string, _phase: string): void {
    if (this._muted) return;
  }

  playTransition(_from: string, _to: string): void {
    if (this._muted) return;
  }

  stopAll(): void {}
}

export const cinematicAudioEngine = new CinematicAudioEngine();

export interface AudioConfig {
  muted: boolean;
  volume: number;
}

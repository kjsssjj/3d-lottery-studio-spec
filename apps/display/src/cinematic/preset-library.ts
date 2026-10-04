import type { CinematicType, CinematicPresetMeta } from './types';
import type { CinematicEffect } from './cinematic-effect';

export type CinematicFactory = (id: string) => CinematicEffect;

interface PresetEntry {
  factory: CinematicFactory;
  meta: CinematicPresetMeta;
}

class PresetLibrary {
  private _presets = new Map<CinematicType, PresetEntry>();

  register(type: CinematicType, factory: CinematicFactory, meta: CinematicPresetMeta): void {
    this._presets.set(type, { factory, meta });
  }

  has(type: CinematicType): boolean {
    return this._presets.has(type);
  }

  create(type: CinematicType, id: string): CinematicEffect {
    const entry = this._presets.get(type);
    if (!entry) throw new Error(`Unknown cinematic preset: ${type}`);
    return entry.factory(id);
  }

  getMeta(type: CinematicType): CinematicPresetMeta | undefined {
    return this._presets.get(type)?.meta;
  }

  listAll(): CinematicPresetMeta[] {
    return Array.from(this._presets.values()).map((e) => e.meta);
  }

  listTypes(): CinematicType[] {
    return Array.from(this._presets.keys());
  }
}

export const presetLibrary = new PresetLibrary();

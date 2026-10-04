import type { CinematicPhase } from './types';

export interface LightConfig {
  type: 'ambient' | 'directional' | 'point' | 'spot';
  color: string;
  intensity: number;
  position?: [number, number, number];
  target?: [number, number, number];
  angle?: number;
  penumbra?: number;
  distance?: number;
  castShadow?: boolean;
  shadowMapSize?: number;
}

export interface LightingRig {
  name: string;
  lights: LightConfig[];
  environmentPreset?: string;
  backgroundIntensity?: number;
}

export const lightingPresets: Record<string, LightingRig> = {
  warmStage: {
    name: '暖色舞台',
    environmentPreset: 'sunset',
    backgroundIntensity: 0.3,
    lights: [
      { type: 'ambient', color: '#2a1810', intensity: 0.4 },
      {
        type: 'spot',
        color: '#ffd700',
        intensity: 3.0,
        position: [0, 15, 5],
        target: [0, 0, 0],
        angle: 0.5,
        penumbra: 0.8,
        castShadow: true,
        shadowMapSize: 1024,
      },
      {
        type: 'spot',
        color: '#ff6b35',
        intensity: 1.5,
        position: [-10, 8, -5],
        target: [0, 0, 0],
        angle: 0.6,
        penumbra: 0.9,
      },
      {
        type: 'spot',
        color: '#ff6b35',
        intensity: 1.5,
        position: [10, 8, -5],
        target: [0, 0, 0],
        angle: 0.6,
        penumbra: 0.9,
      },
    ],
  },

  crystalClear: {
    name: '水晶通透',
    environmentPreset: 'city',
    backgroundIntensity: 0.2,
    lights: [
      { type: 'ambient', color: '#1a2a3a', intensity: 0.6 },
      {
        type: 'directional',
        color: '#ffffff',
        intensity: 2.0,
        position: [5, 10, 5],
        castShadow: true,
        shadowMapSize: 2048,
      },
      {
        type: 'point',
        color: '#4a9eff',
        intensity: 1.5,
        position: [0, 3, 0],
        distance: 20,
      },
      {
        type: 'point',
        color: '#00d4ff',
        intensity: 0.8,
        position: [-5, 2, 3],
        distance: 15,
      },
    ],
  },

  redGoldMatrix: {
    name: '红金矩阵',
    environmentPreset: 'night',
    backgroundIntensity: 0.1,
    lights: [
      { type: 'ambient', color: '#1a0000', intensity: 0.3 },
      {
        type: 'directional',
        color: '#ff2020',
        intensity: 1.5,
        position: [0, 10, 5],
        castShadow: true,
        shadowMapSize: 1024,
      },
      {
        type: 'point',
        color: '#ffd700',
        intensity: 2.0,
        position: [0, 5, 0],
        distance: 25,
      },
      {
        type: 'spot',
        color: '#ff4444',
        intensity: 1.0,
        position: [-8, 12, 0],
        target: [0, 0, 0],
        angle: 0.4,
        penumbra: 0.7,
      },
    ],
  },

  goldenVortex: {
    name: '金色漩涡',
    environmentPreset: 'warehouse',
    backgroundIntensity: 0.15,
    lights: [
      { type: 'ambient', color: '#1a1000', intensity: 0.3 },
      {
        type: 'point',
        color: '#ffd700',
        intensity: 3.0,
        position: [0, 0, 0],
        distance: 30,
      },
      {
        type: 'spot',
        color: '#ffaa00',
        intensity: 2.0,
        position: [0, 15, 0],
        target: [0, 0, 0],
        angle: 0.8,
        penumbra: 1.0,
        castShadow: true,
        shadowMapSize: 1024,
      },
      {
        type: 'point',
        color: '#ff8c00',
        intensity: 1.0,
        position: [8, 3, 8],
        distance: 20,
      },
    ],
  },

  honorStage: {
    name: '荣耀舞台',
    environmentPreset: 'studio',
    backgroundIntensity: 0.05,
    lights: [
      { type: 'ambient', color: '#0a0a1a', intensity: 0.2 },
      {
        type: 'spot',
        color: '#ffffff',
        intensity: 4.0,
        position: [0, 20, 0],
        target: [0, 0, 0],
        angle: 0.3,
        penumbra: 0.5,
        castShadow: true,
        shadowMapSize: 2048,
      },
      {
        type: 'spot',
        color: '#ffd700',
        intensity: 2.0,
        position: [-12, 15, 5],
        target: [0, 0, 0],
        angle: 0.4,
        penumbra: 0.8,
      },
      {
        type: 'spot',
        color: '#ffd700',
        intensity: 2.0,
        position: [12, 15, 5],
        target: [0, 0, 0],
        angle: 0.4,
        penumbra: 0.8,
      },
      {
        type: 'point',
        color: '#4169e1',
        intensity: 0.5,
        position: [0, 1, 10],
        distance: 15,
      },
    ],
  },
};

export interface PhaseLightingConfig {
  intensityMultiplier: number;
  colorShift?: string;
  ambientBoost?: number;
}

export const phaseLightingMap: Record<CinematicPhase, PhaseLightingConfig> = {
  IDLE: { intensityMultiplier: 0.5 },
  PREPARE: { intensityMultiplier: 0.7, ambientBoost: 0.1 },
  BUILD_UP: { intensityMultiplier: 0.9, ambientBoost: 0.15 },
  ROLLING: { intensityMultiplier: 1.0 },
  FINAL_APPROACH: { intensityMultiplier: 1.2, colorShift: '#ffd700' },
  WINNER_FOCUS: { intensityMultiplier: 1.5, colorShift: '#ffffff' },
  REVEAL: { intensityMultiplier: 1.8, colorShift: '#ffd700', ambientBoost: 0.3 },
  CELEBRATION: { intensityMultiplier: 1.5, ambientBoost: 0.2 },
  RESULT_HOLD: { intensityMultiplier: 1.0, ambientBoost: 0.1 },
  STOPPED: { intensityMultiplier: 0.6 },
  RECOVERING: { intensityMultiplier: 0.8 },
};

export function getLightingRig(presetName: string): LightingRig {
  return lightingPresets[presetName] ?? lightingPresets.warmStage;
}

export function getPhaseLighting(phase: CinematicPhase): PhaseLightingConfig {
  return phaseLightingMap[phase];
}

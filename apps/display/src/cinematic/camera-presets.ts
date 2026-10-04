import type { CinematicPhase } from './types';

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

export interface CameraKeyframe {
  time: number;
  state: CameraState;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface CameraPreset {
  name: string;
  keyframes: CameraKeyframe[];
  totalDuration: number;
}

const defaultCam: CameraState = {
  position: [0, 2, 12],
  target: [0, 0, 0],
  fov: 50,
  near: 0.1,
  far: 1000,
};

export const cameraPresets: Record<string, CameraPreset> = {
  orbitSlow: {
    name: '慢速环绕',
    totalDuration: 20000,
    keyframes: [
      { time: 0, state: { ...defaultCam, position: [0, 2, 12] }, easing: 'easeInOut' },
      { time: 5000, state: { ...defaultCam, position: [12, 3, 0] }, easing: 'easeInOut' },
      { time: 10000, state: { ...defaultCam, position: [0, 4, -12] }, easing: 'easeInOut' },
      { time: 15000, state: { ...defaultCam, position: [-12, 3, 0] }, easing: 'easeInOut' },
      { time: 20000, state: { ...defaultCam, position: [0, 2, 12] }, easing: 'easeInOut' },
    ],
  },

  dramaticZoom: {
    name: '戏剧推进',
    totalDuration: 8000,
    keyframes: [
      { time: 0, state: { ...defaultCam, position: [0, 3, 20], fov: 35 }, easing: 'easeIn' },
      { time: 4000, state: { ...defaultCam, position: [0, 1, 6], fov: 60 }, easing: 'easeOut' },
      { time: 8000, state: { ...defaultCam, position: [0, 0.5, 3], fov: 75 }, easing: 'easeOut' },
    ],
  },

  winnerFocus: {
    name: '聚焦中奖者',
    totalDuration: 5000,
    keyframes: [
      { time: 0, state: { ...defaultCam, position: [0, 2, 10], fov: 50 }, easing: 'easeInOut' },
      { time: 3000, state: { ...defaultCam, position: [0, 1, 4], fov: 40 }, easing: 'easeOut' },
      { time: 5000, state: { ...defaultCam, position: [0, 0.5, 3], fov: 35 }, easing: 'linear' },
    ],
  },

  celebrationOrbit: {
    name: '庆祝环绕',
    totalDuration: 10000,
    keyframes: [
      { time: 0, state: { ...defaultCam, position: [0, 5, 10], fov: 55 }, easing: 'easeInOut' },
      { time: 2500, state: { ...defaultCam, position: [10, 6, 0], fov: 55 }, easing: 'easeInOut' },
      { time: 5000, state: { ...defaultCam, position: [0, 7, -10], fov: 50 }, easing: 'easeInOut' },
      { time: 7500, state: { ...defaultCam, position: [-10, 6, 0], fov: 55 }, easing: 'easeInOut' },
      { time: 10000, state: { ...defaultCam, position: [0, 5, 10], fov: 55 }, easing: 'easeInOut' },
    ],
  },

  revealPull: {
    name: '揭晓拉远',
    totalDuration: 6000,
    keyframes: [
      { time: 0, state: { ...defaultCam, position: [0, 0.5, 3], fov: 70 }, easing: 'easeOut' },
      { time: 3000, state: { ...defaultCam, position: [0, 2, 8], fov: 50 }, easing: 'easeInOut' },
      { time: 6000, state: { ...defaultCam, position: [0, 3, 14], fov: 45 }, easing: 'easeIn' },
    ],
  },
};

export interface PhaseCameraMap {
  [phase: string]: string;
}

export const defaultPhaseCameraMap: PhaseCameraMap = {
  IDLE: 'orbitSlow',
  PREPARE: 'orbitSlow',
  BUILD_UP: 'dramaticZoom',
  ROLLING: 'orbitSlow',
  FINAL_APPROACH: 'dramaticZoom',
  WINNER_FOCUS: 'winnerFocus',
  REVEAL: 'revealPull',
  CELEBRATION: 'celebrationOrbit',
  RESULT_HOLD: 'orbitSlow',
  STOPPED: 'orbitSlow',
  RECOVERING: 'orbitSlow',
};

export function getCameraPreset(name: string): CameraPreset {
  return cameraPresets[name] ?? cameraPresets.orbitSlow;
}

export function interpolateCameraState(
  a: CameraState,
  b: CameraState,
  t: number,
  easing: CameraKeyframe['easing'] = 'linear',
): CameraState {
  let easedT = t;
  switch (easing) {
    case 'easeIn':
      easedT = t * t;
      break;
    case 'easeOut':
      easedT = 1 - (1 - t) * (1 - t);
      break;
    case 'easeInOut':
      easedT = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      break;
  }

  return {
    position: [
      a.position[0] + (b.position[0] - a.position[0]) * easedT,
      a.position[1] + (b.position[1] - a.position[1]) * easedT,
      a.position[2] + (b.position[2] - a.position[2]) * easedT,
    ],
    target: [
      a.target[0] + (b.target[0] - a.target[0]) * easedT,
      a.target[1] + (b.target[1] - a.target[1]) * easedT,
      a.target[2] + (b.target[2] - a.target[2]) * easedT,
    ],
    fov: a.fov + (b.fov - a.fov) * easedT,
    near: a.near,
    far: a.far,
  };
}

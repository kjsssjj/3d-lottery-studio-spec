import React from 'react';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

export function GoldenVortexGeometry({ candidates }: SceneProps) {
  return React.createElement('group', null,
    candidates.slice(0, 200).map((c, i) => {
      const angle = (i / Math.min(candidates.length, 200)) * Math.PI * 2 * 5;
      const radius = 0.5 + (i / Math.min(candidates.length, 200)) * 6;
      const height = (i / Math.min(candidates.length, 200)) * 4 - 2;
      return React.createElement('mesh', {
        key: c.id,
        position: [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
      },
        React.createElement('sphereGeometry', { args: [0.08, 8, 8] }),
        React.createElement('meshPhysicalMaterial', {
          color: '#ffd700',
          metalness: 1.0,
          roughness: 0.05,
          emissive: '#664400',
          envMapIntensity: 1.5,
        }),
      );
    }),
  );
}

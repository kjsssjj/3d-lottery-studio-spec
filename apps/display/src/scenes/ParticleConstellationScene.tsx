import React from 'react';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

export function ParticleConstellationGeometry({ candidates }: SceneProps) {
  return React.createElement('group', null,
    candidates.slice(0, 100).map((c, i) => {
      const x = (Math.random() - 0.5) * 16;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 16;
      return React.createElement('mesh', {
        key: c.id,
        position: [x, y, z],
      },
        React.createElement('sphereGeometry', { args: [0.1, 12, 12] }),
        React.createElement('meshPhysicalMaterial', {
          color: '#4a9eff',
          metalness: 0.3,
          roughness: 0.1,
          emissive: '#1a3366',
        }),
      );
    }),
  );
}

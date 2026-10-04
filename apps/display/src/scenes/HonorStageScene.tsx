import React from 'react';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

export function HonorStageGeometry({ candidates }: SceneProps) {
  return React.createElement('group', null,
    React.createElement('mesh', { position: [0, -1, 0] },
      React.createElement('cylinderGeometry', { args: [6, 7, 0.5, 64] }),
      React.createElement('meshPhysicalMaterial', {
        color: '#1a1a1a',
        metalness: 0.9,
        roughness: 0.2,
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
      }),
    ),
    React.createElement('group', null,
      candidates.slice(0, 20).map((c, i) => {
        const angle = (i / Math.min(candidates.length, 20)) * Math.PI * 2;
        const radius = 4;
        return React.createElement('mesh', {
          key: c.id,
          position: [Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius],
        },
          React.createElement('cylinderGeometry', { args: [0.3, 0.3, 1.5, 16] }),
          React.createElement('meshPhysicalMaterial', {
            color: '#d4a843',
            metalness: 0.95,
            roughness: 0.35,
            clearcoat: 0.3,
          }),
        );
      }),
    ),
  );
}

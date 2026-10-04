import React from 'react';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

export function GrandCeremonyGeometry({ candidates }: SceneProps) {
  return React.createElement('group', null,
    React.createElement('mesh', { position: [0, -2, 0] },
      React.createElement('boxGeometry', { args: [16, 0.3, 10] }),
      React.createElement('meshPhysicalMaterial', {
        color: '#8b0000',
        metalness: 0.1,
        roughness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      }),
    ),
    React.createElement('mesh', { position: [0, 3, -4] },
      React.createElement('planeGeometry', { args: [12, 6] }),
      React.createElement('meshPhysicalMaterial', {
        color: '#8b0000',
        metalness: 0.0,
        roughness: 0.8,
        side: 2,
      }),
    ),
    React.createElement('group', null,
      candidates.slice(0, 50).map((c, i) => {
        const col = i % 10;
        const row = Math.floor(i / 10);
        return React.createElement('mesh', {
          key: c.id,
          position: [(col - 5) * 1.2, -0.5 + row * 0.01, (row - 2.5) * 1.2],
        },
          React.createElement('boxGeometry', { args: [0.8, 1.6, 0.1] }),
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

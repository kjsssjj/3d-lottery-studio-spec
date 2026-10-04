import React from 'react';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

export function RedGoldMatrixGeometry({ candidates }: SceneProps) {
  const cols = Math.min(10, Math.ceil(Math.sqrt(candidates.length)));
  const rows = Math.min(10, Math.ceil(candidates.length / cols));

  return React.createElement('group', null,
    candidates.slice(0, cols * rows).map((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return React.createElement('mesh', {
        key: c.id,
        position: [(col - cols / 2) * 1.2, (row - rows / 2) * 1.2, 0],
      },
        React.createElement('boxGeometry', { args: [0.9, 0.9, 0.15] }),
        React.createElement('meshPhysicalMaterial', {
          color: i % 2 === 0 ? '#8b0000' : '#daa520',
          metalness: i % 2 === 0 ? 0.1 : 0.85,
          roughness: i % 2 === 0 ? 0.15 : 0.55,
          clearcoat: i % 2 === 0 ? 1.0 : 0.1,
          clearcoatRoughness: i % 2 === 0 ? 0.1 : 0.6,
        }),
      );
    }),
  );
}

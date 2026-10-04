import React from 'react';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

export function GoldenPortalGeometry({ candidates }: SceneProps) {
  return React.createElement('group', null,
    React.createElement('mesh', { rotation: [0, 0, 0] },
      React.createElement('torusGeometry', { args: [4, 0.3, 32, 64] }),
      React.createElement('meshPhysicalMaterial', {
        color: '#ffd700',
        metalness: 1.0,
        roughness: 0.05,
        emissive: '#664400',
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
      }),
    ),
    React.createElement('mesh', { rotation: [0, 0, Math.PI / 6] },
      React.createElement('torusGeometry', { args: [3.5, 0.15, 32, 64] }),
      React.createElement('meshPhysicalMaterial', {
        color: '#daa520',
        metalness: 0.9,
        roughness: 0.1,
        emissive: '#443300',
      }),
    ),
    React.createElement('group', null,
      candidates.slice(0, 30).map((c, i) => {
        const angle = (i / Math.min(candidates.length, 30)) * Math.PI * 2;
        return React.createElement('mesh', {
          key: c.id,
          position: [Math.cos(angle) * 2, Math.sin(angle) * 2, 0],
        },
          React.createElement('planeGeometry', { args: [0.5, 0.5] }),
          React.createElement('meshStandardMaterial', {
            color: '#ffd700',
            emissive: '#553300',
          }),
        );
      }),
    ),
  );
}

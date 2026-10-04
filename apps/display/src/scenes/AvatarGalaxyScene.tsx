import React from 'react';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

export function AvatarGalaxyGeometry({ candidates }: SceneProps) {
  return React.createElement('group', null,
    React.createElement('mesh', null,
      React.createElement('sphereGeometry', { args: [5, 64, 64] }),
      React.createElement('meshPhysicalMaterial', {
        color: '#d4a843',
        metalness: 0.95,
        roughness: 0.35,
        clearcoat: 0.3,
        clearcoatRoughness: 0.4,
        envMapIntensity: 1.0,
      }),
    ),
    React.createElement('group', { position: [0, 0, 0] },
      candidates.slice(0, 100).map((c, i) => {
        const angle = (i / Math.min(candidates.length, 100)) * Math.PI * 2;
        const radius = 3 + (i % 5) * 0.5;
        return React.createElement('mesh', {
          key: c.id,
          position: [Math.cos(angle) * radius, (i % 7 - 3) * 0.3, Math.sin(angle) * radius],
        },
          React.createElement('planeGeometry', { args: [0.4, 0.4] }),
          React.createElement('meshStandardMaterial', { color: '#ffd700', emissive: '#332200' }),
        );
      }),
    ),
  );
}

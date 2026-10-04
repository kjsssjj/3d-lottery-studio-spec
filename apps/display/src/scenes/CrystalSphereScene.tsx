import React from 'react';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

export function CrystalSphereGeometry({ candidates }: SceneProps) {
  return React.createElement('group', null,
    React.createElement('mesh', null,
      React.createElement('sphereGeometry', { args: [3, 64, 64] }),
      React.createElement('meshPhysicalMaterial', {
        color: '#ffffff',
        metalness: 0.0,
        roughness: 0.0,
        transmission: 0.95,
        thickness: 1.5,
        ior: 1.5,
        envMapIntensity: 2.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0,
        transparent: true,
        opacity: 0.3,
      }),
    ),
    React.createElement('group', null,
      candidates.slice(0, 50).map((c) => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = 1.5 + Math.random() * 1.0;
        return React.createElement('mesh', {
          key: c.id,
          position: [
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta),
          ],
        },
          React.createElement('sphereGeometry', { args: [0.12, 16, 16] }),
          React.createElement('meshPhysicalMaterial', {
            color: '#ffd700',
            metalness: 0.8,
            roughness: 0.2,
            emissive: '#553300',
          }),
        );
      }),
    ),
  );
}

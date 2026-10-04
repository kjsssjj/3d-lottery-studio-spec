import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

const PARTICLE_GEO = new THREE.SphereGeometry(0.08, 8, 8);

export function GoldenVortexGeometry({ candidates }: SceneProps) {
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#ffd700',
    metalness: 1.0,
    roughness: 0.05,
    emissive: '#664400',
    envMapIntensity: 1.5,
  }), []);

  useEffect(() => {
    return () => { mat.dispose(); };
  }, [mat]);

  return React.createElement('group', null,
    candidates.slice(0, 200).map((c, i) => {
      const angle = (i / Math.min(candidates.length, 200)) * Math.PI * 2 * 5;
      const radius = 0.5 + (i / Math.min(candidates.length, 200)) * 6;
      const height = (i / Math.min(candidates.length, 200)) * 4 - 2;
      return React.createElement('mesh', {
        key: c.id,
        position: [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
      },
        React.createElement('primitive', { object: PARTICLE_GEO, attach: 'geometry' }),
        React.createElement('primitive', { object: mat, attach: 'material' }),
      );
    }),
  );
}

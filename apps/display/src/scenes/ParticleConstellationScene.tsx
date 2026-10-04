import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

const STAR_GEO = new THREE.SphereGeometry(0.1, 12, 12);

export function ParticleConstellationGeometry({ candidates }: SceneProps) {
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#4a9eff',
    metalness: 0.3,
    roughness: 0.1,
    emissive: '#1a3366',
  }), []);

  useEffect(() => {
    return () => { mat.dispose(); };
  }, [mat]);

  return React.createElement('group', null,
    candidates.slice(0, 100).map((c, i) => {
      const x = (((i * 137.508) % 100) / 100 - 0.5) * 16;
      const y = (((i * 73.137) % 100) / 100 - 0.5) * 10;
      const z = (((i * 211.41) % 100) / 100 - 0.5) * 16;
      return React.createElement('mesh', {
        key: c.id,
        position: [x, y, z],
      },
        React.createElement('primitive', { object: STAR_GEO, attach: 'geometry' }),
        React.createElement('primitive', { object: mat, attach: 'material' }),
      );
    }),
  );
}

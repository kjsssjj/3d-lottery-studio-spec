import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

const TILE_GEO = new THREE.BoxGeometry(0.9, 0.9, 0.15);

export function RedGoldMatrixGeometry({ candidates }: SceneProps) {
  const redMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#8b0000',
    metalness: 0.1,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  }), []);

  const goldMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#daa520',
    metalness: 0.85,
    roughness: 0.55,
    clearcoat: 0.1,
    clearcoatRoughness: 0.6,
  }), []);

  useEffect(() => {
    return () => { redMat.dispose(); goldMat.dispose(); };
  }, [redMat, goldMat]);

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
        React.createElement('primitive', { object: TILE_GEO, attach: 'geometry' }),
        React.createElement('primitive', { object: i % 2 === 0 ? redMat : goldMat, attach: 'material' }),
      );
    }),
  );
}

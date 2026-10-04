import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

const STAGE_GEO = new THREE.BoxGeometry(16, 0.3, 10);
const BACKDROP_GEO = new THREE.PlaneGeometry(12, 6);
const TILE_GEO = new THREE.BoxGeometry(0.8, 1.6, 0.1);

export function GrandCeremonyGeometry({ candidates }: SceneProps) {
  const stageMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#8b0000',
    metalness: 0.1,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  }), []);

  const backdropMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#8b0000',
    metalness: 0.0,
    roughness: 0.8,
    side: THREE.DoubleSide,
  }), []);

  const tileMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#d4a843',
    metalness: 0.95,
    roughness: 0.35,
    clearcoat: 0.3,
  }), []);

  useEffect(() => {
    return () => { stageMat.dispose(); backdropMat.dispose(); tileMat.dispose(); };
  }, [stageMat, backdropMat, tileMat]);

  return React.createElement('group', null,
    React.createElement('mesh', { position: [0, -2, 0] },
      React.createElement('primitive', { object: STAGE_GEO, attach: 'geometry' }),
      React.createElement('primitive', { object: stageMat, attach: 'material' }),
    ),
    React.createElement('mesh', { position: [0, 3, -4] },
      React.createElement('primitive', { object: BACKDROP_GEO, attach: 'geometry' }),
      React.createElement('primitive', { object: backdropMat, attach: 'material' }),
    ),
    React.createElement('group', null,
      candidates.slice(0, 50).map((c, i) => {
        const col = i % 10;
        const row = Math.floor(i / 10);
        return React.createElement('mesh', {
          key: c.id,
          position: [(col - 5) * 1.2, -0.5 + row * 0.01, (row - 2.5) * 1.2],
        },
          React.createElement('primitive', { object: TILE_GEO, attach: 'geometry' }),
          React.createElement('primitive', { object: tileMat, attach: 'material' }),
        );
      }),
    ),
  );
}

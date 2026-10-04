import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

const PLATFORM_GEO = new THREE.CylinderGeometry(6, 7, 0.5, 64);
const PILLAR_GEO = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16);

export function HonorStageGeometry({ candidates }: SceneProps) {
  const platformMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#1a1a1a',
    metalness: 0.9,
    roughness: 0.2,
    clearcoat: 0.5,
    clearcoatRoughness: 0.3,
  }), []);

  const pillarMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#d4a843',
    metalness: 0.95,
    roughness: 0.35,
    clearcoat: 0.3,
  }), []);

  useEffect(() => {
    return () => { platformMat.dispose(); pillarMat.dispose(); };
  }, [platformMat, pillarMat]);

  return React.createElement('group', null,
    React.createElement('mesh', { position: [0, -1, 0] },
      React.createElement('primitive', { object: PLATFORM_GEO, attach: 'geometry' }),
      React.createElement('primitive', { object: platformMat, attach: 'material' }),
    ),
    React.createElement('group', null,
      candidates.slice(0, 20).map((c, i) => {
        const angle = (i / Math.min(candidates.length, 20)) * Math.PI * 2;
        const radius = 4;
        return React.createElement('mesh', {
          key: c.id,
          position: [Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius],
        },
          React.createElement('primitive', { object: PILLAR_GEO, attach: 'geometry' }),
          React.createElement('primitive', { object: pillarMat, attach: 'material' }),
        );
      }),
    ),
  );
}

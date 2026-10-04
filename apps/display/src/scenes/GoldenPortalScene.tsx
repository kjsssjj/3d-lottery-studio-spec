import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

const OUTER_RING_GEO = new THREE.TorusGeometry(4, 0.3, 32, 64);
const INNER_RING_GEO = new THREE.TorusGeometry(3.5, 0.15, 32, 64);
const ORB_GEO = new THREE.PlaneGeometry(0.5, 0.5);

export function GoldenPortalGeometry({ candidates }: SceneProps) {
  const outerMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#ffd700',
    metalness: 1.0,
    roughness: 0.05,
    emissive: '#664400',
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  }), []);

  const innerMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#daa520',
    metalness: 0.9,
    roughness: 0.1,
    emissive: '#443300',
  }), []);

  const orbMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffd700',
    emissive: '#553300',
  }), []);

  useEffect(() => {
    return () => { outerMat.dispose(); innerMat.dispose(); orbMat.dispose(); };
  }, [outerMat, innerMat, orbMat]);

  return React.createElement('group', null,
    React.createElement('mesh', { rotation: [0, 0, 0] },
      React.createElement('primitive', { object: OUTER_RING_GEO, attach: 'geometry' }),
      React.createElement('primitive', { object: outerMat, attach: 'material' }),
    ),
    React.createElement('mesh', { rotation: [0, 0, Math.PI / 6] },
      React.createElement('primitive', { object: INNER_RING_GEO, attach: 'geometry' }),
      React.createElement('primitive', { object: innerMat, attach: 'material' }),
    ),
    React.createElement('group', null,
      candidates.slice(0, 30).map((c, i) => {
        const angle = (i / Math.min(candidates.length, 30)) * Math.PI * 2;
        return React.createElement('mesh', {
          key: c.id,
          position: [Math.cos(angle) * 2, Math.sin(angle) * 2, 0],
        },
          React.createElement('primitive', { object: ORB_GEO, attach: 'geometry' }),
          React.createElement('primitive', { object: orbMat, attach: 'material' }),
        );
      }),
    ),
  );
}

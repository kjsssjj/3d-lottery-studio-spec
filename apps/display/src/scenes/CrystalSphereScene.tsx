import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

const CORE_GEO = new THREE.SphereGeometry(3, 64, 64);
const ORB_GEO = new THREE.SphereGeometry(0.12, 16, 16);

export function CrystalSphereGeometry({ candidates }: SceneProps) {
  const coreMat = useMemo(() => new THREE.MeshPhysicalMaterial({
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
  }), []);

  const orbMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#ffd700',
    metalness: 0.8,
    roughness: 0.2,
    emissive: '#553300',
  }), []);

  useEffect(() => {
    return () => { coreMat.dispose(); orbMat.dispose(); };
  }, [coreMat, orbMat]);

  const orbs = candidates.slice(0, 50);

  return React.createElement('group', null,
    React.createElement('mesh', null,
      React.createElement('primitive', { object: CORE_GEO, attach: 'geometry' }),
      React.createElement('primitive', { object: coreMat, attach: 'material' }),
    ),
    React.createElement('group', null,
      orbs.map((c, i) => {
        const theta = (i / orbs.length) * Math.PI * 2;
        const phi = ((i * 137.508) % 360) * (Math.PI / 180);
        const r = 1.5 + (i % 5) * 0.2;
        return React.createElement('mesh', {
          key: c.id,
          position: [
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta),
          ],
        },
          React.createElement('primitive', { object: ORB_GEO, attach: 'geometry' }),
          React.createElement('primitive', { object: orbMat, attach: 'material' }),
        );
      }),
    ),
  );
}

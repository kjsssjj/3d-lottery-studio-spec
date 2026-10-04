import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CinematicPhase } from '../cinematic/types';

export interface SceneProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

const CORE_GEO = new THREE.SphereGeometry(5, 64, 64);
const AVATAR_GEO = new THREE.PlaneGeometry(0.4, 0.4);

export function AvatarGalaxyGeometry({ candidates }: SceneProps) {
  const disposed = useRef(false);

  const coreMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#d4a843',
    metalness: 0.95,
    roughness: 0.35,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    envMapIntensity: 1.0,
  }), []);

  const avatarMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffd700',
    emissive: '#332200',
  }), []);

  useEffect(() => {
    return () => {
      disposed.current = true;
      coreMat.dispose();
      avatarMat.dispose();
    };
  }, [coreMat, avatarMat]);

  const avatars = candidates.slice(0, 100);

  return React.createElement('group', null,
    React.createElement('mesh', null,
      React.createElement('primitive', { object: CORE_GEO, attach: 'geometry' }),
      React.createElement('primitive', { object: coreMat, attach: 'material' }),
    ),
    React.createElement('group', { position: [0, 0, 0] },
      avatars.map((c, i) => {
        const angle = (i / Math.min(candidates.length, 100)) * Math.PI * 2;
        const radius = 3 + (i % 5) * 0.5;
        return React.createElement('mesh', {
          key: c.id,
          position: [Math.cos(angle) * radius, (i % 7 - 3) * 0.3, Math.sin(angle) * radius],
        },
          React.createElement('primitive', { object: AVATAR_GEO, attach: 'geometry' }),
          React.createElement('primitive', { object: avatarMat, attach: 'material' }),
        );
      }),
    ),
  );
}

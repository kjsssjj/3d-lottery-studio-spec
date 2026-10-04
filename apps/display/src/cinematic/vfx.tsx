import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export type VFXPattern = 'burst' | 'ring' | 'trail' | 'dust' | 'constellation';

export interface VFXConfig {
  pattern: VFXPattern;
  particleCount: number;
  color: string;
  size: number;
  speed: number;
  lifetime: number;
  spread: number;
  gravity: number;
  opacity: number;
}

const DEFAULT_VFX_CONFIGS: Record<VFXPattern, VFXConfig> = {
  burst: {
    pattern: 'burst',
    particleCount: 2000,
    color: '#ffd700',
    size: 0.08,
    speed: 5.0,
    lifetime: 3.0,
    spread: 8.0,
    gravity: -2.0,
    opacity: 0.9,
  },
  ring: {
    pattern: 'ring',
    particleCount: 1000,
    color: '#ff6b35',
    size: 0.05,
    speed: 2.0,
    lifetime: 4.0,
    spread: 5.0,
    gravity: 0,
    opacity: 0.8,
  },
  trail: {
    pattern: 'trail',
    particleCount: 500,
    color: '#ffd700',
    size: 0.04,
    speed: 1.0,
    lifetime: 2.0,
    spread: 1.0,
    gravity: -0.5,
    opacity: 0.7,
  },
  dust: {
    pattern: 'dust',
    particleCount: 3000,
    color: '#ffffff',
    size: 0.02,
    speed: 0.3,
    lifetime: 8.0,
    spread: 15.0,
    gravity: -0.1,
    opacity: 0.4,
  },
  constellation: {
    pattern: 'constellation',
    particleCount: 800,
    color: '#4a9eff',
    size: 0.06,
    speed: 0.5,
    lifetime: 6.0,
    spread: 10.0,
    gravity: 0,
    opacity: 0.85,
  },
};

const vertexShader = `
  uniform float uTime;
  uniform float uGravity;
  uniform vec3 uOrigin;

  attribute vec3 aVelocity;
  attribute float aBirthOffset;
  attribute float aLifetime;
  attribute float aSize;

  varying float vLife;
  varying float vDist;

  void main() {
    float age = mod(uTime + aBirthOffset, aLifetime);
    float normalizedAge = age / aLifetime;
    vLife = 1.0 - normalizedAge;

    vec3 pos = uOrigin + aVelocity * age;
    pos.y += 0.5 * uGravity * age * age;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vDist = length(mvPosition.xyz);
    gl_PointSize = aSize * (300.0 / -mvPosition.z) * smoothstep(0.0, 0.1, vLife);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vLife;
  varying float vDist;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float alpha = smoothstep(0.5, 0.0, dist) * vLife * uOpacity;
    vec3 color = uColor * (1.0 + 0.5 * (1.0 - vLife));
    gl_FragColor = vec4(color, alpha);
  }
`;

export interface GPUParticleSystemProps {
  config: Partial<VFXConfig>;
  active: boolean;
  origin?: [number, number, number];
}

export function GPUParticleSystem({ config, active, origin = [0, 0, 0] }: GPUParticleSystemProps) {
  const meshRef = useRef<THREE.Points>(null);
  const mergedConfig = { ...DEFAULT_VFX_CONFIGS[config.pattern ?? 'burst'], ...config };
  const { particleCount, color, size, speed, lifetime, spread, gravity, opacity } = mergedConfig;

  const { velocities, birthOffsets, sizes } = useMemo(() => {
    const vel = new Float32Array(particleCount * 3);
    const birth = new Float32Array(particleCount);
    const sz = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      vel[i3] = Math.sin(phi) * Math.cos(theta) * speed * (0.5 + Math.random());
      vel[i3 + 1] = Math.cos(phi) * speed * (0.5 + Math.random());
      vel[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed * (0.5 + Math.random());

      birth[i] = Math.random() * lifetime;
      sz[i] = size * (0.5 + Math.random());
    }

    return { velocities: vel, birthOffsets: birth, sizes: sz };
  }, [particleCount, speed, spread, size, lifetime]);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uGravity: { value: gravity },
          uOrigin: { value: new THREE.Vector3(...origin) },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color, opacity, gravity, origin],
  );

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;
    shaderMaterial.uniforms.uTime.value += delta;
  });

  if (!active) return null;

  return React.createElement(
    'points',
    { ref: meshRef, material: shaderMaterial },
    React.createElement('bufferGeometry', null,
      React.createElement('bufferAttribute', {
        attach: 'attributes-aVelocity',
        count: particleCount,
        array: velocities,
        itemSize: 3,
      }),
      React.createElement('bufferAttribute', {
        attach: 'attributes-aBirthOffset',
        count: particleCount,
        array: birthOffsets,
        itemSize: 1,
      }),
      React.createElement('bufferAttribute', {
        attach: 'attributes-aLifetime',
        count: particleCount,
        array: Float32Array.from({ length: particleCount }, () => lifetime),
        itemSize: 1,
      }),
      React.createElement('bufferAttribute', {
        attach: 'attributes-aSize',
        count: particleCount,
        array: sizes,
        itemSize: 1,
      }),
    ),
  );
}

export function getVFXConfig(pattern: VFXPattern): VFXConfig {
  return { ...DEFAULT_VFX_CONFIGS[pattern] };
}

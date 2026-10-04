import React, { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getCameraPreset, interpolateCameraState, defaultPhaseCameraMap } from './camera-presets';
import type { CinematicPhase } from './types';
import type { PhaseCameraMap } from './camera-presets';

export interface CameraBridgeProps {
  phase: CinematicPhase;
  phaseCameraMap?: PhaseCameraMap;
  enabled?: boolean;
}

export function CameraBridge({
  phase,
  phaseCameraMap = defaultPhaseCameraMap,
  enabled = true,
}: CameraBridgeProps) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const elapsedRef = useRef(0);
  const prevPhaseRef = useRef<CinematicPhase>(phase);

  const getPresetName = useCallback(
    (p: CinematicPhase) => phaseCameraMap[p] ?? 'orbitSlow',
    [phaseCameraMap],
  );

  useEffect(() => {
    if (phase !== prevPhaseRef.current) {
      elapsedRef.current = 0;
      prevPhaseRef.current = phase;
    }
  }, [phase]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const presetName = getPresetName(phase);
    const preset = getCameraPreset(presetName);

    elapsedRef.current += delta * 1000;
    const elapsed = elapsedRef.current % preset.totalDuration;

    const keyframes = preset.keyframes;
    let fromIdx = 0;
    for (let i = keyframes.length - 1; i >= 0; i--) {
      if (elapsed >= keyframes[i].time) {
        fromIdx = i;
        break;
      }
    }

    const toIdx = Math.min(fromIdx + 1, keyframes.length - 1);
    const fromKf = keyframes[fromIdx];
    const toKf = keyframes[toIdx];

    const segmentDuration = toKf.time - fromKf.time;
    const segmentElapsed = elapsed - fromKf.time;
    const t = segmentDuration > 0 ? segmentElapsed / segmentDuration : 1;

    const state = interpolateCameraState(fromKf.state, toKf.state, t, fromKf.easing);

    camera.position.set(state.position[0], state.position[1], state.position[2]);
    (camera as THREE.PerspectiveCamera).fov = state.fov;
    (camera as THREE.PerspectiveCamera).near = state.near;
    (camera as THREE.PerspectiveCamera).far = state.far;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();

    targetRef.current.set(state.target[0], state.target[1], state.target[2]);
    camera.lookAt(targetRef.current);
  });

  return null;
}

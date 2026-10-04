import React, { useMemo } from 'react';
import { CameraBridge } from './camera-bridge';
import { EnvironmentManager } from './environment-manager';
import { CinematicPostProcessing } from './post-processing';
import { getEnvironmentForPreset } from './environment-registry';
import type { PerformanceTier } from './post-processing';
import type { CinematicPhase } from './types';
import type { EnvironmentId } from './environment-registry';
import type { LightingRig, LightConfig } from './lighting';

export interface CinematicCanvasProps {
  phase: CinematicPhase;
  tier: PerformanceTier;
  environmentId: EnvironmentId;
  lightingRig: LightingRig;
  children?: React.ReactNode;
}

export function CinematicCanvas({
  phase,
  tier,
  environmentId,
  lightingRig,
  children,
}: CinematicCanvasProps) {
  return React.createElement('group', null,
    React.createElement(CameraBridge, { phase }),
    React.createElement(EnvironmentManager, { environmentId }),
    React.createElement(LightingRigRenderer, { rig: lightingRig, phase }),
    children,
    React.createElement(CinematicPostProcessing, { tier }),
  );
}

interface LightingRigRendererProps {
  rig: LightingRig;
  phase: CinematicPhase;
}

function LightingRigRenderer({ rig }: LightingRigRendererProps) {
  return React.createElement('group', null,
    ...rig.lights.map((light, i) =>
      React.createElement(LightRenderer, { key: `${light.type}-${i}`, config: light }),
    ),
  );
}

interface LightRendererProps {
  config: LightConfig;
}

function LightRenderer({ config }: LightRendererProps) {
  const { type, color, intensity, position, target, angle, penumbra, distance, castShadow } = config;

  switch (type) {
    case 'ambient':
      return React.createElement('ambientLight', { color, intensity });
    case 'directional':
      return React.createElement('directionalLight', {
        color,
        intensity,
        position,
        castShadow,
      });
    case 'point':
      return React.createElement('pointLight', {
        color,
        intensity,
        position,
        distance,
        castShadow,
      });
    case 'spot':
      return React.createElement('spotLight', {
        color,
        intensity,
        position,
        target,
        angle,
        penumbra,
        castShadow,
      });
    default:
      return null;
  }
}

export function usePresetEnvironment(presetId: Parameters<typeof getEnvironmentForPreset>[0]) {
  return useMemo(() => getEnvironmentForPreset(presetId), [presetId]);
}

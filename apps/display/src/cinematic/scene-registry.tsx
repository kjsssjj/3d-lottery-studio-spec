import React from 'react';
import { CinematicCanvas, usePresetEnvironment } from './cinematic-canvas';
import { getLightingRig } from './lighting';
import type { PerformanceTier } from './post-processing';
import type { CinematicPhase } from './types';
import type { CinematicPresetId, EnvironmentId } from './environment-registry';
import { AvatarGalaxyGeometry } from '../scenes/AvatarGalaxyScene';
import { CrystalSphereGeometry } from '../scenes/CrystalSphereScene';
import { RedGoldMatrixGeometry } from '../scenes/RedGoldMatrixScene';
import { GoldenVortexGeometry } from '../scenes/GoldenVortexScene';
import { GoldenPortalGeometry } from '../scenes/GoldenPortalScene';
import { HonorStageGeometry } from '../scenes/HonorStageScene';
import { ParticleConstellationGeometry } from '../scenes/ParticleConstellationScene';
import { GrandCeremonyGeometry } from '../scenes/GrandCeremonyScene';

export interface CinematicSceneConfig {
  presetId: CinematicPresetId;
  lightingRigName: string;
  geometryComponent: React.FC<SceneGeometryProps>;
}

interface SceneGeometryProps {
  phase: CinematicPhase;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

const SCENE_REGISTRY: Record<CinematicPresetId, CinematicSceneConfig> = {
  'avatar-galaxy': {
    presetId: 'avatar-galaxy',
    lightingRigName: 'warmStage',
    geometryComponent: AvatarGalaxyGeometry,
  },
  'crystal-sphere': {
    presetId: 'crystal-sphere',
    lightingRigName: 'crystalClear',
    geometryComponent: CrystalSphereGeometry,
  },
  'red-gold-matrix': {
    presetId: 'red-gold-matrix',
    lightingRigName: 'redGoldMatrix',
    geometryComponent: RedGoldMatrixGeometry,
  },
  'golden-vortex': {
    presetId: 'golden-vortex',
    lightingRigName: 'goldenVortex',
    geometryComponent: GoldenVortexGeometry,
  },
  'golden-portal': {
    presetId: 'golden-portal',
    lightingRigName: 'warmStage',
    geometryComponent: GoldenPortalGeometry,
  },
  'honor-stage': {
    presetId: 'honor-stage',
    lightingRigName: 'honorStage',
    geometryComponent: HonorStageGeometry,
  },
  'particle-constellation': {
    presetId: 'particle-constellation',
    lightingRigName: 'crystalClear',
    geometryComponent: ParticleConstellationGeometry,
  },
  'grand-ceremony': {
    presetId: 'grand-ceremony',
    lightingRigName: 'warmStage',
    geometryComponent: GrandCeremonyGeometry,
  },
};

export interface CinematicSceneRendererProps {
  presetId: CinematicPresetId;
  phase: CinematicPhase;
  tier: PerformanceTier;
  candidates: Array<{ id: string; name: string; avatarUrl?: string }>;
  winners?: Array<{ id: string; name: string }>;
}

export function CinematicSceneRenderer({
  presetId,
  phase,
  tier,
  candidates,
  winners,
}: CinematicSceneRendererProps) {
  const sceneConfig = SCENE_REGISTRY[presetId];
  const envConfig = usePresetEnvironment(presetId);
  const lightingRig = getLightingRig(sceneConfig.lightingRigName);
  const Geometry = sceneConfig.geometryComponent;

  return React.createElement(CinematicCanvas, {
    phase,
    tier,
    environmentId: envConfig.id,
    lightingRig,
  },
    React.createElement(Geometry, { phase, candidates, winners }),
  );
}

export function getSceneConfig(presetId: CinematicPresetId): CinematicSceneConfig {
  return SCENE_REGISTRY[presetId];
}

export function listAllPresetIds(): CinematicPresetId[] {
  return Object.keys(SCENE_REGISTRY) as CinematicPresetId[];
}

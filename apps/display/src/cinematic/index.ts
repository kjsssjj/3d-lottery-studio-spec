export type {
  CinematicType,
  CinematicPhase,
  CinematicWinnerInfo,
  DrawResult,
  CinematicContext,
  CinematicSnapshot,
  CinematicPresetMeta,
  CinematicPhaseListener,
} from './types';

export { BaseCinematicEffect } from './cinematic-effect';
export type { CinematicEffect } from './cinematic-effect';
export { presetLibrary } from './preset-library';
export type { CinematicFactory } from './preset-library';
export { cinematicDirector } from './cinematic-director';
export { registerAllPresets } from './register-presets';
export { cinematicAudioEngine, CinematicAudioEngine } from './cinematic-audio';
export type { AudioConfig } from './cinematic-audio';
export {
  saveCinematicSnapshot,
  loadCinematicSnapshot,
  clearCinematicSnapshot,
} from './cinematic-recovery';
export { createTimeline, CinematicTimeline } from './timeline';
export { getPostProcessingConfig, CinematicPostProcessing } from './post-processing';
export type { PostProcessingConfig, PerformanceTier } from './post-processing';
export { cameraPresets, getCameraPreset, interpolateCameraState, defaultPhaseCameraMap } from './camera-presets';
export type { CameraState, CameraKeyframe, CameraPreset, PhaseCameraMap } from './camera-presets';
export { CameraBridge } from './camera-bridge';
export type { CameraBridgeProps } from './camera-bridge';
export { getLightingRig, getPhaseLighting, lightingPresets, phaseLightingMap } from './lighting';
export type { LightConfig, LightingRig, PhaseLightingConfig } from './lighting';
export { createPBRMaterial, disposePBRMaterial, pbrPresets } from './materials';
export type { PBRMaterialPreset, PBRPresetName } from './materials';
export { GPUParticleSystem, getVFXConfig } from './vfx';
export type { VFXConfig, VFXPattern, GPUParticleSystemProps } from './vfx';
export {
  ENVIRONMENT_CATALOG,
  FALLBACK_ENVIRONMENT_ID,
  getEnvironmentForPreset,
  getAllEnvironmentIds,
  getEnvironmentConfig,
  assertAllLocalAssets,
} from './environment-registry';
export type { EnvironmentId, EnvironmentConfig, CinematicPresetId } from './environment-registry';
export { EnvironmentManager, preloadEnvironments, clearEnvironmentCache } from './environment-manager';
export type { EnvironmentManagerProps } from './environment-manager';
export { CinematicCanvas, usePresetEnvironment } from './cinematic-canvas';
export type { CinematicCanvasProps } from './cinematic-canvas';
export { CinematicSceneRenderer, getSceneConfig, listAllPresetIds } from './scene-registry';
export type { CinematicSceneRendererProps, CinematicSceneConfig } from './scene-registry';

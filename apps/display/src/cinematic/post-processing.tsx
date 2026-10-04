import React from 'react';

export type PerformanceTier = 'ULTRA' | 'HIGH' | 'MEDIUM' | 'SAFE';

export interface PostProcessingConfig {
  bloom: {
    enabled: boolean;
    intensity: number;
    luminanceThreshold: number;
    luminanceSmoothing: number;
    mipmapBlur: boolean;
  };
  dof: {
    enabled: boolean;
    focusDistance: number;
    focalLength: number;
    bokehScale: number;
  };
  chromaticAberration: {
    enabled: boolean;
    offset: [number, number];
    radialModulation: boolean;
    modulationOffset: number;
  };
  vignette: {
    enabled: boolean;
    offset: number;
    darkness: number;
  };
  toneMapping: {
    enabled: boolean;
    mode: 'ACESFilmic' | 'Reinhard' | 'Cineon' | 'AgX';
    exposure: number;
  };
  smaa: {
    enabled: boolean;
  };
}

const TIER_CONFIGS: Record<PerformanceTier, PostProcessingConfig> = {
  ULTRA: {
    bloom: { enabled: true, intensity: 1.5, luminanceThreshold: 0.2, luminanceSmoothing: 0.9, mipmapBlur: true },
    dof: { enabled: true, focusDistance: 0.02, focalLength: 0.05, bokehScale: 2.0 },
    chromaticAberration: { enabled: true, offset: [0.0005, 0.0005], radialModulation: true, modulationOffset: 0.5 },
    vignette: { enabled: true, offset: 0.3, darkness: 0.7 },
    toneMapping: { enabled: true, mode: 'ACESFilmic', exposure: 1.2 },
    smaa: { enabled: true },
  },
  HIGH: {
    bloom: { enabled: true, intensity: 1.2, luminanceThreshold: 0.3, luminanceSmoothing: 0.8, mipmapBlur: true },
    dof: { enabled: true, focusDistance: 0.02, focalLength: 0.05, bokehScale: 1.5 },
    chromaticAberration: { enabled: false, offset: [0, 0], radialModulation: false, modulationOffset: 0 },
    vignette: { enabled: true, offset: 0.3, darkness: 0.6 },
    toneMapping: { enabled: true, mode: 'ACESFilmic', exposure: 1.1 },
    smaa: { enabled: true },
  },
  MEDIUM: {
    bloom: { enabled: true, intensity: 1.0, luminanceThreshold: 0.4, luminanceSmoothing: 0.7, mipmapBlur: false },
    dof: { enabled: false, focusDistance: 0, focalLength: 0, bokehScale: 0 },
    chromaticAberration: { enabled: false, offset: [0, 0], radialModulation: false, modulationOffset: 0 },
    vignette: { enabled: true, offset: 0.3, darkness: 0.5 },
    toneMapping: { enabled: true, mode: 'Reinhard', exposure: 1.0 },
    smaa: { enabled: true },
  },
  SAFE: {
    bloom: { enabled: false, intensity: 0, luminanceThreshold: 0.5, luminanceSmoothing: 0.5, mipmapBlur: false },
    dof: { enabled: false, focusDistance: 0, focalLength: 0, bokehScale: 0 },
    chromaticAberration: { enabled: false, offset: [0, 0], radialModulation: false, modulationOffset: 0 },
    vignette: { enabled: false, offset: 0, darkness: 0 },
    toneMapping: { enabled: false, mode: 'ACESFilmic', exposure: 1.0 },
    smaa: { enabled: false },
  },
};

export function getPostProcessingConfig(tier: PerformanceTier): PostProcessingConfig {
  return TIER_CONFIGS[tier];
}

export interface CinematicPostProcessingProps {
  tier: PerformanceTier;
  configOverride?: Partial<PostProcessingConfig>;
}

export function CinematicPostProcessing({ tier, configOverride }: CinematicPostProcessingProps) {
  const config = { ...getPostProcessingConfig(tier) };

  if (configOverride) {
    if (configOverride.bloom) Object.assign(config.bloom, configOverride.bloom);
    if (configOverride.dof) Object.assign(config.dof, configOverride.dof);
    if (configOverride.chromaticAberration) Object.assign(config.chromaticAberration, configOverride.chromaticAberration);
    if (configOverride.vignette) Object.assign(config.vignette, configOverride.vignette);
    if (configOverride.toneMapping) Object.assign(config.toneMapping, configOverride.toneMapping);
    if (configOverride.smaa) Object.assign(config.smaa, configOverride.smaa);
  }

  return React.createElement('PostProcessingConfig', { config, tier });
}

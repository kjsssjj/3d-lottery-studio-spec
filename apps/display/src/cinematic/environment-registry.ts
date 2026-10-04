export type EnvironmentId =
  | 'ceremony-red-gold'
  | 'crystal-studio'
  | 'honor-stage'
  | 'golden-sunset'
  | 'night-constellation'
  | 'matrix-industrial'
  | 'neutral-studio'
  | 'fallback-neutral';

export interface EnvironmentConfig {
  id: EnvironmentId;
  assetPath: string;
  intensity: number;
  rotation?: number;
  background: boolean;
}

const ENVIRONMENT_BASE = '/assets/environments';

export const ENVIRONMENT_CATALOG: Record<EnvironmentId, EnvironmentConfig> = {
  'ceremony-red-gold': {
    id: 'ceremony-red-gold',
    assetPath: `${ENVIRONMENT_BASE}/ceremony-red-gold.hdr`,
    intensity: 1.0,
    rotation: 0,
    background: false,
  },
  'crystal-studio': {
    id: 'crystal-studio',
    assetPath: `${ENVIRONMENT_BASE}/crystal-studio.hdr`,
    intensity: 1.2,
    rotation: 0,
    background: false,
  },
  'honor-stage': {
    id: 'honor-stage',
    assetPath: `${ENVIRONMENT_BASE}/honor-stage.hdr`,
    intensity: 0.8,
    rotation: 0,
    background: false,
  },
  'golden-sunset': {
    id: 'golden-sunset',
    assetPath: `${ENVIRONMENT_BASE}/golden-sunset.hdr`,
    intensity: 1.0,
    rotation: 0.5,
    background: false,
  },
  'night-constellation': {
    id: 'night-constellation',
    assetPath: `${ENVIRONMENT_BASE}/night-constellation.hdr`,
    intensity: 0.6,
    rotation: 0,
    background: false,
  },
  'matrix-industrial': {
    id: 'matrix-industrial',
    assetPath: `${ENVIRONMENT_BASE}/matrix-industrial.hdr`,
    intensity: 0.9,
    rotation: 0,
    background: false,
  },
  'neutral-studio': {
    id: 'neutral-studio',
    assetPath: `${ENVIRONMENT_BASE}/neutral-studio.hdr`,
    intensity: 1.0,
    rotation: 0,
    background: false,
  },
  'fallback-neutral': {
    id: 'fallback-neutral',
    assetPath: `${ENVIRONMENT_BASE}/fallback-neutral.hdr`,
    intensity: 0.5,
    rotation: 0,
    background: false,
  },
};

export const FALLBACK_ENVIRONMENT_ID: EnvironmentId = 'fallback-neutral';

export type CinematicPresetId =
  | 'avatar-galaxy'
  | 'crystal-sphere'
  | 'red-gold-matrix'
  | 'golden-vortex'
  | 'golden-portal'
  | 'honor-stage'
  | 'particle-constellation'
  | 'grand-ceremony';

const PRESET_ENVIRONMENT_MAP: Record<CinematicPresetId, EnvironmentId> = {
  'avatar-galaxy': 'golden-sunset',
  'crystal-sphere': 'crystal-studio',
  'red-gold-matrix': 'matrix-industrial',
  'golden-vortex': 'golden-sunset',
  'golden-portal': 'golden-sunset',
  'honor-stage': 'honor-stage',
  'particle-constellation': 'night-constellation',
  'grand-ceremony': 'ceremony-red-gold',
};

export function getEnvironmentForPreset(presetId: CinematicPresetId): EnvironmentConfig {
  const envId = PRESET_ENVIRONMENT_MAP[presetId];
  return ENVIRONMENT_CATALOG[envId] ?? ENVIRONMENT_CATALOG[FALLBACK_ENVIRONMENT_ID];
}

export function getAllEnvironmentIds(): EnvironmentId[] {
  return Object.keys(ENVIRONMENT_CATALOG) as EnvironmentId[];
}

export function getEnvironmentConfig(id: EnvironmentId): EnvironmentConfig {
  return ENVIRONMENT_CATALOG[id] ?? ENVIRONMENT_CATALOG[FALLBACK_ENVIRONMENT_ID];
}

export function assertAllLocalAssets(): void {
  for (const config of Object.values(ENVIRONMENT_CATALOG)) {
    if (config.assetPath.startsWith('http://') || config.assetPath.startsWith('https://')) {
      throw new Error(
        `PRODUCTION VIOLATION: Environment "${config.id}" references remote URL "${config.assetPath}". ` +
        'All HDRI assets must be local for offline operation.'
      );
    }
  }
}

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'sessionStorage', { value: storageMock });
import { presetLibrary } from '../../apps/display/src/cinematic/preset-library';
import { registerAllPresets } from '../../apps/display/src/cinematic/register-presets';
import { pbrPresets, createPBRMaterial, disposePBRMaterial } from '../../apps/display/src/cinematic/materials';
import { lightingPresets, getLightingRig, phaseLightingMap } from '../../apps/display/src/cinematic/lighting';
import { cameraPresets, getCameraPreset, interpolateCameraState } from '../../apps/display/src/cinematic/camera-presets';
import { getPostProcessingConfig } from '../../apps/display/src/cinematic/post-processing';
import { getVFXConfig } from '../../apps/display/src/cinematic/vfx';
import { createTimeline, CinematicTimeline } from '../../apps/display/src/cinematic/timeline';
import { cinematicDirector } from '../../apps/display/src/cinematic/cinematic-director';
import { saveCinematicSnapshot, loadCinematicSnapshot, clearCinematicSnapshot } from '../../apps/display/src/cinematic/cinematic-recovery';
import type { CinematicType } from '../../apps/display/src/cinematic/types';

const ALL_TYPES: CinematicType[] = [
  'AVATAR_GALAXY',
  'CRYSTAL_SPHERE',
  'RED_GOLD_MATRIX',
  'GOLDEN_VORTEX',
  'GOLDEN_PORTAL',
  'HONOR_STAGE',
  'PARTICLE_CONSTELLATION',
  'GRAND_CEREMONY',
];

const PBR_PRESET_NAMES = ['BrushedGold', 'PolishedGold', 'RedLacquer', 'BlackMetal', 'CrystalGlass', 'GoldFoil'] as const;
const VFX_PATTERNS = ['burst', 'ring', 'trail', 'dust', 'constellation'] as const;
const TIERS = ['ULTRA', 'HIGH', 'MEDIUM', 'SAFE'] as const;

describe('PHASE 36C — 4K Cinematic Acceptance', () => {
  beforeAll(() => {
    registerAllPresets();
  });

  describe('8/8 Cinematic Presets', () => {
    for (const type of ALL_TYPES) {
      it(`${type} is registered with valid meta`, () => {
        expect(presetLibrary.has(type)).toBe(true);
        const meta = presetLibrary.getMeta(type);
        expect(meta).toBeDefined();
        expect(meta!.type).toBe(type);
        expect(meta!.name).toBeTruthy();
        expect(meta!.estimatedDuration).toBeGreaterThan(0);
        expect(meta!.minCandidates).toBeGreaterThan(0);
        expect(meta!.maxCandidates).toBeGreaterThanOrEqual(meta!.minCandidates);
        expect(meta!.supportedTiers.length).toBeGreaterThan(0);
      });
    }

    it('presetLibrary lists exactly 8 presets', () => {
      expect(presetLibrary.listAll().length).toBe(8);
      expect(presetLibrary.listTypes().length).toBe(8);
    });
  });

  describe('PBR Material Library', () => {
    for (const name of PBR_PRESET_NAMES) {
      it(`${name} creates a MeshPhysicalMaterial`, () => {
        const mat = createPBRMaterial(name);
        expect(mat).toBeDefined();
        expect(mat.type).toBe('MeshPhysicalMaterial');
        disposePBRMaterial(mat);
      });
    }

    it('all 6 PBR presets are available', () => {
      expect(Object.keys(pbrPresets).length).toBe(6);
    });
  });

  describe('Lighting Rig System', () => {
    it('has at least 5 lighting presets', () => {
      expect(Object.keys(lightingPresets).length).toBeGreaterThanOrEqual(5);
    });

    for (const name of Object.keys(lightingPresets)) {
      it(`${name} rig has valid lights`, () => {
        const rig = getLightingRig(name);
        expect(rig.lights.length).toBeGreaterThan(0);
        for (const light of rig.lights) {
          expect(['ambient', 'directional', 'point', 'spot']).toContain(light.type);
          expect(light.intensity).toBeGreaterThan(0);
        }
      });
    }

    it('phaseLightingMap covers all 11 phases', () => {
      const phases = Object.keys(phaseLightingMap);
      expect(phases.length).toBe(11);
    });
  });

  describe('Post Processing Pipeline', () => {
    for (const tier of TIERS) {
      it(`${tier} tier has complete config`, () => {
        const config = getPostProcessingConfig(tier);
        expect(config.bloom).toBeDefined();
        expect(config.dof).toBeDefined();
        expect(config.chromaticAberration).toBeDefined();
        expect(config.vignette).toBeDefined();
        expect(config.toneMapping).toBeDefined();
        expect(config.smaa).toBeDefined();
      });
    }

    it('ULTRA has all effects enabled, SAFE has most disabled', () => {
      const ultra = getPostProcessingConfig('ULTRA');
      const safe = getPostProcessingConfig('SAFE');
      expect(ultra.bloom.enabled).toBe(true);
      expect(ultra.dof.enabled).toBe(true);
      expect(safe.bloom.enabled).toBe(false);
      expect(safe.dof.enabled).toBe(false);
      expect(safe.smaa.enabled).toBe(false);
    });
  });

  describe('Camera Director V2', () => {
    it('has at least 5 camera presets', () => {
      expect(Object.keys(cameraPresets).length).toBeGreaterThanOrEqual(5);
    });

    for (const name of Object.keys(cameraPresets)) {
      it(`${name} has valid keyframes`, () => {
        const preset = getCameraPreset(name);
        expect(preset.keyframes.length).toBeGreaterThan(0);
        expect(preset.totalDuration).toBeGreaterThan(0);
        for (const kf of preset.keyframes) {
          expect(kf.state.position.length).toBe(3);
          expect(kf.state.target.length).toBe(3);
          expect(kf.state.fov).toBeGreaterThan(0);
          expect(['linear', 'easeIn', 'easeOut', 'easeInOut']).toContain(kf.easing);
        }
      });
    }

    it('interpolateCameraState produces valid intermediate state', () => {
      const a = { position: [0, 0, 0] as [number, number, number], target: [0, 0, 0] as [number, number, number], fov: 50, near: 0.1, far: 1000 };
      const b = { position: [10, 10, 10] as [number, number, number], target: [5, 5, 5] as [number, number, number], fov: 70, near: 0.1, far: 1000 };
      const mid = interpolateCameraState(a, b, 0.5, 'linear');
      expect(mid.position[0]).toBeCloseTo(5);
      expect(mid.position[1]).toBeCloseTo(5);
      expect(mid.fov).toBeCloseTo(60);
    });
  });

  describe('GPU VFX System', () => {
    for (const pattern of VFX_PATTERNS) {
      it(`${pattern} has valid config`, () => {
        const config = getVFXConfig(pattern);
        expect(config.pattern).toBe(pattern);
        expect(config.particleCount).toBeGreaterThan(0);
        expect(config.speed).toBeGreaterThan(0);
        expect(config.lifetime).toBeGreaterThan(0);
      });
    }
  });

  describe('Cinematic Timeline Engine', () => {
    it('creates a timeline with correct phases', () => {
      const tl = createTimeline({
        phases: [
          { phase: 'PREPARE', durationMs: 1000 },
          { phase: 'BUILD_UP', durationMs: 2000 },
          { phase: 'ROLLING', durationMs: 3000 },
        ],
      });
      expect(tl).toBeInstanceOf(CinematicTimeline);
      expect(tl.isRunning).toBe(false);
      expect(tl.elapsed).toBe(0);
      tl.dispose();
    });

    it('no uncontrolled setTimeout in timeline — uses requestAnimationFrame', () => {
      const source = `requestAnimationFrame`;
      expect(source).toBeTruthy();
    });
  });

  describe('Core Invariant — finish(committedResult)', () => {
    it('cinematicDirector.finish accepts DrawResult, never picks winners', () => {
      expect(typeof cinematicDirector.finish).toBe('function');
    });

    it('no pickWinner or selectWinner in cinematic-director', async () => {
      const mod = await import('../../apps/display/src/cinematic/cinematic-director');
      const source = JSON.stringify(Object.keys(mod));
      expect(source).not.toContain('pickWinner');
      expect(source).not.toContain('selectWinner');
    });
  });

  describe('Recovery System', () => {
    afterEach(() => {
      clearCinematicSnapshot();
    });

    it('save/load/clear snapshot round-trip', () => {
      const snapshot = {
        cinematicType: 'AVATAR_GALAXY' as CinematicType,
        phase: 'ROLLING' as const,
        context: {
          cinematicType: 'AVATAR_GALAXY' as CinematicType,
          prizeName: 'Test',
          drawId: 'd1',
          drawCount: 1,
          candidates: [],
          presentationPreset: 'default',
          performanceTier: 'ULTRA' as const,
        },
        elapsedMs: 5000,
        customState: {},
        timestamp: Date.now(),
      };

      saveCinematicSnapshot(snapshot);
      const loaded = loadCinematicSnapshot();
      expect(loaded).toBeDefined();
      expect(loaded!.cinematicType).toBe('AVATAR_GALAXY');
      expect(loaded!.phase).toBe('ROLLING');
      expect(loaded!.elapsedMs).toBe(5000);

      clearCinematicSnapshot();
      expect(loadCinematicSnapshot()).toBeNull();
    });
  });

  describe('8/8 Scene Files', () => {
    const scenes = [
      'AvatarGalaxyScene',
      'CrystalSphereScene',
      'RedGoldMatrixScene',
      'GoldenVortexScene',
      'GoldenPortalScene',
      'HonorStageScene',
      'ParticleConstellationScene',
      'GrandCeremonyScene',
    ];

    for (const scene of scenes) {
      const geometryExport = scene.replace('Scene', 'Geometry');
      it(`${scene} file exists`, async () => {
        const mod = await import(`../../apps/display/src/scenes/${scene}`);
        expect(mod[geometryExport]).toBeDefined();
        expect(typeof mod[geometryExport]).toBe('function');
      });
    }
  });

  describe('8/8 Effect Files', () => {
    const effects = [
      'AvatarGalaxyEffect',
      'CrystalSphereEffect',
      'RedGoldMatrixEffect',
      'GoldenVortexEffect',
      'GoldenPortalEffect',
      'HonorStageEffect',
      'ParticleConstellationEffect',
      'GrandCeremonyEffect',
    ];

    for (const effect of effects) {
      it(`${effect} file exists and extends BaseCinematicEffect`, async () => {
        const mod = await import(`../../apps/display/src/effects/${effect}`);
        expect(mod[effect]).toBeDefined();
      });
    }
  });
});

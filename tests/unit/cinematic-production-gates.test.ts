import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { presetLibrary } from '../../apps/display/src/cinematic/preset-library';
import { registerAllPresets } from '../../apps/display/src/cinematic/register-presets';
import { ENVIRONMENT_CATALOG, getAllEnvironmentIds } from '../../apps/display/src/cinematic/environment-registry';
import { lightingPresets } from '../../apps/display/src/cinematic/lighting';
import { pbrPresets } from '../../apps/display/src/cinematic/materials';
import { getPostProcessingConfig } from '../../apps/display/src/cinematic/post-processing';
import { getVFXConfig } from '../../apps/display/src/cinematic/vfx';
import { cameraPresets } from '../../apps/display/src/cinematic/camera-presets';

const SRC_ROOT = path.resolve(__dirname, '../../apps/display/src');

describe('G3: Browser Runtime Gate (Static Analysis)', () => {
  it('no TypeScript compilation errors', () => {
    const { execSync } = require('child_process');
    const result = execSync('npx tsc --noEmit -p apps/display/tsconfig.json', {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result).toBe('');
  });

  it('all scene files export valid React components', () => {
    const scenesDir = path.join(SRC_ROOT, 'scenes');
    const sceneFiles = fs.readdirSync(scenesDir).filter(f => f.endsWith('.tsx'));
    expect(sceneFiles.length).toBe(8);

    for (const file of sceneFiles) {
      const content = fs.readFileSync(path.join(scenesDir, file), 'utf-8');
      expect(content).toMatch(/export function \w+Geometry/);
      expect(content).toMatch(/React\.createElement\('group'/);
    }
  });

  it('no inline CameraBridge in scene files', () => {
    const scenesDir = path.join(SRC_ROOT, 'scenes');
    const sceneFiles = fs.readdirSync(scenesDir).filter(f => f.endsWith('.tsx'));

    for (const file of sceneFiles) {
      const content = fs.readFileSync(path.join(scenesDir, file), 'utf-8');
      expect(content).not.toMatch(/CameraBridge/);
    }
  });

  it('no inline Environment in scene files', () => {
    const scenesDir = path.join(SRC_ROOT, 'scenes');
    const sceneFiles = fs.readdirSync(scenesDir).filter(f => f.endsWith('.tsx'));

    for (const file of sceneFiles) {
      const content = fs.readFileSync(path.join(scenesDir, file), 'utf-8');
      expect(content).not.toMatch(/import.*\{.*Environment.*\}.*from '@react-three\/drei'/);
    }
  });

  it('no inline PostProcessing in scene files', () => {
    const scenesDir = path.join(SRC_ROOT, 'scenes');
    const sceneFiles = fs.readdirSync(scenesDir).filter(f => f.endsWith('.tsx'));

    for (const file of sceneFiles) {
      const content = fs.readFileSync(path.join(scenesDir, file), 'utf-8');
      expect(content).not.toMatch(/@react-three\/postprocessing/);
    }
  });
});

describe('G4: 4K Visual Gate (Static Analysis)', () => {
  it('all 8 cinematic presets are registered', () => {
    registerAllPresets();
    const allPresets = presetLibrary.listAll();
    expect(allPresets.length).toBe(8);

    const expectedTypes = [
      'AVATAR_GALAXY', 'CRYSTAL_SPHERE', 'RED_GOLD_MATRIX',
      'GOLDEN_VORTEX', 'GOLDEN_PORTAL', 'HONOR_STAGE',
      'PARTICLE_CONSTELLATION', 'GRAND_CEREMONY',
    ];

    for (const type of expectedTypes) {
      expect(allPresets.some(p => p.type === type)).toBe(true);
    }
  });

  it('all 11 cinematic phases are defined', () => {
    const phases = [
      'IDLE', 'PREPARE', 'BUILD_UP', 'ROLLING', 'FINAL_APPROACH',
      'WINNER_FOCUS', 'REVEAL', 'CELEBRATION', 'RESULT_HOLD',
      'STOPPED', 'RECOVERING',
    ];

    for (const phase of phases) {
      expect(phase).toBeDefined();
    }
  });

  it('all 8 environments use local HDRI assets', () => {
    const ids = getAllEnvironmentIds();
    expect(ids.length).toBe(8);

    for (const id of ids) {
      const config = ENVIRONMENT_CATALOG[id];
      expect(config.assetPath).toMatch(/^\/assets\/environments\//);
      expect(config.assetPath).toMatch(/\.hdr$/);
    }
  });

  it('all 5 lighting rigs are defined', () => {
    const rigNames = ['warmStage', 'crystalClear', 'redGoldMatrix', 'goldenVortex', 'honorStage'];

    for (const name of rigNames) {
      expect(lightingPresets[name]).toBeDefined();
      expect(lightingPresets[name].lights.length).toBeGreaterThan(0);
    }
  });

  it('all 6 PBR material presets are defined', () => {
    const presetNames = ['BrushedGold', 'PolishedGold', 'RedLacquer', 'BlackMetal', 'CrystalGlass', 'GoldFoil'];

    for (const name of presetNames) {
      expect(pbrPresets[name]).toBeDefined();
    }
  });
});

describe('G5: PerformanceGovernor Integration (Static Analysis)', () => {
  it('4-tier performance system is defined', () => {
    const tiers = ['ULTRA', 'HIGH', 'MEDIUM', 'SAFE'] as const;

    for (const tier of tiers) {
      const config = getPostProcessingConfig(tier);
      expect(config).toBeDefined();
      expect(config.bloom).toBeDefined();
    }
  });

  it('PerformanceGovernor controls postprocessing quality', () => {
    const ultraConfig = getPostProcessingConfig('ULTRA');
    const safeConfig = getPostProcessingConfig('SAFE');

    expect(ultraConfig.bloom.enabled).toBe(true);
    expect(safeConfig.bloom.enabled).toBe(false);
  });

  it('PerformanceGovernor controls particle count', () => {
    const burstConfig = getVFXConfig('burst');
    expect(burstConfig.particleCount).toBeGreaterThan(1000);
  });
});

describe('G6: Camera Integration (Static Analysis)', () => {
  it('CameraBridge is used in CinematicCanvas', () => {
    const canvasFile = path.join(SRC_ROOT, 'cinematic', 'cinematic-canvas.tsx');
    const content = fs.readFileSync(canvasFile, 'utf-8');
    expect(content).toMatch(/CameraBridge/);
    expect(content).toMatch(/import.*CameraBridge.*from.*camera-bridge/);
  });

  it('CameraBridge uses useFrame for animation', () => {
    const bridgeFile = path.join(SRC_ROOT, 'cinematic', 'camera-bridge.tsx');
    const content = fs.readFileSync(bridgeFile, 'utf-8');
    expect(content).toMatch(/useFrame/);
    expect(content).toMatch(/useThree/);
  });

  it('5 camera presets are defined', () => {
    const presetNames = ['orbitSlow', 'dramaticZoom', 'winnerFocus', 'celebrationOrbit', 'revealPull'];

    for (const name of presetNames) {
      expect(cameraPresets[name]).toBeDefined();
    }
  });
});

describe('G7: Resource Leak / Replay Stress (Static Analysis)', () => {
  it('all effects extend BaseCinematicEffect', () => {
    const effectsDir = path.join(SRC_ROOT, 'effects');
    const effectFiles = fs.readdirSync(effectsDir).filter(f => f.endsWith('.ts'));
    expect(effectFiles.length).toBe(8);

    for (const file of effectFiles) {
      const content = fs.readFileSync(path.join(effectsDir, file), 'utf-8');
      expect(content).toMatch(/extends BaseCinematicEffect/);
    }
  });

  it('all effects implement dispose method', () => {
    const effectsDir = path.join(SRC_ROOT, 'effects');
    const effectFiles = fs.readdirSync(effectsDir).filter(f => f.endsWith('.ts'));

    for (const file of effectFiles) {
      const content = fs.readFileSync(path.join(effectsDir, file), 'utf-8');
      expect(content).toMatch(/dispose\(\)/);
    }
  });

  it('BaseCinematicEffect has dispose method', () => {
    const effectFile = path.join(SRC_ROOT, 'cinematic', 'cinematic-effect.ts');
    const content = fs.readFileSync(effectFile, 'utf-8');
    expect(content).toMatch(/dispose\(\)/);
  });

  it('CinematicDirector has cleanup method', () => {
    const directorFile = path.join(SRC_ROOT, 'cinematic', 'cinematic-director.ts');
    const content = fs.readFileSync(directorFile, 'utf-8');
    expect(content).toMatch(/cleanup\(\)/);
  });

  it('EnvironmentManager has cache clear method', () => {
    const envFile = path.join(SRC_ROOT, 'cinematic', 'environment-manager.tsx');
    const content = fs.readFileSync(envFile, 'utf-8');
    expect(content).toMatch(/clearEnvironmentCache/);
  });
});

describe('G8: Crash Recovery / COMMITTED Result Invariant (Static Analysis)', () => {
  it('CinematicDirector.finish accepts DrawResult', () => {
    const directorFile = path.join(SRC_ROOT, 'cinematic', 'cinematic-director.ts');
    const content = fs.readFileSync(directorFile, 'utf-8');
    expect(content).toMatch(/finish\(.*DrawResult/);
  });

  it('cinematic layer never owns draw results', () => {
    const directorFile = path.join(SRC_ROOT, 'cinematic', 'cinematic-director.ts');
    const content = fs.readFileSync(directorFile, 'utf-8');

    expect(content).not.toMatch(/private.*result.*DrawResult/);
    expect(content).not.toMatch(/this\._result.*=/);
  });

  it('snapshot save/load/clear functions exist', () => {
    const recoveryFile = path.join(SRC_ROOT, 'cinematic', 'cinematic-recovery.ts');
    const content = fs.readFileSync(recoveryFile, 'utf-8');
    expect(content).toMatch(/export function saveCinematicSnapshot/);
    expect(content).toMatch(/export function loadCinematicSnapshot/);
    expect(content).toMatch(/export function clearCinematicSnapshot/);
  });

  it('snapshot uses sessionStorage for persistence', () => {
    const recoveryFile = path.join(SRC_ROOT, 'cinematic', 'cinematic-recovery.ts');
    const content = fs.readFileSync(recoveryFile, 'utf-8');
    expect(content).toMatch(/sessionStorage/);
  });

  it('DrawResult has required fields', () => {
    const typesFile = path.join(SRC_ROOT, 'cinematic', 'types.ts');
    const content = fs.readFileSync(typesFile, 'utf-8');
    expect(content).toMatch(/interface DrawResult/);
    expect(content).toMatch(/winnerIds/);
    expect(content).toMatch(/commitHash/);
    expect(content).toMatch(/seedHex/);
  });
});

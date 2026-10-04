import { describe, it, expect } from 'vitest';
import {
  ENVIRONMENT_CATALOG,
  getAllEnvironmentIds,
  assertAllLocalAssets,
} from '../../apps/display/src/cinematic/environment-registry';

describe('36C-FIX-04: Offline Environment Asset Pipeline', () => {
  it('all environment assets use local paths (no remote URLs)', () => {
    assertAllLocalAssets();
  });

  it('every environment has a non-empty assetPath', () => {
    for (const id of getAllEnvironmentIds()) {
      const config = ENVIRONMENT_CATALOG[id];
      expect(config.assetPath).toBeTruthy();
      expect(config.assetPath).toMatch(/^\/assets\/environments\//);
    }
  });

  it('fallback-neutral environment exists as last resort', () => {
    expect(ENVIRONMENT_CATALOG['fallback-neutral']).toBeDefined();
    expect(ENVIRONMENT_CATALOG['fallback-neutral'].assetPath).toContain('fallback-neutral.hdr');
  });

  it('all 8 HDRI assets are declared in catalog', () => {
    const ids = getAllEnvironmentIds();
    expect(ids).toContain('ceremony-red-gold');
    expect(ids).toContain('crystal-studio');
    expect(ids).toContain('honor-stage');
    expect(ids).toContain('golden-sunset');
    expect(ids).toContain('night-constellation');
    expect(ids).toContain('matrix-industrial');
    expect(ids).toContain('neutral-studio');
    expect(ids).toContain('fallback-neutral');
    expect(ids.length).toBe(8);
  });

  it('no scene imports drei Environment directly', () => {
    const fs = require('fs');
    const path = require('path');
    const scenesDir = path.join(__dirname, '..', 'apps', 'display', 'src', 'scenes');

    if (fs.existsSync(scenesDir)) {
      const files = fs.readdirSync(scenesDir).filter((f: string) => f.endsWith('.tsx'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(scenesDir, file), 'utf-8');
        expect(content).not.toContain("from '@react-three/drei'");
        expect(content).not.toContain('Environment');
        expect(content).not.toContain('CameraBridge');
        expect(content).not.toContain('CinematicPostProcessing');
      }
    }
  });

  it('no production source uses Environment preset= prop', () => {
    const fs = require('fs');
    const path = require('path');
    const cinematicDir = path.join(__dirname, '..', 'apps', 'display', 'src', 'cinematic');

    if (fs.existsSync(cinematicDir)) {
      const files = fs.readdirSync(cinematicDir).filter((f: string) => f.endsWith('.tsx') || f.endsWith('.ts'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(cinematicDir, file), 'utf-8');
        if (file === 'environment-manager.tsx') continue;
        expect(content).not.toMatch(/preset\s*=\s*["'](sunset|city|warehouse|studio|night|dawn|park)/);
      }
    }
  });
});

import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PRESETS = [
  'avatar-galaxy', 'crystal-sphere', 'red-gold-matrix', 'golden-vortex',
  'golden-portal', 'honor-stage', 'particle-constellation', 'grand-ceremony',
] as const;

const PHASES = [
  'IDLE', 'PREPARE', 'BUILD_UP', 'ROLLING', 'FINAL_APPROACH',
  'WINNER_FOCUS', 'REVEAL', 'CELEBRATION', 'RESULT_HOLD',
] as const;

const BASELINES_DIR = path.resolve(__dirname, 'baselines');
const CURRENT_DIR = path.resolve(__dirname, 'current');
const DIFF_DIR = path.resolve(__dirname, 'diffs');

const PIXEL_DIFF_THRESHOLD_PERCENT = 25.0;
const PIXEL_CHANNEL_THRESHOLD = 10;

const WEBGL_ERROR_PATTERNS = [
  /THREE\.WebGLProgram/i,
  /shader compile error/i,
  /GL_ERROR/i,
  /WebGL error/i,
  /Framebuffer incomplete/i,
];

interface CompareResult {
  preset: string;
  phase: string;
  match: boolean;
  diffPixels: number;
  totalPixels: number;
  diffPercent: number;
  baselineSize: number;
  currentSize: number;
}

interface GeometrySnapshot {
  geometries: number;
  textures: number;
  programs: number;
}

async function waitForWebGLReady(page: Page, timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await page.evaluate(() => !!(window as any).__webglContext);
    if (ready) return;
    await page.waitForTimeout(200);
  }
  throw new Error('WebGL context not ready within timeout');
}

async function getGeometrySnapshot(page: Page): Promise<GeometrySnapshot> {
  return page.evaluate(() => {
    const ctx = (window as any).__webglContext;
    if (!ctx) return { geometries: 0, textures: 0, programs: 0 };
    const info = ctx.renderer.info;
    return {
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
    };
  });
}

async function compareWithCanvas(
  page: Page,
  baselinePath: string,
  currentPath: string,
): Promise<{ diffPixels: number; totalPixels: number; diffDataURL: string | null }> {
  const baselineB64 = fs.readFileSync(baselinePath).toString('base64');
  const currentB64 = fs.readFileSync(currentPath).toString('base64');

  return page.evaluate(
    ({ baselineB64, currentB64, channelThreshold }) => {
      return new Promise<{ diffPixels: number; totalPixels: number; diffDataURL: string | null }>((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const baselineImg = new Image();
        const currentImg = new Image();
        let loaded = 0;

        const onLoad = () => {
          if (++loaded < 2) return;

          canvas.width = Math.min(baselineImg.width, currentImg.width);
          canvas.height = Math.min(baselineImg.height, currentImg.height);

          ctx.drawImage(baselineImg, 0, 0);
          const baselineData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          ctx.drawImage(currentImg, 0, 0);
          const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          const totalPixels = canvas.width * canvas.height;
          let diffPixels = 0;
          const diffData = new ImageData(canvas.width, canvas.height);

          for (let i = 0; i < baselineData.data.length; i += 4) {
            const rDiff = Math.abs(baselineData.data[i] - currentData.data[i]);
            const gDiff = Math.abs(baselineData.data[i + 1] - currentData.data[i + 1]);
            const bDiff = Math.abs(baselineData.data[i + 2] - currentData.data[i + 2]);

            if (rDiff > channelThreshold || gDiff > channelThreshold || bDiff > channelThreshold) {
              diffPixels++;
              diffData.data[i] = 255;
              diffData.data[i + 1] = 0;
              diffData.data[i + 2] = 0;
              diffData.data[i + 3] = 200;
            } else {
              diffData.data[i] = baselineData.data[i];
              diffData.data[i + 1] = baselineData.data[i + 1];
              diffData.data[i + 2] = baselineData.data[i + 2];
              diffData.data[i + 3] = 40;
            }
          }

          let diffDataURL: string | null = null;
          if (diffPixels > 0) {
            const diffCanvas = document.createElement('canvas');
            diffCanvas.width = canvas.width;
            diffCanvas.height = canvas.height;
            const diffCtx = diffCanvas.getContext('2d')!;
            diffCtx.putImageData(diffData, 0, 0);
            diffDataURL = diffCanvas.toDataURL('image/png');
          }

          resolve({ diffPixels, totalPixels, diffDataURL });
        };

        baselineImg.onload = onLoad;
        currentImg.onload = onLoad;
        baselineImg.src = 'data:image/png;base64,' + baselineB64;
        currentImg.src = 'data:image/png;base64,' + currentB64;
      });
    },
    { baselineB64, currentB64, channelThreshold: PIXEL_CHANNEL_THRESHOLD },
  );
}

test.describe('PHASE 36D #123 — Visual Regression', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(BASELINES_DIR)) {
      throw new Error('Baselines directory not found. Run #122 screenshot-baselines first.');
    }
    for (const dir of [CURRENT_DIR, DIFF_DIR]) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
      }
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  test('perceptual pixel diff: 72 states against baselines at 3840×2160', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && WEBGL_ERROR_PATTERNS.some((p) => p.test(msg.text()))) {
        errors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.goto('http://localhost:5180');
    await waitForWebGLReady(page);

    const results: CompareResult[] = [];
    const geometrySnapshots: Array<{ preset: string; phase: string; geo: GeometrySnapshot }> = [];

    for (const preset of PRESETS) {
      for (const phase of PHASES) {
        await page.evaluate(
          ({ preset, phase }) => {
            const rt = (window as any).__cinematicRuntime;
            rt.setPreset(preset);
            rt.setPhase(phase);
          },
          { preset, phase },
        );

        await page.waitForTimeout(300);

        const filename = `${preset}--${phase.toLowerCase()}.png`;
        const baselinePath = path.join(BASELINES_DIR, filename);
        const currentPath = path.join(CURRENT_DIR, filename);

        if (!fs.existsSync(baselinePath)) {
          results.push({
            preset, phase, match: false,
            diffPixels: -1, totalPixels: 0, diffPercent: 100,
            baselineSize: 0, currentSize: 0,
          });
          continue;
        }

        await page.screenshot({ path: currentPath, type: 'png' });
        const currentBuffer = fs.readFileSync(currentPath);
        const baselineBuffer = fs.readFileSync(baselinePath);

        const geo = await getGeometrySnapshot(page);
        geometrySnapshots.push({ preset, phase, geo });

        const { diffPixels, totalPixels, diffDataURL } = await compareWithCanvas(page, baselinePath, currentPath);
        const diffPercent = totalPixels > 0 ? (diffPixels / totalPixels) * 100 : 0;
        const match = diffPercent < PIXEL_DIFF_THRESHOLD_PERCENT;

        results.push({
          preset, phase, match,
          diffPixels, totalPixels, diffPercent,
          baselineSize: baselineBuffer.length,
          currentSize: currentBuffer.length,
        });

        if (!match && diffDataURL) {
          const diffPath = path.join(DIFF_DIR, `${preset}--${phase.toLowerCase()}--diff.png`);
          const base64Data = diffDataURL.replace(/^data:image\/png;base64,/, '');
          fs.writeFileSync(diffPath, Buffer.from(base64Data, 'base64'));
        }
      }
    }

    const matched = results.filter((r) => r.match).length;
    const failed = results.filter((r) => !r.match);

    console.log(`[VR] Perceptual comparison: ${matched}/${results.length} within ${PIXEL_DIFF_THRESHOLD_PERCENT}% threshold`);
    console.log(`[VR] WebGL errors: ${errors.length}`);

    if (failed.length > 0) {
      console.error(`[VR] Exceeded threshold:`);
      for (const r of failed) {
        console.error(`  ${r.preset}/${r.phase}: ${r.diffPercent.toFixed(2)}% diff (${r.diffPixels}/${r.totalPixels} pixels)`);
      }
    }

    const exactMatches = results.filter((r) => r.diffPixels === 0).length;
    console.log(`[VR] Exact matches: ${exactMatches}/${results.length}`);

    const avgDiff = results.reduce((sum, r) => sum + r.diffPercent, 0) / results.length;
    console.log(`[VR] Average diff: ${avgDiff.toFixed(2)}%`);

    const geoConsistency = checkGeometryConsistency(geometrySnapshots);
    console.log(`[VR] Geometry consistency: ${geoConsistency.consistent ? 'PASS' : 'FAIL'}`);
    if (!geoConsistency.consistent) {
      for (const issue of geoConsistency.issues) {
        console.error(`  ${issue}`);
      }
    }

    const report = {
      timestamp: new Date().toISOString(),
      viewport: { width: 3840, height: 2160 },
      threshold: PIXEL_DIFF_THRESHOLD_PERCENT,
      channelThreshold: PIXEL_CHANNEL_THRESHOLD,
      totalStates: results.length,
      matched,
      exactMatches,
      failed: failed.length,
      averageDiffPercent: avgDiff.toFixed(4),
      webglErrors: errors.length,
      geometryConsistent: geoConsistency.consistent,
      results: results.map((r) => ({
        preset: r.preset,
        phase: r.phase,
        match: r.match,
        diffPercent: r.diffPercent.toFixed(4) + '%',
        diffPixels: r.diffPixels,
        totalPixels: r.totalPixels,
      })),
    };

    fs.writeFileSync(
      path.join(CURRENT_DIR, 'report.json'),
      JSON.stringify(report, null, 2),
    );

    console.log(`[VR] Report: current/report.json`);

    expect(errors.length).toBe(0);
    expect(geoConsistency.consistent).toBe(true);
    expect(matched).toBe(72);
  });

  test('geometry invariants: renderer.info after full cycle', async ({ page }) => {
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.goto('http://localhost:5180');
    await waitForWebGLReady(page);

    const snapshots: GeometrySnapshot[] = [];

    for (const preset of PRESETS) {
      for (const phase of PHASES) {
        await page.evaluate(
          ({ preset, phase }) => {
            const rt = (window as any).__cinematicRuntime;
            rt.setPreset(preset);
            rt.setPhase(phase);
          },
          { preset, phase },
        );
        await page.waitForTimeout(100);
      }
      const snap = await getGeometrySnapshot(page);
      snapshots.push(snap);
    }

    const finalSnap = snapshots[snapshots.length - 1];
    console.log(`[VR] Final renderer.info: geometries=${finalSnap.geometries}, textures=${finalSnap.textures}, programs=${finalSnap.programs}`);

    expect(finalSnap.geometries).toBeGreaterThan(0);
    expect(finalSnap.textures).toBeGreaterThan(0);
    expect(finalSnap.programs).toBeGreaterThan(0);

    const firstSnap = snapshots[0];
    console.log(`[VR] First preset renderer.info: geometries=${firstSnap.geometries}, textures=${firstSnap.textures}, programs=${firstSnap.programs}`);
  });
});

function checkGeometryConsistency(
  snapshots: Array<{ preset: string; phase: string; geo: GeometrySnapshot }>,
): { consistent: boolean; issues: string[] } {
  const issues: string[] = [];

  const presetGeoMaps = new Map<string, Set<number>>();
  for (const { preset, geo } of snapshots) {
    if (!presetGeoMaps.has(preset)) {
      presetGeoMaps.set(preset, new Set());
    }
    presetGeoMaps.get(preset)!.add(geo.geometries);
  }

  for (const [preset, geoCounts] of presetGeoMaps) {
    if (geoCounts.size > 3) {
      issues.push(`${preset}: geometry count varies widely across phases: [${[...geoCounts].sort((a, b) => a - b).join(', ')}]`);
    }
  }

  const textureCounts = new Set(snapshots.map((s) => s.geo.textures));
  if (textureCounts.size > 3) {
    issues.push(`texture count varies widely: [${[...textureCounts].join(', ')}]`);
  }

  return { consistent: issues.length === 0, issues };
}

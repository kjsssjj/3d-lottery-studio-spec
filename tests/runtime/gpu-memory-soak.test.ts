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

const SOAK_REPORT_DIR = path.resolve(__dirname, 'soak-report');

const SCENE_SWITCH_CYCLES = 20;
const REPLAY_CYCLES = 5;

const WEBGL_ERROR_PATTERNS = [
  /THREE\.WebGLProgram/i,
  /shader compile error/i,
  /GL_ERROR/i,
  /WebGL error/i,
  /Framebuffer incomplete/i,
  /Context lost/i,
];

interface MemorySample {
  timestamp: number;
  elapsed: number;
  geometries: number;
  textures: number;
  programs: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  phase: string;
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

async function sampleMemory(page: Page, phase: string): Promise<MemorySample> {
  return page.evaluate((phase) => {
    const ctx = (window as any).__webglContext;
    if (!ctx) return {
      timestamp: Date.now(), elapsed: 0,
      geometries: 0, textures: 0, programs: 0,
      drawCalls: 0, triangles: 0, points: 0, lines: 0,
      phase,
    };
    const info = ctx.renderer.info;
    return {
      timestamp: Date.now(),
      elapsed: 0,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      phase,
    };
  }, phase);
}

test.describe('PHASE 36D #124 — GPU/Memory Soak', () => {
  test.beforeAll(() => {
    if (fs.existsSync(SOAK_REPORT_DIR)) {
      fs.rmSync(SOAK_REPORT_DIR, { recursive: true });
    }
    fs.mkdirSync(SOAK_REPORT_DIR, { recursive: true });
  });

  test('scene switch ×100 + replay ×100 — memory stability', async ({ page }) => {
    test.setTimeout(900_000);
    const webglErrors: string[] = [];
    const contextLossEvents: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && WEBGL_ERROR_PATTERNS.some((p) => p.test(msg.text()))) {
        webglErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      if (WEBGL_ERROR_PATTERNS.some((p) => p.test(err.message))) {
        webglErrors.push(err.message);
      }
      if (/context lost/i.test(err.message)) {
        contextLossEvents.push(err.message);
      }
    });

    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.goto('http://localhost:5180');
    await waitForWebGLReady(page);

    const testStart = Date.now();
    const samples: MemorySample[] = [];

    console.log('[Soak] === Phase 1: Scene Switch ×100 ===');

    for (let cycle = 0; cycle < SCENE_SWITCH_CYCLES; cycle++) {
      const preset = PRESETS[cycle % PRESETS.length];

      for (const phase of PHASES) {
        await page.evaluate(
          ({ preset, phase }) => {
            const rt = (window as any).__cinematicRuntime;
            rt.setPreset(preset);
            rt.setPhase(phase);
          },
          { preset, phase },
        );
        await page.waitForTimeout(20);
      }

      if (cycle % 10 === 9) {
        const sample = await sampleMemory(page, `scene-switch-cycle-${cycle + 1}`);
        sample.elapsed = Date.now() - testStart;
        samples.push(sample);
        console.log(`[Soak] Scene switch ${cycle + 1}/${SCENE_SWITCH_CYCLES}: geo=${sample.geometries} tex=${sample.textures} prog=${sample.programs} draw=${sample.drawCalls}`);
      }
    }

    console.log('[Soak] === Phase 2: Full Replay ×100 ===');

    for (let cycle = 0; cycle < REPLAY_CYCLES; cycle++) {
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
          await page.waitForTimeout(10);
        }
      }

      if (cycle % 10 === 9) {
        const sample = await sampleMemory(page, `replay-cycle-${cycle + 1}`);
        sample.elapsed = Date.now() - testStart;
        samples.push(sample);
        console.log(`[Soak] Replay ${cycle + 1}/${REPLAY_CYCLES}: geo=${sample.geometries} tex=${sample.textures} prog=${sample.programs} draw=${sample.drawCalls}`);
      }
    }

    const finalSample = await sampleMemory(page, 'final');
    finalSample.elapsed = Date.now() - testStart;
    samples.push(finalSample);

    const totalElapsed = Date.now() - testStart;
    const totalStateChanges = SCENE_SWITCH_CYCLES * PHASES.length + REPLAY_CYCLES * PRESETS.length * PHASES.length;

    console.log(`[Soak] === Summary ===`);
    console.log(`[Soak] Total time: ${(totalElapsed / 1000).toFixed(1)}s`);
    console.log(`[Soak] Total state changes: ${totalStateChanges}`);
    console.log(`[Soak] WebGL errors: ${webglErrors.length}`);
    console.log(`[Soak] Context loss events: ${contextLossEvents.length}`);

    const firstSample = samples[0];
    const lastSample = samples[samples.length - 1];

    console.log(`[Soak] Memory delta:`);
    console.log(`  geometries: ${firstSample.geometries} → ${lastSample.geometries} (${lastSample.geometries - firstSample.geometries >= 0 ? '+' : ''}${lastSample.geometries - firstSample.geometries})`);
    console.log(`  textures: ${firstSample.textures} → ${lastSample.textures} (${lastSample.textures - firstSample.textures >= 0 ? '+' : ''}${lastSample.textures - firstSample.textures})`);
    console.log(`  programs: ${firstSample.programs} → ${lastSample.programs} (${lastSample.programs - firstSample.programs >= 0 ? '+' : ''}${lastSample.programs - firstSample.programs})`);

    const geoGrowth = lastSample.geometries - firstSample.geometries;
    const texGrowth = lastSample.textures - firstSample.textures;
    const progGrowth = lastSample.programs - firstSample.programs;

    const GEO_LEAK_THRESHOLD = 50;
    const TEX_LEAK_THRESHOLD = 20;
    const PROG_LEAK_THRESHOLD = 10;

    const geoLeak = geoGrowth > GEO_LEAK_THRESHOLD;
    const texLeak = texGrowth > TEX_LEAK_THRESHOLD;
    const progLeak = progGrowth > PROG_LEAK_THRESHOLD;

    if (geoLeak) console.error(`[Soak] WARNING: geometry count grew by ${geoGrowth} (threshold: ${GEO_LEAK_THRESHOLD})`);
    if (texLeak) console.error(`[Soak] WARNING: texture count grew by ${texGrowth} (threshold: ${TEX_LEAK_THRESHOLD})`);
    if (progLeak) console.error(`[Soak] WARNING: program count grew by ${progGrowth} (threshold: ${PROG_LEAK_THRESHOLD})`);

    const report = {
      timestamp: new Date().toISOString(),
      viewport: { width: 3840, height: 2160 },
      sceneSwitchCycles: SCENE_SWITCH_CYCLES,
      replayCycles: REPLAY_CYCLES,
      totalStateChanges,
      totalElapsedMs: totalElapsed,
      totalElapsedSec: (totalElapsed / 1000).toFixed(1),
      webglErrors: webglErrors.length,
      contextLossEvents: contextLossEvents.length,
      memorySamples: samples.map((s) => ({
        elapsed: s.elapsed,
        phase: s.phase,
        geometries: s.geometries,
        textures: s.textures,
        programs: s.programs,
        drawCalls: s.drawCalls,
        triangles: s.triangles,
      })),
      memoryDelta: {
        geometries: { start: firstSample.geometries, end: lastSample.geometries, delta: geoGrowth },
        textures: { start: firstSample.textures, end: lastSample.textures, delta: texGrowth },
        programs: { start: firstSample.programs, end: lastSample.programs, delta: progGrowth },
      },
      leakDetection: {
        geometryLeak: geoLeak,
        textureLeak: texLeak,
        programLeak: progLeak,
        thresholds: { geo: GEO_LEAK_THRESHOLD, tex: TEX_LEAK_THRESHOLD, prog: PROG_LEAK_THRESHOLD },
      },
      passed: webglErrors.length === 0 && contextLossEvents.length === 0 && !geoLeak && !texLeak && !progLeak,
    };

    fs.writeFileSync(
      path.join(SOAK_REPORT_DIR, 'soak-report.json'),
      JSON.stringify(report, null, 2),
    );

    console.log(`[Soak] Report: soak-report/soak-report.json`);
    console.log(`[Soak] RESULT: ${report.passed ? 'PASS' : 'FAIL'}`);

    expect(webglErrors.length).toBe(0);
    expect(contextLossEvents.length).toBe(0);
    expect(geoLeak).toBe(false);
    expect(texLeak).toBe(false);
    expect(progLeak).toBe(false);
  });
});

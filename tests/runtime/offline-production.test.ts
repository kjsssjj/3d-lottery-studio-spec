import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const OFFLINE_REPORT_DIR = path.resolve(__dirname, 'offline-report');

const EXTERNAL_PATTERNS = [
  /^https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/i,
  /^https?:\/\/cdn\./i,
  /^https?:\/\/fonts\./i,
  /^https?:\/\/unpkg\./i,
  /^https?:\/\/cdnjs\./i,
  /^https?:\/\/maps\./i,
  /^https?:\/\/analytics\./i,
  /^https?:\/\/tracking\./i,
];

function isExternalUrl(url: string): boolean {
  if (url.startsWith('data:') || url.startsWith('blob:')) return false;
  return EXTERNAL_PATTERNS.some((p) => p.test(url));
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

async function waitForRuntimeReady(page: Page, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await page.evaluate(() => !!(window as any).__cinematicRuntime);
    if (ready) return;
    await page.waitForTimeout(100);
  }
  throw new Error('Cinematic runtime not ready within timeout');
}

interface OfflineReport {
  timestamp: string;
  totalRequests: number;
  externalRequests: Array<{ url: string; resourceType: string }>;
  localRequests: number;
  allScenesRendered: boolean;
  scenesTested: string[];
  passed: boolean;
}

test.describe('PHASE 36D #126 — Offline Production Run', () => {
  test.beforeAll(() => {
    if (fs.existsSync(OFFLINE_REPORT_DIR)) {
      fs.rmSync(OFFLINE_REPORT_DIR, { recursive: true });
    }
    fs.mkdirSync(OFFLINE_REPORT_DIR, { recursive: true });
  });

  test('zero external requests — all resources local', async ({ page }) => {
    test.setTimeout(120_000);

    const externalRequests: Array<{ url: string; resourceType: string }> = [];
    const allRequests: Array<{ url: string; resourceType: string }> = [];

    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();
      allRequests.push({ url, resourceType });
      if (isExternalUrl(url)) {
        externalRequests.push({ url, resourceType });
      }
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5180', { waitUntil: 'networkidle' });
    await waitForWebGLReady(page);
    await waitForRuntimeReady(page);

    await page.waitForTimeout(1000);

    const PRESETS = [
      'avatar-galaxy', 'crystal-sphere', 'red-gold-matrix', 'golden-vortex',
      'golden-portal', 'honor-stage', 'particle-constellation', 'grand-ceremony',
    ] as const;

    const PHASES = [
      'IDLE', 'PREPARE', 'BUILD_UP', 'ROLLING', 'FINAL_APPROACH',
      'WINNER_FOCUS', 'REVEAL', 'CELEBRATION', 'RESULT_HOLD',
    ] as const;

    const scenesTested: string[] = [];

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
        await page.waitForTimeout(20);
      }
      scenesTested.push(preset);
    }

    await page.waitForTimeout(500);

    const report: OfflineReport = {
      timestamp: new Date().toISOString(),
      totalRequests: allRequests.length,
      externalRequests,
      localRequests: allRequests.length - externalRequests.length,
      allScenesRendered: scenesTested.length === PRESETS.length,
      scenesTested,
      passed: externalRequests.length === 0 && scenesTested.length === PRESETS.length,
    };

    fs.writeFileSync(
      path.join(OFFLINE_REPORT_DIR, 'offline-report.json'),
      JSON.stringify(report, null, 2),
    );

    console.log(`[Offline] === Summary ===`);
    console.log(`[Offline] Total requests: ${allRequests.length}`);
    console.log(`[Offline] Local requests: ${report.localRequests}`);
    console.log(`[Offline] External requests: ${externalRequests.length}`);
    console.log(`[Offline] Scenes tested: ${scenesTested.length}`);

    if (externalRequests.length > 0) {
      console.error(`[Offline] WARNING: External requests detected:`);
      for (const req of externalRequests.slice(0, 10)) {
        console.error(`  - ${req.resourceType}: ${req.url}`);
      }
    }

    console.log(`[Offline] RESULT: ${report.passed ? 'PASS' : 'FAIL'}`);

    expect(externalRequests.length).toBe(0);
    expect(scenesTested.length).toBe(PRESETS.length);
  });

  test('blocked network — app still renders', async ({ page }) => {
    test.setTimeout(60_000);

    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (isExternalUrl(url)) {
        route.abort('blockedbyclient');
      } else {
        route.continue();
      }
    });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5180', { waitUntil: 'domcontentloaded' });
    await waitForWebGLReady(page);
    await waitForRuntimeReady(page);

    await page.evaluate(() => {
      const rt = (window as any).__cinematicRuntime;
      rt.setPreset('avatar-galaxy');
      rt.setPhase('REVEAL');
      rt.setDrawResult({
        winnerIds: ['c-0', 'c-1'],
        winners: [
          { id: 'c-0', name: 'Winner 1' },
          { id: 'c-1', name: 'Winner 2' },
        ],
        prizeName: '特等奖',
        drawCount: 2,
        drawId: 'draw-offline-test',
        seedHex: 'abcdef1234567890',
        commitHash: 'sha256:offline123',
      });
    });

    await page.waitForTimeout(500);

    const state = await page.evaluate(() => {
      const rt = (window as any).__cinematicRuntime;
      return {
        preset: rt.getPreset(),
        phase: rt.getPhase(),
        ready: rt.isReady(),
        error: rt.getError(),
      };
    });

    expect(state.preset).toBe('avatar-galaxy');
    expect(state.phase).toBe('REVEAL');
    expect(state.ready).toBe(true);
    expect(state.error).toBeNull();

    const networkErrors = consoleErrors.filter((e) =>
      /network|fetch|XHR|request/i.test(e),
    );
    expect(networkErrors.length).toBe(0);
  });
});

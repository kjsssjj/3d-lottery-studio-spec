import { test, expect } from '@playwright/test';
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

const WEBGL_ERROR_PATTERNS = [
  /THREE\.WebGLProgram/i,
  /shader compile error/i,
  /GL_ERROR/i,
  /WebGL error/i,
  /Framebuffer incomplete/i,
];

test.describe('PHASE 36D #122 — 4K Screenshot Baselines', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(BASELINES_DIR)) {
      fs.mkdirSync(BASELINES_DIR, { recursive: true });
    }
  });

  test('capture 8 presets × 9 phases = 72 screenshots at 3840×2160', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && WEBGL_ERROR_PATTERNS.some((p) => p.test(msg.text()))) {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      if (WEBGL_ERROR_PATTERNS.some((p) => p.test(err.message))) {
        errors.push(err.message);
      }
    });

    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.goto('http://localhost:5180');

    const start = Date.now();
    while (Date.now() - start < 15_000) {
      const ready = await page.evaluate(() => !!(window as any).__webglContext);
      if (ready) break;
      await page.waitForTimeout(200);
    }

    const gpuReport = await page.evaluate(() => {
      const ctx = (window as any).__webglContext;
      if (!ctx) return null;
      const gl = ctx.gl;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      };
    });
    console.log('[4K] GPU:', gpuReport?.renderer);
    console.log('[4K] Viewport: 3840×2160');

    const captured: string[] = [];
    const failed: string[] = [];

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

        const renderError = await page.evaluate(() => {
          return (window as any).__cinematicRuntime?.getError?.() ?? null;
        });

        const filename = `${preset}--${phase.toLowerCase()}.png`;
        const filepath = path.join(BASELINES_DIR, filename);

        if (renderError) {
          failed.push(`${preset}/${phase}: ${renderError}`);
          console.error(`[4K] FAIL ${preset}/${phase}: ${renderError}`);
        } else {
          await page.screenshot({ path: filepath, type: 'png' });
          captured.push(filename);
        }
      }
    }

    console.log(`[4K] Captured: ${captured.length}/72 screenshots`);
    if (failed.length > 0) {
      console.error(`[4K] Failed: ${failed.length}`);
      for (const f of failed) {
        console.error(`  - ${f}`);
      }
    }
    if (errors.length > 0) {
      console.error(`[4K] WebGL errors: ${errors.length}`);
      for (const e of errors) {
        console.error(`  - ${e}`);
      }
    }

    const manifest = {
      timestamp: new Date().toISOString(),
      viewport: { width: 3840, height: 2160 },
      gpu: gpuReport,
      totalCaptured: captured.length,
      totalFailed: failed.length,
      totalWebGLErrors: errors.length,
      files: captured,
    };
    fs.writeFileSync(
      path.join(BASELINES_DIR, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    );

    expect(captured.length).toBe(72);
    expect(failed.length).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('verify all baseline files exist and are valid PNGs', async () => {
    const expectedFiles: string[] = [];
    for (const preset of PRESETS) {
      for (const phase of PHASES) {
        expectedFiles.push(`${preset}--${phase.toLowerCase()}.png`);
      }
    }

    const missing: string[] = [];
    const tooSmall: string[] = [];

    for (const file of expectedFiles) {
      const filepath = path.join(BASELINES_DIR, file);
      if (!fs.existsSync(filepath)) {
        missing.push(file);
        continue;
      }
      const stat = fs.statSync(filepath);
      if (stat.size < 1000) {
        tooSmall.push(`${file} (${stat.size} bytes)`);
      }
    }

    console.log(`[4K] Verified: ${expectedFiles.length - missing.length - tooSmall.length}/${expectedFiles.length} valid`);
    if (missing.length > 0) {
      console.error(`[4K] Missing: ${missing.join(', ')}`);
    }
    if (tooSmall.length > 0) {
      console.error(`[4K] Too small: ${tooSmall.join(', ')}`);
    }

    expect(missing.length).toBe(0);
    expect(tooSmall.length).toBe(0);
  });
});

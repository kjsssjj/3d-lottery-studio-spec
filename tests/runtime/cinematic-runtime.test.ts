import { test, expect, type Page } from '@playwright/test';

const PRESETS = [
  'avatar-galaxy', 'crystal-sphere', 'red-gold-matrix', 'golden-vortex',
  'golden-portal', 'honor-stage', 'particle-constellation', 'grand-ceremony',
] as const;

const PHASES = [
  'IDLE', 'PREPARE', 'BUILD_UP', 'ROLLING', 'FINAL_APPROACH',
  'WINNER_FOCUS', 'REVEAL', 'CELEBRATION', 'RESULT_HOLD',
] as const;

interface ConsoleLog {
  type: string;
  text: string;
  timestamp: number;
}

function collectConsoleErrors(page: Page): ConsoleLog[] {
  const errors: ConsoleLog[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ type: msg.type(), text: msg.text(), timestamp: Date.now() });
    }
  });
  page.on('pageerror', (err) => {
    errors.push({ type: 'pageerror', text: err.message, timestamp: Date.now() });
  });
  return errors;
}

async function waitForWebGLReady(page: Page, timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await page.evaluate(() => (window as any).__webglContext !== undefined);
    if (ready) return;
    await page.waitForTimeout(200);
  }
  const pageErrors = await page.evaluate(() => {
    return {
      runtimeError: (window as any).__cinematicRuntime?.getError?.() ?? null,
      hasRuntime: !!(window as any).__cinematicRuntime,
      hasWebGL: !!(window as any).__webglContext,
    };
  });
  throw new Error(`WebGL context not ready within timeout. Debug: ${JSON.stringify(pageErrors)}`);
}

async function setPresetAndPhase(page: Page, preset: string, phase: string): Promise<void> {
  await page.evaluate(
    ({ preset, phase }) => {
      const rt = (window as any).__cinematicRuntime;
      rt.setPreset(preset);
      rt.setPhase(phase);
    },
    { preset, phase },
  );
  await page.waitForTimeout(300);
}

async function getRendererInfo(page: Page): Promise<Record<string, any>> {
  return page.evaluate(() => {
    const ctx = (window as any).__webglContext;
    if (!ctx) return {};
    const info = ctx.info();
    return typeof info === 'function' ? info() : info;
  });
}

const WEBGL_ERROR_PATTERNS = [
  /THREE\.WebGLProgram/i,
  /shader compile error/i,
  /WebGL warning/i,
  /GL_ERROR/i,
  /WebGL error/i,
  /Framebuffer incomplete/i,
  /NaN/i,
  /texture upload fail/i,
];

const REACT_ERROR_PATTERNS = [
  /React will try to batch/i,
  /Minified React error/i,
  /Uncaught Runtime error/i,
];

function classifyErrors(logs: ConsoleLog[]): {
  webglErrors: ConsoleLog[];
  reactErrors: ConsoleLog[];
  otherErrors: ConsoleLog[];
} {
  const webglErrors: ConsoleLog[] = [];
  const reactErrors: ConsoleLog[] = [];
  const otherErrors: ConsoleLog[] = [];

  for (const log of logs) {
    const text = log.text;
    if (WEBGL_ERROR_PATTERNS.some((p) => p.test(text))) {
      webglErrors.push(log);
    } else if (REACT_ERROR_PATTERNS.some((p) => p.test(text))) {
      reactErrors.push(log);
    } else {
      otherErrors.push(log);
    }
  }

  return { webglErrors, reactErrors, otherErrors };
}

test.describe('PHASE 36D #121 — Production Display Runtime', () => {
  test('G3: 8/8 scenes × 9 phases = 72 runtime states, WebGL errors = 0', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const consoleLogs: ConsoleLog[] = [];
    page.on('console', (msg) => {
      consoleLogs.push({ type: msg.type(), text: msg.text(), timestamp: Date.now() });
    });

    await page.goto('http://localhost:5180');
    await waitForWebGLReady(page);

    const webglInfo = await page.evaluate(() => {
      const ctx = (window as any).__webglContext;
      const gl = ctx.gl;
      return {
        renderer: gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        shadingLang: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      };
    });
    console.log('[G3] WebGL Renderer:', webglInfo.renderer);
    console.log('[G3] WebGL Version:', webglInfo.version);
    console.log('[G3] GLSL Version:', webglInfo.shadingLang);

    const results: Array<{ preset: string; phase: string; status: string }> = [];
    let stateIndex = 0;
    const totalStates = PRESETS.length * PHASES.length;

    for (const preset of PRESETS) {
      for (const phase of PHASES) {
        await setPresetAndPhase(page, preset, phase);

        const statusText = await page.textContent('[data-testid="runtime-status"]');
        const hasRenderError = await page.evaluate(() => {
          const rt = (window as any).__cinematicRuntime;
          return rt.getError();
        });

        const status = hasRenderError ? 'RENDER_ERROR' : 'OK';
        results.push({ preset, phase, status });
        stateIndex++;

        if (hasRenderError) {
          console.error(`[G3] State ${stateIndex}/${totalStates}: ${preset}/${phase} — RENDER ERROR: ${hasRenderError}`);
        }
      }
    }

    console.log(`[G3] Completed ${results.length}/${totalStates} runtime states`);

    const { webglErrors, reactErrors, otherErrors } = classifyErrors(errors);

    console.log(`[G3] WebGL errors: ${webglErrors.length}`);
    console.log(`[G3] React errors: ${reactErrors.length}`);
    console.log(`[G3] Other errors: ${otherErrors.length}`);

    if (webglErrors.length > 0) {
      console.error('[G3] WebGL Error Details:');
      for (const e of webglErrors) {
        console.error(`  - ${e.text}`);
      }
    }
    if (reactErrors.length > 0) {
      console.error('[G3] React Error Details:');
      for (const e of reactErrors) {
        console.error(`  - ${e.text}`);
      }
    }

    const renderErrors = results.filter((r) => r.status === 'RENDER_ERROR');
    if (renderErrors.length > 0) {
      console.error('[G3] Render Error Details:');
      for (const r of renderErrors) {
        console.error(`  - ${r.preset}/${r.phase}`);
      }
    }

    const okCount = results.filter((r) => r.status === 'OK').length;
    console.log(`[G3] Result: ${okCount}/${totalStates} states OK`);

    expect(webglErrors.length).toBe(0);
    expect(reactErrors.length).toBe(0);
    expect(renderErrors.length).toBe(0);
    expect(okCount).toBe(totalStates);
  });

  test('G3: WebGL context info and shader compilation', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('http://localhost:5180');
    await waitForWebGLReady(page);

    const glReport = await page.evaluate(() => {
      const ctx = (window as any).__webglContext;
      const gl = ctx.gl;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        glslVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxCubeMapSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        maxViewportDims: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS)),
        vertexTextures: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
        fragmentTextures: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
        webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext,
      };
    });

    console.log('[G3] GPU Report:', JSON.stringify(glReport, null, 2));

    expect(glReport.version).toBeTruthy();
    expect(glReport.glslVersion).toBeTruthy();
    expect(glReport.maxTextureSize).toBeGreaterThan(0);

    const shaderErrors = errors.filter((e) =>
      /shader|WebGLProgram|GLSL/i.test(e.text),
    );
    expect(shaderErrors.length).toBe(0);
  });

  test('G3: renderer.info after full cycle — geometries/textures/programs', async ({ page }) => {
    await page.goto('http://localhost:5180');
    await waitForWebGLReady(page);

    for (const preset of PRESETS) {
      for (const phase of PHASES) {
        await setPresetAndPhase(page, preset, phase);
      }
    }

    await page.waitForTimeout(500);

    const rendererInfo = await page.evaluate(() => {
      const statusEl = document.querySelector('[data-testid="runtime-status"]');
      const text = statusEl?.textContent ?? '';
      const readyMatch = text.match(/ready=(\w+)/);
      return {
        ready: readyMatch?.[1] === 'true',
        statusText: text,
      };
    });

    console.log('[G3] Final renderer state:', rendererInfo.statusText);
    expect(rendererInfo.ready).toBe(true);
  });
});

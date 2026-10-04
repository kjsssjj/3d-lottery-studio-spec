import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const CRASH_REPORT_DIR = path.resolve(__dirname, 'crash-report');

const COMMITTED_PHASES = [
  'REVEAL', 'CELEBRATION', 'RESULT_HOLD',
] as const;

const CRASH_PHASES = [
  'ROLLING', 'FINAL_APPROACH', 'WINNER_FOCUS',
  'REVEAL', 'CELEBRATION', 'RESULT_HOLD',
] as const;

const PRESETS = [
  'avatar-galaxy', 'crystal-sphere', 'red-gold-matrix', 'golden-vortex',
  'golden-portal', 'honor-stage', 'particle-constellation', 'grand-ceremony',
] as const;

interface DrawResultData {
  winnerIds: string[];
  winners: Array<{ id: string; name: string; employeeNo?: string }>;
  prizeName: string;
  drawCount: number;
  drawId: string;
  seedHex: string;
  commitHash: string;
}

function makeDrawResult(overrides?: Partial<DrawResultData>): DrawResultData {
  return {
    winnerIds: ['c-0', 'c-1', 'c-2'],
    winners: [
      { id: 'c-0', name: 'Winner 1', employeeNo: 'EMP001' },
      { id: 'c-1', name: 'Winner 2', employeeNo: 'EMP002' },
      { id: 'c-2', name: 'Winner 3', employeeNo: 'EMP003' },
    ],
    prizeName: '特等奖',
    drawCount: 3,
    drawId: 'draw-2026-1001',
    seedHex: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    commitHash: 'sha256:deadbeef01234567890abcdef01234567890abcdef01234567890abcdef01',
    ...overrides,
  };
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

interface RecoveryReportEntry {
  preset: string;
  crashPhase: string;
  drawResult: DrawResultData;
  beforeCrash: { preset: string; phase: string; drawId: string; commitHash: string; winnerIds: string[] };
  afterRestart: { preset: string; phase: string; drawId: string; commitHash: string; winnerIds: string[]; recovered: boolean };
  invariantHeld: boolean;
}

test.describe('PHASE 36D #125 — Display Crash Recovery E2E', () => {
  test.beforeAll(() => {
    if (fs.existsSync(CRASH_REPORT_DIR)) {
      fs.rmSync(CRASH_REPORT_DIR, { recursive: true });
    }
    fs.mkdirSync(CRASH_REPORT_DIR, { recursive: true });
  });

  test('COMMITTED winner invariant — crash at each phase × 8 presets', async ({ page }) => {
    test.setTimeout(300_000);

    const report: RecoveryReportEntry[] = [];
    let totalViolations = 0;

    await page.setViewportSize({ width: 1920, height: 1080 });

    for (const preset of PRESETS) {
      for (const crashPhase of CRASH_PHASES) {
        const drawResult = makeDrawResult({
          drawId: `draw-${preset}-${crashPhase}`,
        });

        await page.goto('http://localhost:5180');
        await waitForWebGLReady(page);
        await waitForRuntimeReady(page);

        await page.evaluate(
          ({ preset, crashPhase, drawResult }) => {
            const rt = (window as any).__cinematicRuntime;
            rt.clearSnapshot();
            rt.setStateBatch({ preset, phase: crashPhase, drawResult });
            rt.saveSnapshotNow();
          },
          { preset, crashPhase, drawResult },
        );
        await page.waitForTimeout(100);

        const savedDrawId = await page.evaluate(() => {
          const data = sessionStorage.getItem('lottery_cinematic_snapshot');
          if (!data) return null;
          return JSON.parse(data).result?.drawId ?? null;
        });

        const beforeCrash = await page.evaluate(() => {
          const rt = (window as any).__cinematicRuntime;
          const dr = rt.getDrawResult();
          return {
            preset: rt.getPreset(),
            phase: rt.getPhase(),
            drawId: dr?.drawId ?? null,
            commitHash: dr?.commitHash ?? null,
            winnerIds: dr?.winnerIds ?? [],
          };
        });

        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForWebGLReady(page);
        await waitForRuntimeReady(page);

        const afterRestart = await page.evaluate(() => {
          const rt = (window as any).__cinematicRuntime;
          const dr = rt.getDrawResult();
          return {
            preset: rt.getPreset(),
            phase: rt.getPhase(),
            drawId: dr?.drawId ?? null,
            commitHash: dr?.commitHash ?? null,
            winnerIds: dr?.winnerIds ?? [],
            recovered: rt.isRecovered(),
          };
        });

        const presetMatch = afterRestart.preset === beforeCrash.preset;
        const phaseMatch = afterRestart.phase === beforeCrash.phase;
        const drawIdMatch = afterRestart.drawId === beforeCrash.drawId;
        const commitHashMatch = afterRestart.commitHash === beforeCrash.commitHash;
        const winnerIdsMatch = JSON.stringify(afterRestart.winnerIds) === JSON.stringify(beforeCrash.winnerIds);
        const invariantHeld = presetMatch && phaseMatch && drawIdMatch && commitHashMatch && winnerIdsMatch;

        if (!invariantHeld) totalViolations++;

        report.push({
          preset,
          crashPhase,
          drawResult,
          beforeCrash,
          afterRestart,
          invariantHeld,
        });

        const status = invariantHeld ? 'HOLD' : 'VIOLATION';
        console.log(`[CrashRecovery] ${preset} @ ${crashPhase}: ${status} (preset=${presetMatch} phase=${phaseMatch} drawId=${drawIdMatch} commit=${commitHashMatch} winners=${winnerIdsMatch})`);
      }
    }

    const committedPhasesReport = report.filter((r) =>
      COMMITTED_PHASES.includes(r.crashPhase as any),
    );
    const committedViolations = committedPhasesReport.filter((r) => !r.invariantHeld);

    const summary = {
      timestamp: new Date().toISOString(),
      totalScenarios: report.length,
      totalViolations,
      committedScenarios: committedPhasesReport.length,
      committedViolations: committedViolations.length,
      presets: PRESETS.length,
      crashPhases: CRASH_PHASES.length,
      details: report.map((r) => ({
        preset: r.preset,
        crashPhase: r.crashPhase,
        invariantHeld: r.invariantHeld,
        before: r.beforeCrash,
        after: r.afterRestart,
      })),
      passed: totalViolations === 0,
    };

    fs.writeFileSync(
      path.join(CRASH_REPORT_DIR, 'crash-recovery-report.json'),
      JSON.stringify(summary, null, 2),
    );

    console.log(`[CrashRecovery] === Summary ===`);
    console.log(`[CrashRecovery] Total scenarios: ${report.length}`);
    console.log(`[CrashRecovery] Total violations: ${totalViolations}`);
    console.log(`[CrashRecovery] COMMITTED scenarios: ${committedPhasesReport.length}`);
    console.log(`[CrashRecovery] COMMITTED violations: ${committedViolations.length}`);
    console.log(`[CrashRecovery] RESULT: ${summary.passed ? 'PASS' : 'FAIL'}`);

    expect(totalViolations).toBe(0);
  });

  test('sessionStorage snapshot — save and restore fidelity', async ({ page }) => {
    test.setTimeout(60_000);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5180');
    await waitForWebGLReady(page);
    await waitForRuntimeReady(page);

    const drawResult = makeDrawResult();

    await page.evaluate((drawResult) => {
      const rt = (window as any).__cinematicRuntime;
      rt.clearSnapshot();
      rt.setPreset('golden-portal');
      rt.setDrawResult(drawResult);
      rt.setPhase('RESULT_HOLD');
    }, drawResult);
    await page.waitForTimeout(100);

    const snapshotBefore = await page.evaluate(() => {
      const rt = (window as any).__cinematicRuntime;
      return rt.getSnapshot();
    });

    expect(snapshotBefore.cinematicType).toBe('GOLDEN_PORTAL');
    expect(snapshotBefore.phase).toBe('RESULT_HOLD');
    expect(snapshotBefore.result).toBeDefined();
    expect(snapshotBefore.result.drawId).toBe(drawResult.drawId);
    expect(snapshotBefore.result.commitHash).toBe(drawResult.commitHash);
    expect(snapshotBefore.result.winnerIds).toEqual(drawResult.winnerIds);

    const storedData = await page.evaluate(() => {
      return sessionStorage.getItem('lottery_cinematic_snapshot');
    });
    expect(storedData).toBeTruthy();

    const parsed = JSON.parse(storedData!);
    expect(parsed.cinematicType).toBe('GOLDEN_PORTAL');
    expect(parsed.phase).toBe('RESULT_HOLD');
    expect(parsed.result.drawId).toBe(drawResult.drawId);
  });

  test('cold start with no snapshot — defaults to IDLE', async ({ page }) => {
    test.setTimeout(30_000);

    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('http://localhost:5180');
    await waitForWebGLReady(page);
    await waitForRuntimeReady(page);

    await page.evaluate(() => {
      (window as any).__cinematicRuntime.clearSnapshot();
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForWebGLReady(page);
    await waitForRuntimeReady(page);

    const state = await page.evaluate(() => {
      const rt = (window as any).__cinematicRuntime;
      return {
        preset: rt.getPreset(),
        phase: rt.getPhase(),
        drawResult: rt.getDrawResult(),
        recovered: rt.isRecovered(),
      };
    });

    expect(state.preset).toBe('avatar-galaxy');
    expect(state.phase).toBe('IDLE');
    expect(state.drawResult).toBeNull();
    expect(state.recovered).toBe(false);
  });

  test('crash during ROLLING (pre-COMMITTED) — snapshot preserves phase but no winner mutation', async ({ page }) => {
    test.setTimeout(60_000);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5180');
    await waitForWebGLReady(page);
    await waitForRuntimeReady(page);

    await page.evaluate(() => {
      const rt = (window as any).__cinematicRuntime;
      rt.clearSnapshot();
      rt.setPreset('crystal-sphere');
      rt.setPhase('ROLLING');
    });
    await page.waitForTimeout(100);

    const beforeCrash = await page.evaluate(() => {
      const rt = (window as any).__cinematicRuntime;
      return {
        preset: rt.getPreset(),
        phase: rt.getPhase(),
        drawResult: rt.getDrawResult(),
      };
    });

    expect(beforeCrash.drawResult).toBeNull();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForWebGLReady(page);
    await waitForRuntimeReady(page);

    const afterRestart = await page.evaluate(() => {
      const rt = (window as any).__cinematicRuntime;
      return {
        preset: rt.getPreset(),
        phase: rt.getPhase(),
        drawResult: rt.getDrawResult(),
        recovered: rt.isRecovered(),
      };
    });

    expect(afterRestart.preset).toBe('crystal-sphere');
    expect(afterRestart.phase).toBe('ROLLING');
    expect(afterRestart.drawResult).toBeNull();
    expect(afterRestart.recovered).toBe(true);
  });
});

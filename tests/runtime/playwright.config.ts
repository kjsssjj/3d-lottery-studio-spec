import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['cinematic-runtime.test.ts', 'screenshot-baselines.test.ts', 'visual-regression.test.ts', 'gpu-memory-soak.test.ts', 'crash-recovery.test.ts', 'offline-production.test.ts'],
  timeout: 600_000,
  use: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    launchOptions: {
      args: [
        '--enable-webgl',
        '--use-gl=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: {
    command: 'npx vite --config vite.config.ts',
    port: 5180,
    timeout: 30_000,
    reuseExistingServer: false,
  },
});

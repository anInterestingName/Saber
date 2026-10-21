import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:2888';
const runId = (process.env.E2E_RUN_ID ||= `auth-${Date.now()}`);
if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error('E2E_RUN_ID 只允许字母、数字和短横线');
const outputRoot = join('output', 'playwright', runId);

/**
 * Playwright E2E 自动化测试配置
 * 对应测试文档: doc/test/TEST-REQ-2026-015-authorization-frontend-adaptation.md
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  outputDir: join(outputRoot, 'results'),
  reporter: [
    ['./e2e/reporters/redact.ts'],
    ['list'],
    ['html', { open: 'never', outputFolder: join(outputRoot, 'html') }],
    ['json', { outputFile: join(outputRoot, 'results.json') }],
  ],
  use: {
    baseURL,
    // 认证凭据不进入 trace/video；页面证据由 fixture 遮蔽输入后采集。
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium-desktop',
      testIgnore: '**/real-backend.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'responsive-tablet',
      testIgnore: '**/real-backend.spec.ts',
      use: {
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: 'responsive-mobile',
      testIgnore: '**/real-backend.spec.ts',
      use: {
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'real-backend',
      testMatch: '**/real-backend.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
});

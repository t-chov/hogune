import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'on-first-retry' },
  webServer: {
    command: 'pnpm run build && pnpm run preview -- --host 127.0.0.1',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'iPhone', use: { ...devices['iPhone 15'] } },
    { name: 'Pixel', use: { ...devices['Pixel 7'] } },
  ],
});

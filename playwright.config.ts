import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // Giao diện chọn ngôn ngữ theo trình duyệt => cố định tiếng Anh để selector ổn định.
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth-setup\.ts/,
    },
    {
      name: 'desktop-1280',
      dependencies: ['setup'],
      testIgnore: ['**/helpers/**'],
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'desktop-1440',
      dependencies: ['setup'],
      testIgnore: ['**/helpers/**'],
      use: { viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30000,
  },
});

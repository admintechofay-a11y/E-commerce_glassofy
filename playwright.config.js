const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    channel: 'chrome',
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Mobile-375px',
      use: {
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'Desktop-1440px',
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});

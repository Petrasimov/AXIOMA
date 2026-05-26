// playwright.config.js
// Помещается в корень проекта
// Запуск: npm run test:e2e
//         npx playwright test --ui  (с визуальным интерфейсом)

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // Запускаем dev-сервер автоматически перед E2E тестами
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    // Скриншот при падении теста
    screenshot: 'only-on-failure',
    // Видеозапись при падении
    video: 'on-first-retry',
    // Полный trace при ретрае
    trace: 'on-first-retry',
  },
  // Максимальное время одного E2E теста
  timeout: 30000,
  // Повторная попытка при нестабильной сети
  retries: process.env.CI ? 2 : 1,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Раскомментировать для кроссбраузерного тестирования:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari'] } },
  ],
  // Папка для отчётов и артефактов
  outputDir: 'test-results/',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
})
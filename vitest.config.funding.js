/**
 * vitest.config.funding.js
 *
 * Конфиг для запуска только funding-тестов:
 *   npm run test:funding
 *
 * Можно запустить отдельно от основного test suite
 * не трогая существующие 229 unit-тестов.
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'tests/unit/fundingUtils.test.js',
      'tests/unit/fundingActiveBar.test.js',
      'tests/unit/spotPickerModal.test.js',
      'tests/unit/fundingDetailModal.test.js',
      'tests/unit/fundingAppLogic.test.js',
    ],
    globals: true,
    setupFiles: ['tests/setup.js'],
  },
})
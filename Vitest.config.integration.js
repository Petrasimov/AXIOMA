// vitest.config.integration.js
// Конфигурация для интеграционных тестов (реальные HTTP и WebSocket запросы к биржам)
//
// Запуск: npx vitest run --config vitest.config.integration.js
//         npm run test:integration
//
// ⚠️  Требует запущенного dev-сервера: npm run dev

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Интеграционные тесты гоняются в Node — реальный fetch + реальный WebSocket
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.js'],
    // WS тесты могут занимать до 35с (KuCoin, Gate) — увеличен с 30000
    testTimeout: 40000,
    hookTimeout: 15000,
    // Не изолируем модули — нам нужен реальный fetch
    isolate: false,
    // Последовательное выполнение чтобы не превышать rate limits бирж
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
})
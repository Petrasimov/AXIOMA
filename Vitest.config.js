// vitest.config.js
// Помещается в корень проекта рядом с vite.config.js
// Запуск: npm test  (unit + integration)
//         npm run test:ui  (с визуальным интерфейсом)

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom — эмулирует браузерное окружение (sessionStorage, crypto, fetch)
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // Реальные запросы к биржам могут занимать до 15с
    testTimeout: 20000,
    hookTimeout: 10000,
    // Изолируем модули между тестами чтобы кэши не утекали
    isolate: true,
    // Покрытие кода
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js', 'src/**/*.jsx'],
      exclude: ['src/main.jsx', 'src/index.css'],
      reporter: ['text', 'html'],
    },
    // Разделяем unit и integration тесты
    include: ['tests/unit/**/*.test.js', 'tests/unit/**/*.test.jsx'],
  },
})
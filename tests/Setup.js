// tests/setup.js
// Загружается перед каждым тестовым файлом через vitest.config.js → setupFiles

import { vi, beforeEach, afterEach } from 'vitest'

// ─── Полифил Web Crypto API для Node/jsdom ───────────────────────────────────
// jsdom не реализует crypto.subtle — подключаем из Node.js
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
  })
}

// ─── Полифил TextEncoder / TextDecoder ───────────────────────────────────────
import { TextEncoder, TextDecoder } from 'node:util'
if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder
if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder

// ─── Полифил performance.now() ───────────────────────────────────────────────
if (!globalThis.performance) {
  globalThis.performance = { now: () => Date.now() }
}

// ─── Полифил Headers / Response / Request (fetch API) ────────────────────────
// jsdom частично поддерживает fetch — убеждаемся что всё есть
import { Headers, Response, Request, fetch as undiciFetch } from 'undici'
if (!globalThis.Headers)  globalThis.Headers  = Headers
if (!globalThis.Response) globalThis.Response = Response
if (!globalThis.Request)  globalThis.Request  = Request
if (!globalThis.fetch)    globalThis.fetch    = undiciFetch

// ─── Заглушки для import.meta.env (Vite env-переменные) ──────────────────────
// В тестах нет реального Vite — подставляем пустые строки
// Реальные ключи не нужны: coinStatus тесты мокают rlFetch
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_BINANCE_API_KEY:    'test_binance_key',
      VITE_BINANCE_API_SECRET: 'test_binance_secret',
      VITE_BYBIT_API_KEY:      'test_bybit_key',
      VITE_BYBIT_API_SECRET:   'test_bybit_secret',
      VITE_OKX_API_KEY:        'test_okx_key',
      VITE_OKX_API_SECRET:     'test_okx_secret',
      VITE_OKX_PASSPHRASE:     'test_okx_pass',
      VITE_MEXC_API_KEY:       'test_mexc_key',
      VITE_MEXC_API_SECRET:    'test_mexc_secret',
      VITE_BINGX_API_KEY:      'test_bingx_key',
      VITE_BINGX_API_SECRET:   'test_bingx_secret',
      VITE_BITGET_API_KEY:     'test_bitget_key',
      VITE_BITGET_API_SECRET:  'test_bitget_secret',
      VITE_BITGET_PASSPHRASE:  'test_bitget_pass',
      VITE_BOT_TOKEN:          'test_bot_token',
      MODE: 'test',
    }
  }
})

// ─── Сброс всех моков после каждого теста ────────────────────────────────────
afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllTimers()
})
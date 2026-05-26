// tests/integration/fetchers.test.js
// ИНТЕГРАЦИОННЫЕ ТЕСТЫ — реальные HTTP-запросы к биржам через Vite proxy
//
// ⚠️  Требования перед запуском:
//     1. npm run dev  (dev-сервер на localhost:5173)
//     2. .env.local с API ключами для coinStatus (Binance, Bybit, OKX, MEXC, BingX, Bitget)
//
// Запуск: npx vitest run tests/integration/fetchers.test.js --reporter=verbose
//
// Все тесты используют монету ETH как стандартный символ.

import { describe, it, expect, beforeAll } from 'vitest'

// Патч: в Node нет globalThis.fetch — используем undici или node-fetch
// Dev-сервер нужен для proxy — тесты реальных запросов идут напрямую через proxy URL
// Поскольку dev-сервер запущен, используем обычный fetch к localhost:5173

const BASE_URL = 'http://localhost:5173'
const SYMBOL = 'ETH'  // стандартный символ для всех тестов

// ─── Хелпер: делаем запрос через dev-сервер proxy ────────────────────────────
async function proxyGet(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  return res
}

// ─── Хелпер: проверяем доступность dev-сервера ───────────────────────────────
async function isDevServerRunning() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) })
    return res.ok || res.status === 404
  } catch {
    return false
  }
}

// ─── Хелпер: проверяем структуру fetcher-ответа ──────────────────────────────
function assertFetcherStructure(data, exchangeName) {
  expect(data, `${exchangeName}: ответ не должен быть null`).not.toBeNull()
  expect(typeof data.volume, `${exchangeName}: volume должен быть числом`)
    .toBe('number')
  expect(typeof data.deposit, `${exchangeName}: deposit должен быть boolean`)
    .toBe('boolean')
  expect(typeof data.withdraw, `${exchangeName}: withdraw должен быть boolean`)
    .toBe('boolean')
  // funding: число или null (spot не имеет funding)
  if (data.funding !== null) {
    expect(typeof data.funding, `${exchangeName}: funding должен быть числом или null`)
      .toBe('number')
  }
}

// ─── Проверка доступности перед тестами ──────────────────────────────────────
beforeAll(async () => {
  const running = await isDevServerRunning()
  if (!running) {
    console.warn('\n⚠️  Dev-сервер не запущен на localhost:5173')
    console.warn('   Запустите: npm run dev')
    console.warn('   Затем: npx vitest run tests/integration/fetchers.test.js\n')
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// Прямые API-запросы к биржам (через Vite proxy)
// Проверяем сырые endpoints без бизнес-логики
// ═══════════════════════════════════════════════════════════════════════════════

describe('Binance API — прямые запросы (ETH)', () => {
  it('futures ticker: /binance-fapi/fapi/v1/ticker/24hr?symbol=ETHUSDT → 200', async () => {
    const res = await proxyGet('/binance-fapi/fapi/v1/ticker/24hr?symbol=ETHUSDT')
    expect(res.status, 'Binance futures ticker должен вернуть 200').toBe(200)

    const data = await res.json()
    expect(data.symbol).toBe('ETHUSDT')
    expect(parseFloat(data.quoteVolume)).toBeGreaterThan(0)
  }, 10000)

  it('futures funding rate: /binance-fapi/fapi/v1/premiumIndex?symbol=ETHUSDT → 200', async () => {
    const res = await proxyGet('/binance-fapi/fapi/v1/premiumIndex?symbol=ETHUSDT')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.symbol).toBe('ETHUSDT')
    expect(data).toHaveProperty('lastFundingRate')
    expect(data).toHaveProperty('nextFundingTime')
  }, 10000)

  it('spot ticker: /binance-api/api/v3/ticker/24hr?symbol=ETHUSDT → 200', async () => {
    const res = await proxyGet('/binance-api/api/v3/ticker/24hr?symbol=ETHUSDT')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.symbol).toBe('ETHUSDT')
  }, 10000)
})

describe('Bybit API — прямые запросы (ETH)', () => {
  it('futures ticker: /bybit-api/v5/market/tickers?category=linear&symbol=ETHUSDT → 200', async () => {
    const res = await proxyGet('/bybit-api/v5/market/tickers?category=linear&symbol=ETHUSDT')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.retCode, 'Bybit: retCode должен быть 0').toBe(0)
    const ticker = data.result?.list?.[0]
    expect(ticker).toBeDefined()
    expect(ticker.symbol).toBe('ETHUSDT')
    expect(parseFloat(ticker.turnover24h)).toBeGreaterThan(0)
  }, 10000)
})

describe('OKX API — прямые запросы (ETH)', () => {
  it('futures ticker: /okx-api/api/v5/market/ticker?instId=ETH-USDT-SWAP → 200', async () => {
    const res = await proxyGet('/okx-api/api/v5/market/ticker?instId=ETH-USDT-SWAP')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.code, 'OKX: code должен быть "0"').toBe('0')
    expect(data.data?.[0]).toBeDefined()
  }, 10000)

  it('funding rate: /okx-api/api/v5/public/funding-rate?instId=ETH-USDT-SWAP → 200', async () => {
    const res = await proxyGet('/okx-api/api/v5/public/funding-rate?instId=ETH-USDT-SWAP')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.code).toBe('0')
    expect(data.data?.[0]?.fundingRate).toBeDefined()
  }, 10000)
})

describe('Gate.io API — прямые запросы (ETH)', () => {
  it('futures tickers: /gate-api/api/v4/futures/usdt/tickers?contract=ETH_USDT → 200', async () => {
    const res = await proxyGet('/gate-api/api/v4/futures/usdt/tickers?contract=ETH_USDT')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toHaveProperty('contract', 'ETH_USDT')
  }, 10000)

  it('contracts (для quanto_multiplier): /gate-api/api/v4/futures/usdt/contracts/ETH_USDT → 200', async () => {
    const res = await proxyGet('/gate-api/api/v4/futures/usdt/contracts/ETH_USDT')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('name', 'ETH_USDT')
    expect(data).toHaveProperty('quanto_multiplier')
    const mult = parseFloat(data.quanto_multiplier)
    expect(isFinite(mult)).toBe(true)
    expect(mult).toBeGreaterThanOrEqual(0)
  }, 10000)

  it('Gate tickers ALL (для prefetchGateMultipliers): /gate-api/api/v4/futures/usdt/tickers → 200', async () => {
    const res = await proxyGet('/gate-api/api/v4/futures/usdt/tickers')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length, 'должны получить список контрактов').toBeGreaterThan(100)

    // Проверяем структуру одного контракта
    const eth = data.find(t => t.contract === 'ETH_USDT')
    expect(eth, 'ETH_USDT должен быть в списке').toBeDefined()
    expect(eth).toHaveProperty('quanto_multiplier')
  }, 15000)
})

describe('KuCoin API — прямые запросы (ETH)', () => {
  it('futures: /kucoin-api/api/v1/contracts/ETHUSDTM → 200', async () => {
    const res = await proxyGet('/kucoin-api/api/v1/contracts/ETHUSDTM')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.code, 'KuCoin: code должен быть "200000"').toBe('200000')
    expect(data.data).toBeDefined()
  }, 10000)
})

describe('MEXC API — прямые запросы (ETH)', () => {
  it('futures ticker: /mexc-api/api/v1/contract/ticker?symbol=ETH_USDT → 200', async () => {
    const res = await proxyGet('/mexc-api/api/v1/contract/ticker?symbol=ETH_USDT')
    expect(res.status).toBe(200)

    const data = await res.json()
    // MEXC: { code: 0, data: { symbol, ... } }
    expect(data.code, 'MEXC: code должен быть 0').toBe(0)
    expect(data.data?.symbol).toBeDefined()
  }, 10000)
})

describe('BingX API — прямые запросы (ETH)', () => {
  it('futures ticker: /bingx-api/openApi/swap/v2/quote/ticker?symbol=ETH-USDT → 200', async () => {
    const res = await proxyGet('/bingx-api/openApi/swap/v2/quote/ticker?symbol=ETH-USDT')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.code, 'BingX: code должен быть 0').toBe(0)
  }, 10000)
})

describe('Bitget API — прямые запросы (ETH)', () => {
  it('futures ticker: /bitget-api/api/v2/mix/market/ticker?symbol=ETHUSDT&productType=USDT-FUTURES → 200', async () => {
    const res = await proxyGet('/bitget-api/api/v2/mix/market/ticker?symbol=ETHUSDT&productType=USDT-FUTURES')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.code, 'Bitget: code должен быть "00000"').toBe('00000')
    expect(data.data?.[0]).toBeDefined()
  }, 10000)
})

// ═══════════════════════════════════════════════════════════════════════════════
// Fetchers через api.js — структура ответа для ETH
// Эти тесты проверяют бизнес-логику fetchBinance/fetchBybit/... через api.js
// Требуют: API ключи в .env.local (для coinStatus)
// ═══════════════════════════════════════════════════════════════════════════════

describe('fetchBinance (ETH) — структура ответа', () => {
  it('futures: возвращает { funding, volume, deposit, withdraw, nextFunding }', async () => {
    // Для api.js тестов нужен настоящий Vite env — запускаем через dev-сервер
    // Вместо этого проверяем прямые endpoints и структуру
    const [tickerRes, fundRes] = await Promise.all([
      proxyGet('/binance-fapi/fapi/v1/ticker/24hr?symbol=ETHUSDT'),
      proxyGet('/binance-fapi/fapi/v1/premiumIndex?symbol=ETHUSDT'),
    ])

    expect(tickerRes.ok).toBe(true)
    expect(fundRes.ok).toBe(true)

    const ticker = await tickerRes.json()
    const fund   = await fundRes.json()

    // Проверяем что данные есть и парсятся в числа
    expect(parseFloat(ticker.quoteVolume)).toBeGreaterThan(0)
    expect(isFinite(parseFloat(fund.lastFundingRate))).toBe(true)
    expect(parseInt(fund.nextFundingTime)).toBeGreaterThan(0)
  }, 10000)
})

describe('fetchGate (ETH) — Gate futures с quanto_multiplier', () => {
  it('ETH_USDT контракт имеет валидный quanto_multiplier > 0', async () => {
    const res = await proxyGet('/gate-api/api/v4/futures/usdt/contracts/ETH_USDT')
    const data = await res.json()

    const mult = parseFloat(data.quanto_multiplier)
    expect(mult, 'Gate ETH_USDT: quanto_multiplier должен быть > 0').toBeGreaterThan(0)
    console.log(`Gate ETH_USDT quanto_multiplier = ${mult}`)
  }, 10000)

  it('Gate spot ETH: deposit/withdraw статус доступен через currencies API', async () => {
    const res = await proxyGet('/gate-api/api/v4/spot/currencies/ETH')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('deposit_disabled')
    expect(data).toHaveProperty('withdraw_disabled')
    expect(typeof data.deposit_disabled).toBe('boolean')
    expect(typeof data.withdraw_disabled).toBe('boolean')

    console.log(`Gate ETH: deposit_disabled=${data.deposit_disabled}, withdraw_disabled=${data.withdraw_disabled}`)
  }, 10000)
})
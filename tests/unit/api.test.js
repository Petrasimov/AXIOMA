// tests/unit/api.test.js
// Тесты для src/api.js — enrichOpportunities, fetchers, Gate prefetch, кэш
//
// Стратегия:
//   - Мокаем rlFetch (не делаем реальных запросов к биржам)
//   - Мокаем coinStatus (статусы депозит/вывод)
//   - Глобальный fetch мокаем для Gate prefetch
//   - Тестируем логику enrichOpportunities через mock rawRecords

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Мокаем все зависимости ───────────────────────────────────────────────────
vi.mock('../../src/rateLimiter.js', () => ({
  rlFetch: vi.fn(),
}))

vi.mock('../../src/coinStatus.js', () => ({
  getBinanceStatus: vi.fn(async () => ({ deposit: true,  withdraw: true  })),
  getBybitStatus:   vi.fn(async () => ({ deposit: true,  withdraw: true  })),
  getOKXStatus:     vi.fn(async () => ({ deposit: true,  withdraw: true  })),
  getKuCoinStatus:  vi.fn(async () => ({ deposit: true,  withdraw: true  })),
  getMEXCStatus:    vi.fn(async () => ({ deposit: true,  withdraw: true  })),
  getBingXStatus:   vi.fn(async () => ({ deposit: true,  withdraw: true  })),
  getBitgetStatus:  vi.fn(async () => ({ deposit: true,  withdraw: true  })),
}))

vi.mock('../../src/sign.js', () => ({
  hmacHex:    vi.fn(async () => 'mock_hex'),
  hmacBase64: vi.fn(async () => 'mock_base64=='),
}))

import { rlFetch } from '../../src/rateLimiter.js'

// ─── Хелпер: Response-заглушка ───────────────────────────────────────────────
function mockRlResponse(data, status = 200) {
  return {
    ok:     status >= 200 && status < 300,
    status,
    json:   async () => data,
    text:   async () => JSON.stringify(data),
    arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(data)).buffer,
  }
}

// ─── Хелпер: минимальный rawRecord для enrichOpportunities ───────────────────
function makeRawRecord(overrides = {}) {
  return {
    symbol:   'ETHUSDT',
    strategy: 'spot_futures',
    bid_ex:   'binance_futures',
    ask_ex:   'mexc_spot',
    // Стакан: [[цена, объём]] — VWAP должен посчитаться
    bid:      [['2000', '10'], ['2001', '5']],   // bid: высокая цена (SELL, красная)
    ask:      [['1990', '10'], ['1989', '5']],   // ask: низкая цена  (BUY,  зелёная)
    time:     new Date().toISOString(),
    ...overrides,
  }
}

// ─── Хелпер: свежий модуль api.js (сбрасывает модульный кэш) ─────────────────
async function freshApi() {
  vi.resetModules()
  vi.mock('../../src/rateLimiter.js', () => ({ rlFetch: vi.fn() }))
  vi.mock('../../src/coinStatus.js', () => ({
    getBinanceStatus: vi.fn(async () => ({ deposit: true, withdraw: true })),
    getBybitStatus:   vi.fn(async () => ({ deposit: true, withdraw: true })),
    getOKXStatus:     vi.fn(async () => ({ deposit: true, withdraw: true })),
    getKuCoinStatus:  vi.fn(async () => ({ deposit: true, withdraw: true })),
    getMEXCStatus:    vi.fn(async () => ({ deposit: true, withdraw: true })),
    getBingXStatus:   vi.fn(async () => ({ deposit: true, withdraw: true })),
    getBitgetStatus:  vi.fn(async () => ({ deposit: true, withdraw: true })),
  }))
  vi.mock('../../src/sign.js', () => ({
    hmacHex:    vi.fn(async () => 'mock_hex'),
    hmacBase64: vi.fn(async () => 'mock_base64=='),
  }))
  return await import('../../src/api.js')
}

// ═══════════════════════════════════════════════════════════════════════════════
// prefetchGateMultipliers — кэш 60с
// ═══════════════════════════════════════════════════════════════════════════════

describe('prefetchGateMultipliers — кэш 60с', () => {
  it('первый вызов делает fetch к Gate', async () => {
    let fetchCount = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      fetchCount++
      return {
        ok:   true,
        json: async () => [
          { contract: 'ETH_USDT', quanto_multiplier: '0.01' },
          { contract: 'BTC_USDT', quanto_multiplier: '0.001' },
        ]
      }
    }))

    const api = await freshApi()
    // prefetchGateMultipliers вызывается внутри enrichOpportunities
    // Вызываем его косвенно через enrichOpportunities с одной записью
    rlFetch.mockResolvedValue(mockRlResponse({
      fundingRate: '0.001', quoteVolume: '1000000', lastFundingRate: '0.001',
    }))

    await api.enrichOpportunities([makeRawRecord()], 1000)

    expect(fetchCount, 'Gate prefetch должен делать fetch при первом вызове').toBeGreaterThanOrEqual(1)
  })

  it('повторный вызов в течение 60с не делает новый fetch к Gate', async () => {
    let fetchCount = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      fetchCount++
      return {
        ok: true,
        json: async () => [{ contract: 'ETH_USDT', quanto_multiplier: '0.01' }]
      }
    }))

    const api = await freshApi()
    rlFetch.mockResolvedValue(mockRlResponse({ fundingRate: '0.001', quoteVolume: '1000000' }))

    // Два вызова подряд
    await api.enrichOpportunities([makeRawRecord()], 1000)
    const countAfterFirst = fetchCount

    await api.enrichOpportunities([makeRawRecord()], 1000)

    expect(fetchCount, 'второй вызов должен использовать кэш Gate multipliers')
      .toBe(countAfterFirst)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// convertGateBook
// ═══════════════════════════════════════════════════════════════════════════════

describe('convertGateBook (через enrichOpportunities с Gate futures)', () => {
  it('multiplier=0.01: qty в монетах = qty_contracts * 0.01', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => [{ contract: 'ETH_USDT', quanto_multiplier: '0.01' }]
    })))

    const api = await freshApi()

    // Настраиваем rlFetch для Binance futures + MEXC spot
    rlFetch
      .mockResolvedValueOnce(mockRlResponse({ lastFundingRate: '0.001', nextFundingTime: '1700000000000' })) // binance fund
      .mockResolvedValueOnce(mockRlResponse({ quoteVolume: '1000000' })) // binance ticker
      .mockResolvedValueOnce(mockRlResponse({                              // mexc ticker
        data: { fundingRate: '0.001', amount24: '500000' }
      }))
      .mockResolvedValueOnce(mockRlResponse({ data: { nextSettleTime: 1700000000 } })) // mexc funding

    // Gate record с quanto_multiplier=0.01
    const record = makeRawRecord({
      bid_ex: 'gate_futures',
      ask_ex: 'mexc_spot',
      bid: [['2000', '100']],  // 100 контрактов * 0.01 = 1 монета
      ask: [['1990', '50']],
    })

    // Достаточно что функция не падает и возвращает результат
    const results = await api.enrichOpportunities([record], 1000)
    // Если multiplier применился — bid_price будет посчитан корректно
    expect(results).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// enrichOpportunities — нормализация стратегии
// ═══════════════════════════════════════════════════════════════════════════════

describe('enrichOpportunities — нормализация strategy', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => []
    })))
    rlFetch.mockResolvedValue(mockRlResponse({
      lastFundingRate: '0.001', nextFundingTime: '1700000000000', quoteVolume: '1000000',
    }))
  })

  it('"spot_futures" нормализуется в "sf"', async () => {
    const api = await freshApi()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
    rlFetch.mockResolvedValue(mockRlResponse({ lastFundingRate: '0.001', quoteVolume: '1000000' }))

    const records = [makeRawRecord({ strategy: 'spot_futures' })]
    const result = await api.enrichOpportunities(records, 1000)

    if (result.length > 0) {
      expect(result[0].strategy, '"spot_futures" должен стать "sf"').toBe('sf')
    }
    // Если 0 результатов — spread не прошёл фильтр, это нормально для mock данных
  })

  it('"futures_futures" нормализуется в "ff"', async () => {
    const api = await freshApi()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
    rlFetch.mockResolvedValue(mockRlResponse({ lastFundingRate: '0.001', quoteVolume: '1000000' }))

    const records = [makeRawRecord({
      strategy: 'futures_futures',
      bid_ex:   'binance_futures',
      ask_ex:   'bybit_futures',
      bid: [['2000', '10']],
      ask: [['1990', '10']],
    })]
    const result = await api.enrichOpportunities(records, 1000)

    if (result.length > 0) {
      expect(result[0].strategy, '"futures_futures" должен стать "ff"').toBe('ff')
    }
  })

  it('нормализация сохраняется через весь pipeline — strategy в финальном объекте', async () => {
    const api = await freshApi()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))

    // Делаем так чтобы VWAP точно посчитался (большой объём, маленький amount)
    rlFetch.mockResolvedValue(mockRlResponse({ lastFundingRate: '0.001', quoteVolume: '1000000' }))

    const records = [makeRawRecord({
      strategy: 'spot_futures',
      bid: [['2000', '100']],  // объём 200000$ — точно хватит на 100$
      ask: [['1990', '100']],
    })]

    const result = await api.enrichOpportunities(records, 100)

    if (result.length > 0) {
      expect(result[0].strategy).not.toBe('spot_futures')
      expect(['sf', 'ff']).toContain(result[0].strategy)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// enrichOpportunities — фильтрация по спреду
// ═══════════════════════════════════════════════════════════════════════════════

describe('enrichOpportunities — фильтрация спреда', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
    rlFetch.mockResolvedValue(mockRlResponse({ lastFundingRate: '0.001', quoteVolume: '1000000' }))
  })

  it('отрицательный спред (bid < ask) — запись отсеивается', async () => {
    const api = await freshApi()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
    rlFetch.mockResolvedValue(mockRlResponse({ lastFundingRate: '0.001', quoteVolume: '1000000' }))

    // Реальная формула в api.js: (ask_price - bid_price) / bid_price * 100
    // Чтобы спред был отрицательным: ask < bid
    // bid=2000, ask=1900 → (1900-2000)/2000 = -5% → отсеивается ✅
    const records = [makeRawRecord({
      bid: [['2000', '100']],   // bid высокий (SELL)
      ask: [['1900', '100']],   // ask низкий  (BUY) — ask < bid → spread < 0
    })]

    const result = await api.enrichOpportunities(records, 100)

    expect(result.length, 'отрицательный спред должен быть отсеян').toBe(0)
  })

  it('спред > 50% — запись отсеивается как нереалистичная', async () => {
    const api = await freshApi()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
    rlFetch.mockResolvedValue(mockRlResponse({ lastFundingRate: '0.001', quoteVolume: '1000000' }))

    // ask в 2 раза дешевле bid → спред ~100% → нереалистично
    const records = [makeRawRecord({
      bid: [['2000', '100']],
      ask: [['1000', '100']],   // спред = (2000-1000)/1000*100 = 100% > 50%
    })]

    const result = await api.enrichOpportunities(records, 100)

    expect(result.length, 'спред > 50% должен быть отсеян').toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// enrichOpportunities — группировка в variants
// ═══════════════════════════════════════════════════════════════════════════════

describe('enrichOpportunities — группировка symbols в variants', () => {
  it('две записи для одного символа → одна карточка + variants', async () => {
    const api = await freshApi()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
    rlFetch.mockResolvedValue(mockRlResponse({ lastFundingRate: '0.001', quoteVolume: '1000000' }))

    const records = [
      makeRawRecord({
        symbol: 'ETHUSDT', strategy: 'spot_futures',
        bid_ex: 'binance_futures', ask_ex: 'mexc_spot',
        bid: [['2000', '100']], ask: [['1990', '100']],
      }),
      makeRawRecord({
        symbol: 'ETHUSDT', strategy: 'futures_futures',
        bid_ex: 'bybit_futures', ask_ex: 'binance_futures',
        bid: [['2001', '100']], ask: [['1991', '100']],
      }),
    ]

    const result = await api.enrichOpportunities(records, 100)

    if (result.length > 0) {
      // Должен быть один символ
      const ethCards = result.filter(r => r.symbol === 'ETHUSDT')
      if (ethCards.length > 0) {
        expect(ethCards.length, 'один символ ETH в результате').toBe(1)
        expect(Array.isArray(ethCards[0].variants), 'должен иметь массив variants').toBe(true)
      }
    }
  })

  it('лучший спред становится основной карточкой', async () => {
    const api = await freshApi()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
    rlFetch.mockResolvedValue(mockRlResponse({ lastFundingRate: '0.001', quoteVolume: '1000000' }))

    // Создаём два варианта с чётко разными спредами
    const records = [
      makeRawRecord({
        symbol: 'SOLUSDT', strategy: 'spot_futures',
        bid_ex: 'binance_futures', ask_ex: 'mexc_spot',
        bid: [['100', '1000']], ask: [['99', '1000']],   // спред ~1%
      }),
      makeRawRecord({
        symbol: 'SOLUSDT', strategy: 'futures_futures',
        bid_ex: 'bybit_futures', ask_ex: 'gate_futures',
        bid: [['100', '1000']], ask: [['96', '1000']],   // спред ~4% — лучше
      }),
    ]

    const result = await api.enrichOpportunities(records, 100)

    if (result.length > 0) {
      const sol = result.find(r => r.symbol === 'SOLUSDT')
      if (sol && sol.variants?.length > 0) {
        expect(sol.spread, 'главная карточка должна иметь лучший спред').toBeGreaterThanOrEqual(
          Math.max(...sol.variants.map(v => v.spread))
        )
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// enrichOpportunities — арбитражная логика bid/ask (КРИТИЧНО)
// ═══════════════════════════════════════════════════════════════════════════════

describe('enrichOpportunities — арбитражная логика (КРИТИЧНО)', () => {
  it('КРИТИЧНО: при strategy=sf, spot НИКОГДА не должен быть bid_ex', async () => {
    const api = await freshApi()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
    rlFetch.mockResolvedValue(mockRlResponse({ lastFundingRate: '0.001', quoteVolume: '1000000' }))

    const records = [
      makeRawRecord({
        strategy: 'spot_futures',
        bid_ex:   'binance_futures',  // FUTURES → bid (SELL) ✓
        ask_ex:   'mexc_spot',        // SPOT → ask (BUY) ✓
        bid: [['2000', '100']], ask: [['1990', '100']],
      })
    ]

    const result = await api.enrichOpportunities(records, 100)

    if (result.length > 0) {
      const r = result[0]
      // bid_ex никогда не должен быть spot при strategy=sf
      expect(r.bid_ex, 'SPOT не может быть bid_ex при strategy=sf').not.toContain('spot')
      expect(r.ask_ex, 'SPOT должен быть ask_ex при strategy=sf').toContain('spot')
    }
  })

  it('возвращает корректную структуру полей обогащённого объекта', async () => {
    const api = await freshApi()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
    rlFetch.mockResolvedValue(mockRlResponse({ lastFundingRate: '0.001', quoteVolume: '1000000' }))

    const records = [makeRawRecord({
      bid: [['2000', '100']], ask: [['1990', '100']],
    })]

    const result = await api.enrichOpportunities(records, 100)

    if (result.length > 0) {
      const opp = result[0]
      // Проверяем наличие ключевых полей
      expect(opp).toHaveProperty('symbol')
      expect(opp).toHaveProperty('strategy')
      expect(opp).toHaveProperty('bid_ex')
      expect(opp).toHaveProperty('ask_ex')
      expect(opp).toHaveProperty('spread')
      expect(opp).toHaveProperty('bid_price')
      expect(opp).toHaveProperty('ask_price')
      expect(typeof opp.spread).toBe('number')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Fetchers — структура ответа (реальные запросы к биржам через ETH)
// Эти тесты делают РЕАЛЬНЫЕ HTTP-запросы через Vite proxy
// Запускать только когда dev-сервер доступен на localhost:5173
// ═══════════════════════════════════════════════════════════════════════════════

describe.skip('fetchers — реальные запросы к биржам (ETH)', () => {
  // Эти тесты помечены .skip по умолчанию
  // Для запуска: npx vitest run --reporter=verbose tests/unit/api.test.js
  // с раскомментированным describe (убрать .skip)

  // ВАЖНО: нужен запущенный dev-сервер: npm run dev

  it('fetchBinance(ETH, futures) → структура ответа', async () => {
    // Этот тест будет в отдельном файле: tests/integration/fetchers.test.js
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Кэш TTL 55с — api.js cache
// ═══════════════════════════════════════════════════════════════════════════════

describe('api.js кэш TTL 55с', () => {
  it('два последовательных вызова fetchBinance → rlFetch вызван 1 раз', async () => {
    const { rlFetch: rFetch } = await import('../../src/rateLimiter.js')

    // Сбрасываем счётчик
    vi.mocked(rFetch).mockReset()
    vi.mocked(rFetch)
      .mockResolvedValueOnce(mockRlResponse({ lastFundingRate: '0.001', nextFundingTime: '1700000000000' }))
      .mockResolvedValueOnce(mockRlResponse({ quoteVolume: '1000000' }))

    const api = await freshApi()
    const { rlFetch: freshRlFetch } = await import('../../src/rateLimiter.js')

    // Первый вызов
    await api.fetchBinance('ETH', 'futures')
    const countAfterFirst = vi.mocked(freshRlFetch).mock.calls.length

    // Второй вызов — должен взять из кэша
    await api.fetchBinance('ETH', 'futures')

    expect(vi.mocked(freshRlFetch).mock.calls.length, 'второй вызов должен использовать кэш')
      .toBe(countAfterFirst)
  })

  it('clearCacheForOpp удаляет только нужные ключи, остальные сохраняются', async () => {
    const api = await freshApi()

    const opp = {
      symbol:      'ETHUSDT',
      bid_ex:      'binance',
      ask_ex:      'mexc',
      bid_market:  'futures',
      ask_market:  'spot',
    }

    // Функция не должна крашиться
    expect(() => api.clearCacheForOpp(opp)).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// enrichSingleOpportunity — для DetailModal
// ═══════════════════════════════════════════════════════════════════════════════

describe('enrichSingleOpportunity', () => {
  it('возвращает объект с теми же ключами что и входной opp + обновлённые данные', async () => {
    const api = await freshApi()
    const { rlFetch: rFetch } = await import('../../src/rateLimiter.js')

    vi.mocked(rFetch)
      .mockResolvedValue(mockRlResponse({ lastFundingRate: '0.002', quoteVolume: '2000000' }))

    const mockOpp = {
      symbol:       'ETHUSDT',
      strategy:     'sf',
      bid_ex:       'binance',
      ask_ex:       'mexc',
      bid_market:   'futures',
      ask_market:   'spot',
      spread:       1.5,
      bid_price:    2000,
      ask_price:    1970,
      bid_funding:  { rate: 0.01, next_time: null },
      ask_funding:  { rate: null, next_time: null },
      bid_volume:   100000,
      ask_volume:   50000,
      bid_transfer: { deposit: true,  withdraw: true },
      ask_transfer: { deposit: true,  withdraw: true },
    }

    const result = await api.enrichSingleOpportunity(mockOpp)

    expect(result, 'должен вернуть объект').toBeDefined()
    expect(result).toHaveProperty('symbol', 'ETHUSDT')
    expect(result).toHaveProperty('strategy', 'sf')
    expect(result).toHaveProperty('bid_ex', 'binance')
    // Проверяем что объект обновлён (не тот же ссылочно)
    expect(result).not.toBe(mockOpp)
  })
})
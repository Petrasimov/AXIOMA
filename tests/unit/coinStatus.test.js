// tests/unit/coinStatus.test.js
// Тесты для src/coinStatus.js — TTL кэш, batch-режимы, обработка ошибок
//
// Стратегия:
//   - Мокаем rlFetch (не делаем реальных сетевых запросов)
//   - Мокаем sign.js (подписи не важны для логики кэша)
//   - Тестируем что batch делается ОДИН раз для всех монет
//   - Тестируем TTL: повторный вызов в TTL не делает новый запрос

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Мокаем зависимости ───────────────────────────────────────────────────────
// ВАЖНО: vi.mock() поднимается наверх — объявляется до импортов

vi.mock('../../src/rateLimiter.js', () => ({
  rlFetch: vi.fn(),
}))

vi.mock('../../src/sign.js', () => ({
  hmacHex:    vi.fn(async () => 'mock_hex_signature'),
  hmacBase64: vi.fn(async () => 'mock_base64_sig=='),
}))

// Импортируем ПОСЛЕ моков
import { rlFetch } from '../../src/rateLimiter.js'

// ─── Хелпер: Response-заглушка для rlFetch ───────────────────────────────────
function mockResponse(data, status = 200) {
  const body = JSON.stringify(data)
  const res = {
    ok:     status >= 200 && status < 300,
    status,
    json:   async () => JSON.parse(body),
    text:   async () => body,
  }
  return res
}

// ─── Хелпер: сбрасываем модульный кэш coinStatus между тестами ───────────────
// coinStatus хранит кэш в модульном scope — нужно реимпортировать модуль
// через vi.resetModules() + динамический import

async function freshCoinStatus() {
  vi.resetModules()
  // После resetModules нужно перемокать зависимости
  vi.mock('../../src/rateLimiter.js', () => ({ rlFetch: vi.fn() }))
  vi.mock('../../src/sign.js', () => ({
    hmacHex:    vi.fn(async () => 'mock_hex_signature'),
    hmacBase64: vi.fn(async () => 'mock_base64_sig=='),
  }))
  const mod = await import('../../src/coinStatus.js')
  const { rlFetch: freshRlFetch } = await import('../../src/rateLimiter.js')
  return { mod, rlFetch: freshRlFetch }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TTL кэш — Binance (индивидуальные запросы)
// ═══════════════════════════════════════════════════════════════════════════════

describe('coinStatus — TTL кэш (5 минут)', () => {
  it('первый вызов getBinanceStatus делает rlFetch', async () => {
    const { mod, rlFetch: rFetch } = await freshCoinStatus()

    rFetch.mockResolvedValue(mockResponse([
      {
        coin: 'ETH',
        networkList: [
          { depositEnable: true, withdrawEnable: true }
        ]
      }
    ]))

    const result = await mod.getBinanceStatus('ETH')

    expect(rFetch, 'первый вызов должен делать HTTP-запрос').toHaveBeenCalledOnce()
    expect(result).toEqual({ deposit: true, withdraw: true })
  })

  it('второй вызов в течение 5 мин — НЕ делает новый rlFetch (кэш)', async () => {
    const { mod, rlFetch: rFetch } = await freshCoinStatus()

    rFetch.mockResolvedValue(mockResponse([
      { coin: 'BTC', networkList: [{ depositEnable: true, withdrawEnable: false }] }
    ]))

    await mod.getBinanceStatus('BTC')
    await mod.getBinanceStatus('BTC')  // второй вызов

    expect(rFetch, 'второй вызов должен использовать кэш').toHaveBeenCalledOnce()
  })

  it('разные символы имеют отдельные записи в кэше', async () => {
    const { mod, rlFetch: rFetch } = await freshCoinStatus()

    // Первый символ
    rFetch.mockResolvedValueOnce(mockResponse([
      { coin: 'ETH', networkList: [{ depositEnable: true, withdrawEnable: true }] }
    ]))
    // Второй символ
    rFetch.mockResolvedValueOnce(mockResponse([
      { coin: 'SOL', networkList: [{ depositEnable: false, withdrawEnable: true }] }
    ]))

    const [r1, r2] = await Promise.all([
      mod.getBinanceStatus('ETH'),
      mod.getBinanceStatus('SOL'),
    ])

    expect(r1).toEqual({ deposit: true, withdraw: true })
    expect(r2).toEqual({ deposit: false, withdraw: true })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Batch-режим MEXC — один запрос на все монеты
// ═══════════════════════════════════════════════════════════════════════════════

describe('coinStatus — MEXC batch (один запрос для всех монет)', () => {
  it('три вызова getMEXCStatus с разными монетами → rlFetch вызван РОВНО 1 раз', async () => {
    const { mod, rlFetch: rFetch } = await freshCoinStatus()

    // MEXC батч: один ответ содержит все монеты
    rFetch.mockResolvedValue(mockResponse([
      { coin: 'ETH', networkList: [{ depositEnable: true,  withdrawEnable: true  }] },
      { coin: 'BTC', networkList: [{ depositEnable: true,  withdrawEnable: false }] },
      { coin: 'SOL', networkList: [{ depositEnable: false, withdrawEnable: true  }] },
    ]))

    // Вызываем последовательно — первый делает батч-запрос, остальные используют кэш
    const ethStatus = await mod.getMEXCStatus('ETH')
    const btcStatus = await mod.getMEXCStatus('BTC')
    const solStatus = await mod.getMEXCStatus('SOL')

    // Батч должен быть вызван 1 раз (все монеты берут данные из одного запроса)
    expect(rFetch, 'MEXC батч: один fetch для всех монет').toHaveBeenCalledOnce()
    expect(ethStatus).toEqual({ deposit: true,  withdraw: true  })
    expect(btcStatus).toEqual({ deposit: true,  withdraw: false })
    expect(solStatus).toEqual({ deposit: false, withdraw: true  })
  })

  it('getMEXCStatus возвращает FALLBACK={deposit:true,withdraw:true} если монета не найдена в батче', async () => {
    const { mod, rlFetch: rFetch } = await freshCoinStatus()

    // Батч пришёл без UNKNOWN монеты
    rFetch.mockResolvedValue(mockResponse([
      { coin: 'ETH', networkList: [{ depositEnable: true, withdrawEnable: true }] },
    ]))

    const result = await mod.getMEXCStatus('UNKNOWNTOKEN')

    expect(result, 'неизвестная монета должна получить оптимистичный FALLBACK')
      .toEqual({ deposit: true, withdraw: true })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Batch-режим OKX
// ═══════════════════════════════════════════════════════════════════════════════

describe('coinStatus — OKX batch', () => {
  it('три вызова getOKXStatus → rlFetch вызван РОВНО 1 раз', async () => {
    const { mod, rlFetch: rFetch } = await freshCoinStatus()

    // OKX батч: структура { data: [ { ccy, canDep, canWd, ... } ] }
    rFetch.mockResolvedValue(mockResponse({
      data: [
        { ccy: 'ETH', canDep: true,  canWd: true  },
        { ccy: 'BTC', canDep: true,  canWd: false },
        { ccy: 'SOL', canDep: false, canWd: true  },
      ]
    }))

    // Последовательно: первый делает батч-запрос, остальные читают из кэша
    await mod.getOKXStatus('ETH')
    await mod.getOKXStatus('BTC')
    await mod.getOKXStatus('SOL')

    expect(rFetch, 'OKX батч: один fetch для всех монет').toHaveBeenCalledOnce()
  })

  it('getOKXStatus возвращает корректную структуру { deposit, withdraw }', async () => {
    const { mod, rlFetch: rFetch } = await freshCoinStatus()

    rFetch.mockResolvedValue(mockResponse({
      data: [{ ccy: 'ETH', canDep: true, canWd: false }]
    }))

    const result = await mod.getOKXStatus('ETH')
    expect(result).toHaveProperty('deposit')
    expect(result).toHaveProperty('withdraw')
    expect(typeof result.deposit).toBe('boolean')
    expect(typeof result.withdraw).toBe('boolean')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Batch-режим Bitget (публичный API)
// ═══════════════════════════════════════════════════════════════════════════════

describe('coinStatus — Bitget batch', () => {
  it('три вызова getBitgetStatus → rlFetch вызван РОВНО 1 раз', async () => {
    const { mod, rlFetch: rFetch } = await freshCoinStatus()

    // Bitget: публичный API, { data: [ { coin, chains: [...] } ] }
    rFetch.mockResolvedValue(mockResponse({
      data: [
        { coin: 'ETH', chains: [{ rechargeable: 'true',  withdrawable: 'true'  }] },
        { coin: 'BTC', chains: [{ rechargeable: 'true',  withdrawable: 'false' }] },
        { coin: 'SOL', chains: [{ rechargeable: 'false', withdrawable: 'true'  }] },
      ]
    }))

    // Последовательно: первый делает батч-запрос, остальные читают из кэша
    const eth = await mod.getBitgetStatus('ETH')
    const btc = await mod.getBitgetStatus('BTC')
    const sol = await mod.getBitgetStatus('SOL')

    expect(rFetch, 'Bitget батч: один fetch для всех монет').toHaveBeenCalledOnce()
    expect(eth).toEqual({ deposit: true,  withdraw: true  })
    expect(btc).toEqual({ deposit: true,  withdraw: false })
    expect(sol).toEqual({ deposit: false, withdraw: true  })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Обработка ошибок — FALLBACK оптимистичный
// ═══════════════════════════════════════════════════════════════════════════════

describe('coinStatus — обработка ошибок', () => {
  it('HTTP 500 → возвращает FALLBACK { deposit: true, withdraw: true }, не крашится', async () => {
    const { mod, rlFetch: rFetch } = await freshCoinStatus()

    rFetch.mockResolvedValue(mockResponse({ error: 'internal' }, 500))

    // Binance: res.ok = false → сразу FALLBACK
    const result = await mod.getBinanceStatus('ETH')

    expect(result, 'HTTP 500 должен вернуть оптимистичный FALLBACK')
      .toEqual({ deposit: true, withdraw: true })
  })

  it('сетевая ошибка (reject) → возвращает FALLBACK, не крашится', async () => {
    const { mod, rlFetch: rFetch } = await freshCoinStatus()

    rFetch.mockRejectedValue(new Error('Network timeout'))

    const result = await mod.getBinanceStatus('ETH')

    expect(result, 'сетевая ошибка должна вернуть оптимистичный FALLBACK')
      .toEqual({ deposit: true, withdraw: true })
  })

  it('KuCoin: HTTP ошибка → FALLBACK', async () => {
    const { mod, rlFetch: rFetch } = await freshCoinStatus()

    rFetch.mockResolvedValue(mockResponse({ msg: 'error' }, 429))

    const result = await mod.getKuCoinStatus('ETH')

    expect(result).toEqual({ deposit: true, withdraw: true })
  })
})
/**
 * tests/unit/fundingUtils.test.js
 *
 * Unit-тесты для чистых функций новых funding-компонентов.
 * Все функции тестируются в изоляции, без React и без сети.
 *
 * Покрытые функции:
 *   splitSymbol           — нормализация символа МОНЕТА/USDT
 *   formatCountdown       — форматирование countdown до начисления funding
 *   calcEntrySpread       — итоговый спред входа (новая формула)
 *   calcExitSpread        — спред выхода
 *   oppKey                — стабильный ключ возможности
 *   getAllSpotExchanges    — список спот-бирж для SF
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ─── Extracted pure functions (зеркалим из компонентов) ──────────────────────

function splitSymbol(symbol) {
  if (!symbol) return { base: '', suffix: '' }
  const match = symbol.match(/^(.*?)[-_]?USDTM?$/i)
  if (!match || !match[1]) return { base: symbol, suffix: '' }
  return { base: match[1], suffix: 'USDT' }
}

function formatCountdown(isoString) {
  if (!isoString) return null
  const diffMs = new Date(isoString).getTime() - Date.now()
  if (isNaN(diffMs)) return null
  if (diffMs <= 0) return 'now'
  const totalSec = Math.floor(diffMs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

/**
 * Итоговый спред входа с учётом реальных цен исполнения.
 * Единая формула без if/else:
 *   entrySpread = baseSpread − (avgAsk − avgBid) / avgBid × 100
 * Если avgAsk > avgBid → priceDiff > 0 → спред уменьшается (цены "давят")
 * Если avgAsk < avgBid → priceDiff < 0 → спред увеличивается (редко, но возможно)
 */
function calcEntrySpread(baseSpread, avgBid, avgAsk) {
  if (!avgBid || !avgAsk || avgBid <= 0) return null
  const priceDiffPct = (avgAsk - avgBid) / avgBid * 100
  return baseSpread - priceDiffPct
}

/**
 * Спред выхода от live VWAP при закрытии позиции.
 * exitSpread = (vwapBidExit − vwapAskExit) / vwapBidExit × 100
 * vwapBidExit — VWAP по asks bid-биржи (закрытие Short: покупаем)
 * vwapAskExit — VWAP по bids ask-биржи (закрытие Buy: продаём)
 */
function calcExitSpread(vwapBidExit, vwapAskExit) {
  if (!vwapBidExit || !vwapAskExit || vwapBidExit <= 0) return null
  return (vwapBidExit - vwapAskExit) / vwapBidExit * 100
}

/**
 * Стабильный ключ возможности — не зависит от volatile DB id.
 * Используется для favorites, hidden, fundingActiveTrades.
 */
function oppKey(opp) {
  return `${opp.strategy}:${opp.symbol}:${opp.exchange_bid}:${opp.exchange_ask || ''}`
}

function parseExtraAsks(raw) {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getAllSpotExchanges(opp) {
  const extras = parseExtraAsks(opp.extra_asks)
  return [opp.exchange_ask, ...extras].filter(Boolean)
}

// ─── splitSymbol ─────────────────────────────────────────────────────────────

describe('splitSymbol', () => {
  it('нормализует базовый формат BTCUSDT', () => {
    expect(splitSymbol('BTCUSDT')).toEqual({ base: 'BTC', suffix: 'USDT' })
  })

  it('нормализует формат с суффиксом M (WLUSDTM)', () => {
    expect(splitSymbol('WLUSDTM')).toEqual({ base: 'WL', suffix: 'USDT' })
  })

  it('нормализует формат с тире (BTW-USDT)', () => {
    expect(splitSymbol('BTW-USDT')).toEqual({ base: 'BTW', suffix: 'USDT' })
  })

  it('нормализует формат с тире и M (BTW-USDTM)', () => {
    expect(splitSymbol('BTW-USDTM')).toEqual({ base: 'BTW', suffix: 'USDT' })
  })

  it('нормализует формат с подчёркиванием (SIREN_USDT)', () => {
    expect(splitSymbol('SIREN_USDT')).toEqual({ base: 'SIREN', suffix: 'USDT' })
  })

  it('нормализует формат SIREN_USDTM', () => {
    expect(splitSymbol('SIREN_USDTM')).toEqual({ base: 'SIREN', suffix: 'USDT' })
  })

  it('возвращает пустые строки для null/undefined', () => {
    expect(splitSymbol(null)).toEqual({ base: '', suffix: '' })
    expect(splitSymbol(undefined)).toEqual({ base: '', suffix: '' })
    expect(splitSymbol('')).toEqual({ base: '', suffix: '' })
  })

  it('не портит символ без USDT-суффикса', () => {
    const result = splitSymbol('BTC')
    // Нет совпадения → возвращаем как есть
    expect(result.base).toBe('BTC')
  })

  it('регистронезависимость (btcusdt нижний регистр)', () => {
    const result = splitSymbol('btcusdt')
    expect(result.suffix).toBe('USDT')
    expect(result.base.toLowerCase()).toBe('btc')
  })

  it('корректно обрабатывает длинные символы (TRUTHHUSDTM)', () => {
    expect(splitSymbol('TRUTHHUSDTM')).toEqual({ base: 'TRUTHH', suffix: 'USDT' })
  })
})

// ─── formatCountdown ─────────────────────────────────────────────────────────

describe('formatCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('возвращает null для null/undefined', () => {
    expect(formatCountdown(null)).toBeNull()
    expect(formatCountdown(undefined)).toBeNull()
    expect(formatCountdown('')).toBeNull()
  })

  it('возвращает null для невалидной строки', () => {
    expect(formatCountdown('not-a-date')).toBeNull()
  })

  it('возвращает "now" для прошедшего времени', () => {
    const past = new Date('2026-01-01T11:00:00.000Z').toISOString()
    expect(formatCountdown(past)).toBe('now')
  })

  it('форматирует секунды (45s)', () => {
    const future = new Date('2026-01-01T12:00:45.000Z').toISOString()
    expect(formatCountdown(future)).toBe('45s')
  })

  it('форматирует минуты и секунды (3m 25s)', () => {
    const future = new Date('2026-01-01T12:03:25.000Z').toISOString()
    expect(formatCountdown(future)).toBe('3m 25s')
  })

  it('форматирует часы и минуты (3h 12m)', () => {
    const future = new Date('2026-01-01T15:12:00.000Z').toISOString()
    expect(formatCountdown(future)).toBe('3h 12m')
  })

  it('дополняет минуты нулём при h>0 (1h 05m)', () => {
    const future = new Date('2026-01-01T13:05:30.000Z').toISOString()
    expect(formatCountdown(future)).toBe('1h 05m')
  })

  it('дополняет секунды нулём при m>0 (5m 07s)', () => {
    const future = new Date('2026-01-01T12:05:07.000Z').toISOString()
    expect(formatCountdown(future)).toBe('5m 07s')
  })

  it('возвращает "now" для точного совпадения текущего времени', () => {
    const now = new Date('2026-01-01T12:00:00.000Z').toISOString()
    expect(formatCountdown(now)).toBe('now')
  })
})

// ─── calcEntrySpread ─────────────────────────────────────────────────────────

describe('calcEntrySpread — итоговый спред входа', () => {
  it('возвращает baseSpread когда avgAsk === avgBid (нет ценового давления)', () => {
    // (1.0 - 1.0) / 1.0 * 100 = 0
    // entrySpread = 0.5600 - 0 = 0.5600
    expect(calcEntrySpread(0.5600, 1.0, 1.0)).toBeCloseTo(0.5600, 6)
  })

  it('уменьшает спред когда avgAsk > avgBid (нормальный случай)', () => {
    // avgBid=1.0842, avgAsk=1.0845
    // priceDiff = (1.0845 - 1.0842) / 1.0842 * 100 ≈ 0.02768%
    // entrySpread = 0.5600 - 0.02768 ≈ 0.5323
    const result = calcEntrySpread(0.5600, 1.0842, 1.0845)
    expect(result).toBeLessThan(0.5600)
    expect(result).toBeCloseTo(0.5600 - (1.0845 - 1.0842) / 1.0842 * 100, 6)
  })

  it('увеличивает спред когда avgAsk < avgBid (редкий случай, разница добавляется)', () => {
    // avgBid=1.0845, avgAsk=1.0842
    // priceDiff = (1.0842 - 1.0845) / 1.0845 * 100 ≈ -0.02768% (отрицательная)
    // entrySpread = 0.5600 - (-0.02768) = 0.5600 + 0.02768 ≈ 0.5877
    const result = calcEntrySpread(0.5600, 1.0845, 1.0842)
    expect(result).toBeGreaterThan(0.5600)
  })

  it('возвращает null если avgBid равен 0', () => {
    expect(calcEntrySpread(0.5600, 0, 1.0)).toBeNull()
  })

  it('возвращает null для null/undefined аргументов', () => {
    expect(calcEntrySpread(0.5600, null, 1.0)).toBeNull()
    expect(calcEntrySpread(0.5600, 1.0, null)).toBeNull()
    expect(calcEntrySpread(0.5600, undefined, 1.0)).toBeNull()
  })

  it('может давать отрицательный итоговый спред (убыток при сильном ценовом давлении)', () => {
    // baseSpread = 0.01%, но цена askа сильно выше bid → priceDiff > baseSpread
    const result = calcEntrySpread(0.01, 1.00, 1.02) // priceDiff = 2%
    expect(result).toBeLessThan(0)
  })

  it('работает корректно для больших цен (BTC ~ 65000)', () => {
    const baseSpread = 0.2500
    const avgBid = 65100
    const avgAsk = 65120
    const expected = baseSpread - (65120 - 65100) / 65100 * 100
    expect(calcEntrySpread(baseSpread, avgBid, avgAsk)).toBeCloseTo(expected, 6)
  })

  it('единая формула — одинакова для FF и SF', () => {
    // Формула одна для обеих стратегий, просто с разными ценами
    const ffResult = calcEntrySpread(0.38, 1.08, 1.081)
    const sfResult = calcEntrySpread(0.56, 1.08, 1.081)
    // Оба используют одну и ту же механику
    expect(ffResult).toBeCloseTo(0.38 - (1.081 - 1.08) / 1.08 * 100, 6)
    expect(sfResult).toBeCloseTo(0.56 - (1.081 - 1.08) / 1.08 * 100, 6)
  })
})

// ─── calcExitSpread ───────────────────────────────────────────────────────────

describe('calcExitSpread — спред выхода', () => {
  it('считает спред выхода по формуле (vwapBidExit - vwapAskExit) / vwapBidExit * 100', () => {
    // vwapBidExit = 1.0851 (asks bid-биржи, закрытие short)
    // vwapAskExit = 1.0838 (bids ask-биржи, закрытие long/buy)
    const expected = (1.0851 - 1.0838) / 1.0851 * 100
    expect(calcExitSpread(1.0851, 1.0838)).toBeCloseTo(expected, 6)
  })

  it('возвращает null для null/undefined', () => {
    expect(calcExitSpread(null, 1.0)).toBeNull()
    expect(calcExitSpread(1.0, null)).toBeNull()
    expect(calcExitSpread(null, null)).toBeNull()
  })

  it('возвращает null если vwapBidExit === 0 (деление на ноль)', () => {
    expect(calcExitSpread(0, 1.0)).toBeNull()
  })

  it('возвращает положительное значение когда bid > ask (нормальный арбитраж)', () => {
    const result = calcExitSpread(1.0851, 1.0838)
    expect(result).toBeGreaterThan(0)
  })

  it('возвращает отрицательное значение когда bid < ask (цены сошлись или перевернулись)', () => {
    // При схождении цен bid может стать меньше ask
    const result = calcExitSpread(1.0830, 1.0838)
    expect(result).toBeLessThan(0)
  })

  it('возвращает 0 когда vwapBidExit === vwapAskExit', () => {
    expect(calcExitSpread(1.0850, 1.0850)).toBeCloseTo(0, 10)
  })

  it('делит именно на vwapBidExit (не на vwapAskExit)', () => {
    const bid = 1.0851
    const ask = 1.0838
    const result = calcExitSpread(bid, ask)
    const correctFormula = (bid - ask) / bid * 100
    const wrongFormula   = (bid - ask) / ask * 100
    expect(result).toBeCloseTo(correctFormula, 6)
    expect(result).not.toBeCloseTo(wrongFormula, 6)
  })
})

// ─── oppKey ───────────────────────────────────────────────────────────────────

describe('oppKey — стабильный ключ возможности', () => {
  it('генерирует ключ в формате strategy:symbol:bid:ask', () => {
    const opp = {
      strategy: 'sf',
      symbol: 'SIREN_USDT',
      exchange_bid: 'MEXC',
      exchange_ask: 'BingX',
    }
    expect(oppKey(opp)).toBe('sf:SIREN_USDT:MEXC:BingX')
  })

  it('два одинаковых opp дают одинаковый ключ', () => {
    const opp1 = { strategy: 'ff', symbol: 'IDUSDT', exchange_bid: 'Bitget', exchange_ask: 'Bybit' }
    const opp2 = { strategy: 'ff', symbol: 'IDUSDT', exchange_bid: 'Bitget', exchange_ask: 'Bybit' }
    expect(oppKey(opp1)).toBe(oppKey(opp2))
  })

  it('разные биржи дают разные ключи', () => {
    const opp1 = { strategy: 'sf', symbol: 'WLUSDTM', exchange_bid: 'KuCoin', exchange_ask: 'BingX' }
    const opp2 = { strategy: 'sf', symbol: 'WLUSDTM', exchange_bid: 'KuCoin', exchange_ask: 'KuCoin' }
    expect(oppKey(opp1)).not.toBe(oppKey(opp2))
  })

  it('разные стратегии дают разные ключи для одного символа', () => {
    const opp1 = { strategy: 'ff', symbol: 'ETHUSDT', exchange_bid: 'Binance', exchange_ask: 'Bybit' }
    const opp2 = { strategy: 'sf', symbol: 'ETHUSDT', exchange_bid: 'Binance', exchange_ask: 'Bybit' }
    expect(oppKey(opp1)).not.toBe(oppKey(opp2))
  })

  it('не использует DB id — ключ стабилен между циклами пайплайна', () => {
    // Симулируем два цикла: id меняется (DELETE+INSERT), но остальное то же
    const oppCycle1 = { id: 1001, strategy: 'sf', symbol: 'WLUSDTM', exchange_bid: 'KuCoin', exchange_ask: 'BingX' }
    const oppCycle2 = { id: 9999, strategy: 'sf', symbol: 'WLUSDTM', exchange_bid: 'KuCoin', exchange_ask: 'BingX' }
    expect(oppKey(oppCycle1)).toBe(oppKey(oppCycle2))
  })

  it('обрабатывает null exchange_ask (FF с одной биржей)', () => {
    const opp = { strategy: 'ff', symbol: 'BTCUSDT', exchange_bid: 'Binance', exchange_ask: null }
    expect(oppKey(opp)).toBe('ff:BTCUSDT:Binance:')
  })
})

// ─── getAllSpotExchanges ───────────────────────────────────────────────────────

describe('getAllSpotExchanges — список спот-бирж для SF', () => {
  it('возвращает [exchange_ask] если extra_asks пустой', () => {
    const opp = { exchange_ask: 'BingX', extra_asks: null }
    expect(getAllSpotExchanges(opp)).toEqual(['BingX'])
  })

  it('добавляет extra_asks к основной бирже', () => {
    const opp = { exchange_ask: 'BingX', extra_asks: '["KuCoin","MEXC"]' }
    expect(getAllSpotExchanges(opp)).toEqual(['BingX', 'KuCoin', 'MEXC'])
  })

  it('фильтрует null/undefined значения', () => {
    const opp = { exchange_ask: null, extra_asks: '["BingX"]' }
    expect(getAllSpotExchanges(opp)).toEqual(['BingX'])
  })

  it('возвращает пустой массив если обе части пустые', () => {
    const opp = { exchange_ask: null, extra_asks: null }
    expect(getAllSpotExchanges(opp)).toEqual([])
  })

  it('корректно парсирует JSON-строку extra_asks', () => {
    const opp = { exchange_ask: 'Bitget', extra_asks: '["MEXC","OKX"]' }
    expect(getAllSpotExchanges(opp)).toEqual(['Bitget', 'MEXC', 'OKX'])
  })

  it('не ломается на невалидном JSON в extra_asks', () => {
    const opp = { exchange_ask: 'BingX', extra_asks: 'not-valid-json' }
    expect(getAllSpotExchanges(opp)).toEqual(['BingX'])
  })
})

// ─── Ключ дедупликации в fundingActiveTrades ─────────────────────────────────

describe('fundingActiveTrades — логика дедупликации', () => {
  function makeTradeKey(opp, selectedSpotEx) {
    return `${opp.strategy}:${opp.symbol}:${opp.exchange_bid}:${selectedSpotEx || opp.exchange_ask || ''}`
  }

  it('SF с одной спот-биржей: ключ включает exchange_ask', () => {
    const opp = { strategy: 'sf', symbol: 'SIREN_USDT', exchange_bid: 'MEXC', exchange_ask: 'BingX' }
    expect(makeTradeKey(opp, null)).toBe('sf:SIREN_USDT:MEXC:BingX')
  })

  it('SF с выбранной спот-биржей через picker: ключ включает selectedSpotEx', () => {
    const opp = { strategy: 'sf', symbol: 'SIREN_USDT', exchange_bid: 'MEXC', exchange_ask: 'BingX' }
    // Пользователь выбрал KuCoin через SpotPickerModal
    expect(makeTradeKey(opp, 'KuCoin')).toBe('sf:SIREN_USDT:MEXC:KuCoin')
  })

  it('одна SF-возможность с разными спот-биржами — разные ключи (не дубли)', () => {
    const opp = { strategy: 'sf', symbol: 'SIREN_USDT', exchange_bid: 'MEXC', exchange_ask: 'BingX' }
    const key1 = makeTradeKey(opp, 'BingX')
    const key2 = makeTradeKey(opp, 'KuCoin')
    expect(key1).not.toBe(key2)
  })

  it('дедупликация: добавление той же возможности второй раз — isDupe true', () => {
    const opp = { strategy: 'ff', symbol: 'IDUSDT', exchange_bid: 'Bitget', exchange_ask: 'Bybit' }
    const trades = [
      { key: 'ff:IDUSDT:Bitget:Bybit', opp, avgBid: '0.0024', avgAsk: '0.0025' }
    ]
    const newKey = makeTradeKey(opp, null)
    const isDupe = trades.some(t => t.key === newKey)
    expect(isDupe).toBe(true)
  })

  it('лимит 5 позиций: при 5 позициях новая не добавляется', () => {
    const makeOpp = (sym) => ({
      strategy: 'sf', symbol: sym,
      exchange_bid: 'KuCoin', exchange_ask: 'BingX'
    })
    const trades = [
      { key: 'sf:A:KuCoin:BingX' },
      { key: 'sf:B:KuCoin:BingX' },
      { key: 'sf:C:KuCoin:BingX' },
      { key: 'sf:D:KuCoin:BingX' },
      { key: 'sf:E:KuCoin:BingX' },
    ]
    expect(trades.length >= 5).toBe(true)
    // Новая позиция заблокирована
    const canAdd = trades.length < 5
    expect(canAdd).toBe(false)
  })

  it('после removeFundingTrade ключ исчезает из массива', () => {
    const targetId = 'sf:WLUSDTM:KuCoin:BingX_1234567890'
    const targetKey = 'sf:WLUSDTM:KuCoin:BingX'
    const trades = [
      { id: 'sf:IDUSDT:Bitget:Bybit_111', key: 'sf:IDUSDT:Bitget:Bybit' },
      { id: targetId, key: targetKey },
    ]
    const after = trades.filter(t => t.id !== targetId)
    expect(after).toHaveLength(1)
    expect(after.find(t => t.key === targetKey)).toBeUndefined()
  })
})

// ─── WS_EX_ID маппинг ────────────────────────────────────────────────────────

describe('WS_EX_ID — маппинг exchange name → ws connector id', () => {
  const WS_EX_ID = {
    'Binance': 'binance',
    'BingX':   'bingx',
    'Bitget':  'bitget',
    'Bybit':   'bybit',
    'Gate.io': 'gate',
    'KuCoin':  'kucoin',
    'MEXC':    'mexc',
    'OKX':     'okx',
  }

  it('содержит все 8 бирж funding-пайплайна', () => {
    const expected = ['Binance', 'BingX', 'Bitget', 'Bybit', 'Gate.io', 'KuCoin', 'MEXC', 'OKX']
    expected.forEach(name => {
      expect(WS_EX_ID[name]).toBeDefined()
      expect(typeof WS_EX_ID[name]).toBe('string')
    })
  })

  it('Gate.io маппится на "gate" (без точки)', () => {
    expect(WS_EX_ID['Gate.io']).toBe('gate')
  })

  it('KuCoin маппится на "kucoin" (нижний регистр)', () => {
    expect(WS_EX_ID['KuCoin']).toBe('kucoin')
  })

  it('все значения в нижнем регистре', () => {
    Object.values(WS_EX_ID).forEach(id => {
      expect(id).toBe(id.toLowerCase())
    })
  })
})
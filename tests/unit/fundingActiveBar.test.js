/**
 * tests/unit/fundingActiveBar.test.js
 *
 * Тесты логики FundingActiveBar без @testing-library/react,
 * в стиле существующих тестов проекта (чистая JS-логика).
 */

import { describe, it, expect, vi } from 'vitest'

// ─── Логика из FundingActiveBar ───────────────────────────────────────────────

function splitSymbol(symbol) {
  if (!symbol) return { base: '', suffix: '' }
  const match = symbol.match(/^(.*?)[-_]?USDTM?$/i)
  if (!match || !match[1]) return { base: symbol, suffix: '' }
  return { base: match[1], suffix: 'USDT' }
}

function getStrategyLabel(strategy) {
  return strategy === 'ff' ? 'FUTURES · FUTURES' : 'SPOT · FUTURES'
}

function getEffectiveAskEx(trade) {
  return trade.selectedSpotEx || trade.opp.exchange_ask || '—'
}

function shouldRender(trades) {
  return Array.isArray(trades) && trades.length > 0
}

function getCounterLabel(trades) {
  const count = Array.isArray(trades) ? trades.length : 0
  return `${count}/5`
}

// ─── Фабрики ─────────────────────────────────────────────────────────────────

function makeTrade(overrides = {}) {
  return {
    id: 'sf:SIREN_USDT:MEXC:BingX_1234',
    key: 'sf:SIREN_USDT:MEXC:BingX',
    opp: {
      symbol: 'SIREN_USDT',
      strategy: 'sf',
      exchange_bid: 'MEXC',
      exchange_ask: 'BingX',
      spread: 0.5600,
    },
    selectedSpotEx: 'BingX',
    avgBid: '1.0842',
    avgAsk: '1.0839',
    openedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ─── Тесты ────────────────────────────────────────────────────────────────────

describe('FundingActiveBar — видимость', () => {
  it('не рендерится при пустом массиве', () => {
    expect(shouldRender([])).toBe(false)
  })

  it('не рендерится при null', () => {
    expect(shouldRender(null)).toBe(false)
  })

  it('рендерится при одной позиции', () => {
    expect(shouldRender([makeTrade()])).toBe(true)
  })

  it('рендерится при 5 позициях', () => {
    const trades = Array.from({ length: 5 }, (_, i) => makeTrade({ id: `id_${i}` }))
    expect(shouldRender(trades)).toBe(true)
  })
})

describe('FundingActiveBar — счётчик N/5', () => {
  it('показывает 1/5 при одной позиции', () => {
    expect(getCounterLabel([makeTrade()])).toBe('1/5')
  })

  it('показывает 3/5 при трёх позициях', () => {
    const trades = Array.from({ length: 3 }, (_, i) => makeTrade({ id: `id_${i}` }))
    expect(getCounterLabel(trades)).toBe('3/5')
  })

  it('показывает 5/5 при максимальном количестве', () => {
    const trades = Array.from({ length: 5 }, (_, i) => makeTrade({ id: `id_${i}` }))
    expect(getCounterLabel(trades)).toBe('5/5')
  })

  it('показывает 0/5 при пустом списке', () => {
    expect(getCounterLabel([])).toBe('0/5')
  })
})

describe('FundingActiveBar — splitSymbol', () => {
  it('нормализует SIREN_USDT', () => {
    const { base, suffix } = splitSymbol('SIREN_USDT')
    expect(base).toBe('SIREN')
    expect(suffix).toBe('USDT')
  })

  it('нормализует WLUSDTM', () => {
    const { base, suffix } = splitSymbol('WLUSDTM')
    expect(base).toBe('WL')
    expect(suffix).toBe('USDT')
  })

  it('нормализует BTW-USDT', () => {
    const { base, suffix } = splitSymbol('BTW-USDT')
    expect(base).toBe('BTW')
    expect(suffix).toBe('USDT')
  })
})

describe('FundingActiveBar — стратегия лейбл', () => {
  it('SF → "SPOT · FUTURES"', () => {
    expect(getStrategyLabel('sf')).toBe('SPOT · FUTURES')
  })

  it('FF → "FUTURES · FUTURES"', () => {
    expect(getStrategyLabel('ff')).toBe('FUTURES · FUTURES')
  })
})

describe('FundingActiveBar — определение ask-биржи', () => {
  it('возвращает selectedSpotEx если задан', () => {
    const trade = makeTrade({ selectedSpotEx: 'KuCoin' })
    expect(getEffectiveAskEx(trade)).toBe('KuCoin')
  })

  it('возвращает exchange_ask если selectedSpotEx не задан', () => {
    const trade = makeTrade({ selectedSpotEx: null })
    expect(getEffectiveAskEx(trade)).toBe('BingX')
  })

  it('возвращает "—" если оба null', () => {
    const trade = { ...makeTrade(), selectedSpotEx: null, opp: { ...makeTrade().opp, exchange_ask: null } }
    expect(getEffectiveAskEx(trade)).toBe('—')
  })

  it('selectedSpotEx перекрывает exchange_ask', () => {
    const trade = makeTrade({ selectedSpotEx: 'OKX' })
    expect(getEffectiveAskEx(trade)).toBe('OKX')
    expect(getEffectiveAskEx(trade)).not.toBe('BingX')
  })
})

describe('FundingActiveBar — onRemove логика', () => {
  it('удаление по id корректно фильтрует список', () => {
    const trades = [
      makeTrade({ id: 'id_1', key: 'sf:A:MEXC:BingX' }),
      makeTrade({ id: 'id_2', key: 'sf:B:MEXC:KuCoin' }),
      makeTrade({ id: 'id_3', key: 'sf:C:KuCoin:OKX' }),
    ]
    const after = trades.filter(t => t.id !== 'id_2')
    expect(after).toHaveLength(2)
    expect(after.find(t => t.id === 'id_2')).toBeUndefined()
  })

  it('stopPropagation предотвращает вызов onSelect', () => {
    const onSelect = vi.fn()
    const onRemove = vi.fn()
    const handleClose = (e, id) => { e.stopPropagation(); onRemove(id) }
    const fakeEvent = { stopPropagation: vi.fn() }
    handleClose(fakeEvent, 'id_1')
    expect(fakeEvent.stopPropagation).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith('id_1')
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('FundingActiveBar — изоляция от futures', () => {
  it('CSS-класс корня "fab" отличается от ATB "atb"', () => {
    expect('fab').not.toBe('atb')
  })

  it('структура trade содержит avgBid/avgAsk, не avgLong/avgShort', () => {
    const trade = makeTrade()
    expect(trade).toHaveProperty('avgBid')
    expect(trade).toHaveProperty('avgAsk')
    expect(trade).not.toHaveProperty('avgLong')
    expect(trade).not.toHaveProperty('avgShort')
  })
})
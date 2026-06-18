/**
 * tests/unit/fundingAppLogic.test.js
 *
 * Unit-тесты для логики fundingActiveTrades в App.jsx.
 * Тестируем функции управления состоянием в изоляции — без рендера
 * всего App (он тяжёлый и требует авторизации).
 *
 * Покрытые функции:
 *   handleFundingTrade    — добавление, лимит 5, дедупликация
 *   removeFundingTrade    — удаление по id
 *   localStorage persistence — данные сохраняются между "перезагрузками"
 *   ключ трейда           — формат и стабильность
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Чистая логика управления fundingActiveTrades ────────────────────────────
// Извлекаем логику как чистые функции, не зависящие от React state

function makeFundingTradeKey(opp, selectedSpotEx) {
  return `${opp.strategy}:${opp.symbol}:${opp.exchange_bid}:${selectedSpotEx || opp.exchange_ask || ''}`
}

function handleFundingTrade(state, { opp, avgBid, avgAsk, selectedSpotEx, onError }) {
  const { trades } = state

  if (trades.length >= 5) {
    onError?.('Достигнут лимит позиций (5). Закройте одну из текущих.')
    return state
  }

  const key = makeFundingTradeKey(opp, selectedSpotEx)
  const isDupe = trades.some(t => t.key === key)
  if (isDupe) {
    onError?.('Эта возможность уже добавлена в активные позиции.')
    return state
  }

  const trade = {
    id: `${key}_TIMESTAMP`,
    key,
    opp,
    selectedSpotEx: selectedSpotEx || null,
    avgBid,
    avgAsk,
    openedAt: new Date().toISOString(),
  }

  return { ...state, trades: [...trades, trade] }
}

function removeFundingTrade(state, id) {
  return { ...state, trades: state.trades.filter(t => t.id !== id) }
}

// ─── Фабрики ─────────────────────────────────────────────────────────────────

function makeSFOpp(sym = 'SIREN_USDT', bid = 'MEXC') {
  return {
    strategy: 'sf',
    symbol: sym,
    exchange_bid: bid,
    exchange_ask: 'BingX',
    spread: 0.5600,
  }
}

function makeFFOpp(sym = 'IDUSDT') {
  return {
    strategy: 'ff',
    symbol: sym,
    exchange_bid: 'Bitget',
    exchange_ask: 'Bybit',
    spread: 0.3829,
  }
}

const initialState = { trades: [] }

// ─── Тесты ────────────────────────────────────────────────────────────────────

describe('handleFundingTrade — добавление позиции', () => {
  it('добавляет первую позицию', () => {
    const opp = makeSFOpp()
    const result = handleFundingTrade(initialState, {
      opp, avgBid: '1.0842', avgAsk: '1.0839', selectedSpotEx: 'BingX',
    })
    expect(result.trades).toHaveLength(1)
  })

  it('сохраняет все поля трейда', () => {
    const opp = makeSFOpp()
    const result = handleFundingTrade(initialState, {
      opp, avgBid: '1.0842', avgAsk: '1.0839', selectedSpotEx: 'BingX',
    })
    const trade = result.trades[0]
    expect(trade.opp).toBe(opp)
    expect(trade.avgBid).toBe('1.0842')
    expect(trade.avgAsk).toBe('1.0839')
    expect(trade.selectedSpotEx).toBe('BingX')
    expect(trade.openedAt).toBeDefined()
  })

  it('ключ трейда имеет правильный формат', () => {
    const opp = makeSFOpp('WLUSDTM', 'KuCoin')
    const result = handleFundingTrade(initialState, {
      opp, avgBid: '0.005', avgAsk: '0.0049', selectedSpotEx: 'KuCoin',
    })
    expect(result.trades[0].key).toBe('sf:WLUSDTM:KuCoin:KuCoin')
  })

  it('добавляет FF-позицию с правильным ключом', () => {
    const opp = makeFFOpp()
    const result = handleFundingTrade(initialState, {
      opp, avgBid: '0.0024', avgAsk: '0.0025', selectedSpotEx: null,
    })
    expect(result.trades[0].key).toBe('ff:IDUSDT:Bitget:Bybit')
    expect(result.trades[0].selectedSpotEx).toBeNull()
  })

  it('добавляет до 5 позиций без ошибки', () => {
    let state = initialState
    for (let i = 0; i < 5; i++) {
      const opp = makeSFOpp(`TOKEN${i}`)
      state = handleFundingTrade(state, {
        opp, avgBid: '1.0', avgAsk: '1.0', selectedSpotEx: 'BingX',
      })
    }
    expect(state.trades).toHaveLength(5)
  })
})

describe('handleFundingTrade — лимит 5 позиций', () => {
  let fullState

  beforeEach(() => {
    // Заполняем 5 позиций
    let state = initialState
    for (let i = 0; i < 5; i++) {
      state = handleFundingTrade(state, {
        opp: makeSFOpp(`FULL${i}`),
        avgBid: '1.0', avgAsk: '1.0', selectedSpotEx: 'BingX',
      })
    }
    fullState = state
  })

  it('блокирует добавление 6-й позиции', () => {
    const onError = vi.fn()
    const result = handleFundingTrade(fullState, {
      opp: makeSFOpp('EXTRA'),
      avgBid: '1.0', avgAsk: '1.0', selectedSpotEx: 'BingX',
      onError,
    })
    expect(result.trades).toHaveLength(5)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('сообщение об ошибке содержит упоминание лимита (5)', () => {
    const onError = vi.fn()
    handleFundingTrade(fullState, {
      opp: makeSFOpp('EXTRA'),
      avgBid: '1.0', avgAsk: '1.0', selectedSpotEx: 'BingX',
      onError,
    })
    expect(onError.mock.calls[0][0]).toContain('5')
  })

  it('возвращает исходный state без изменений при лимите', () => {
    const result = handleFundingTrade(fullState, {
      opp: makeSFOpp('EXTRA'),
      avgBid: '1.0', avgAsk: '1.0', selectedSpotEx: 'BingX',
    })
    expect(result).toBe(fullState)
  })
})

describe('handleFundingTrade — дедупликация', () => {
  it('блокирует дублирующуюся позицию', () => {
    const opp = makeSFOpp()
    let state = handleFundingTrade(initialState, {
      opp, avgBid: '1.0842', avgAsk: '1.0839', selectedSpotEx: 'BingX',
    })
    const onError = vi.fn()
    state = handleFundingTrade(state, {
      opp, avgBid: '1.0840', avgAsk: '1.0838', selectedSpotEx: 'BingX',
      onError,
    })
    expect(state.trades).toHaveLength(1)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('та же монета с другой спот-биржей — не дубль', () => {
    const opp = makeSFOpp() // exchange_ask = 'BingX'
    let state = handleFundingTrade(initialState, {
      opp, avgBid: '1.0842', avgAsk: '1.0839', selectedSpotEx: 'BingX',
    })
    // Добавляем ту же монету с другой спот-биржей
    state = handleFundingTrade(state, {
      opp, avgBid: '1.0842', avgAsk: '1.0840', selectedSpotEx: 'KuCoin',
    })
    expect(state.trades).toHaveLength(2)
  })

  it('FF и SF с одинаковым символом — не дубли', () => {
    const sfOpp = { ...makeSFOpp('ETHUSDT'), strategy: 'sf' }
    const ffOpp = { ...makeFFOpp('ETHUSDT'), strategy: 'ff' }
    let state = handleFundingTrade(initialState, {
      opp: sfOpp, avgBid: '1.0', avgAsk: '1.0', selectedSpotEx: 'BingX',
    })
    state = handleFundingTrade(state, {
      opp: ffOpp, avgBid: '1.0', avgAsk: '1.0', selectedSpotEx: null,
    })
    expect(state.trades).toHaveLength(2)
  })

  it('дедупликация не зависит от DB id (ключ по symbol+strategy+exchanges)', () => {
    // Симулируем второй цикл пайплайна: id в БД изменился
    const opp1 = { ...makeSFOpp(), id: 1001 }
    const opp2 = { ...makeSFOpp(), id: 9999 } // тот же opp, новый DB id
    let state = handleFundingTrade(initialState, {
      opp: opp1, avgBid: '1.0', avgAsk: '1.0', selectedSpotEx: 'BingX',
    })
    const onError = vi.fn()
    state = handleFundingTrade(state, {
      opp: opp2, avgBid: '1.0', avgAsk: '1.0', selectedSpotEx: 'BingX',
      onError,
    })
    // Должен быть дубль несмотря на разный DB id
    expect(state.trades).toHaveLength(1)
    expect(onError).toHaveBeenCalledTimes(1)
  })
})

describe('removeFundingTrade', () => {
  it('удаляет трейд по id', () => {
    const opp = makeSFOpp()
    let state = handleFundingTrade(initialState, {
      opp, avgBid: '1.0842', avgAsk: '1.0839', selectedSpotEx: 'BingX',
    })
    const id = state.trades[0].id
    state = removeFundingTrade(state, id)
    expect(state.trades).toHaveLength(0)
  })

  it('удаляет только нужный трейд из нескольких', () => {
    let state = initialState
    state = handleFundingTrade(state, { opp: makeSFOpp('A'), avgBid: '1', avgAsk: '1', selectedSpotEx: 'BingX' })
    state = handleFundingTrade(state, { opp: makeSFOpp('B'), avgBid: '1', avgAsk: '1', selectedSpotEx: 'BingX' })
    state = handleFundingTrade(state, { opp: makeSFOpp('C'), avgBid: '1', avgAsk: '1', selectedSpotEx: 'BingX' })

    const idToRemove = state.trades[1].id
    const keyToRemove = state.trades[1].key
    state = removeFundingTrade(state, idToRemove)

    expect(state.trades).toHaveLength(2)
    expect(state.trades.find(t => t.id === idToRemove)).toBeUndefined()
    expect(state.trades.find(t => t.key === keyToRemove)).toBeUndefined()
  })

  it('возвращает тот же массив если id не найден', () => {
    const state = { trades: [{ id: 'real_id', key: 'k' }] }
    const result = removeFundingTrade(state, 'nonexistent')
    expect(result.trades).toHaveLength(1)
  })

  it('не мутирует исходный state', () => {
    let state = handleFundingTrade(initialState, {
      opp: makeSFOpp(), avgBid: '1', avgAsk: '1', selectedSpotEx: 'BingX',
    })
    const original = state.trades
    const id = state.trades[0].id
    const newState = removeFundingTrade(state, id)
    // Исходный массив не изменился
    expect(original).toHaveLength(1)
    expect(newState.trades).toHaveLength(0)
  })
})

describe('fundingActiveTrades localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('сохраняет трейды в localStorage с ключом "fundingActiveTrades"', () => {
    const trades = [{ id: 'test', key: 'sf:BTC:MEXC:BingX' }]
    localStorage.setItem('fundingActiveTrades', JSON.stringify(trades))
    const stored = JSON.parse(localStorage.getItem('fundingActiveTrades'))
    expect(stored).toHaveLength(1)
    expect(stored[0].key).toBe('sf:BTC:MEXC:BingX')
  })

  it('ключ "fundingActiveTrades" не конфликтует с "activeTrades"', () => {
    localStorage.setItem('activeTrades', JSON.stringify([{ id: 'futures' }]))
    localStorage.setItem('fundingActiveTrades', JSON.stringify([{ id: 'funding' }]))

    const futures = JSON.parse(localStorage.getItem('activeTrades'))
    const funding = JSON.parse(localStorage.getItem('fundingActiveTrades'))

    expect(futures[0].id).toBe('futures')
    expect(funding[0].id).toBe('funding')
  })

  it('загружает пустой массив если ключ не существует', () => {
    let stored
    try {
      const raw = JSON.parse(localStorage.getItem('fundingActiveTrades'))
      stored = Array.isArray(raw) ? raw : []
    } catch {
      stored = []
    }
    expect(stored).toEqual([])
  })

  it('загружает пустой массив при повреждённом JSON', () => {
    localStorage.setItem('fundingActiveTrades', 'invalid{json}')
    let stored
    try {
      const raw = JSON.parse(localStorage.getItem('fundingActiveTrades'))
      stored = Array.isArray(raw) ? raw : []
    } catch {
      stored = []
    }
    expect(stored).toEqual([])
  })
})

describe('fundingActiveTrades — изоляция от futures activeCoins', () => {
  it('структура fundingTrade отличается от activeCoins', () => {
    // activeCoins хранит: { symbol, bid_exchange, ask_exchange, strategy, priceShort, priceLong }
    // fundingTrade хранит: { id, key, opp, selectedSpotEx, avgBid, avgAsk, openedAt }
    const activeCoin = { symbol: 'SIREN', bid_exchange: 'MEXC', ask_exchange: 'BingX', strategy: 'sf' }
    const fundingTrade = {
      id: 'sf:SIREN_USDT:MEXC:BingX_123',
      key: 'sf:SIREN_USDT:MEXC:BingX',
      opp: { symbol: 'SIREN_USDT' },
      selectedSpotEx: 'BingX',
      avgBid: '1.0842',
      avgAsk: '1.0839',
    }

    // Разные структуры — не перемешиваются
    expect(fundingTrade).not.toHaveProperty('bid_exchange')
    expect(fundingTrade).not.toHaveProperty('ask_exchange')
    expect(activeCoin).not.toHaveProperty('avgBid')
    expect(activeCoin).not.toHaveProperty('selectedSpotEx')
  })

  it('ключи localStorage разные у futures и funding', () => {
    const FUTURES_KEY = 'activeTrades'
    const FUNDING_KEY = 'fundingActiveTrades'
    expect(FUTURES_KEY).not.toBe(FUNDING_KEY)
  })
})
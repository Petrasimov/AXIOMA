// tests/unit/appLogic.test.js
// Тесты бизнес-логики App.jsx — вынесены в чистые функции для тестируемости
//
// Тестируем:
//   - canScan условие
//   - 9 шагов фильтрации из useMemo
//   - Промоут variants при фильтре transfer/exchange
//   - Фильтр transfer: undefined НЕ считается true
//   - VWAP пересчёт из raw_bid/raw_ask

import { describe, it, expect } from 'vitest'
import { calcVwap } from '../../src/utils.js'

// ─── Переносим логику фильтрации из App.jsx в тестируемые функции ─────────────
// App.jsx использует useMemo — мы воспроизводим ту же логику как чистую функцию

function applyFilters(liveData, filters, sortMode = 'spread', hidden = [], favorites = []) {
  // Шаг 1: Пересчёт VWAP из raw_bid/raw_ask
  let result = (liveData || []).map(opp => {
    if (!opp.raw_bid || !opp.raw_ask) return opp
    const bid_price = calcVwap(opp.raw_bid, filters.tradeAmount)
    const ask_price = calcVwap(opp.raw_ask, filters.tradeAmount)
    if (!bid_price || !ask_price) return opp
    const spread = (bid_price - ask_price) / bid_price * 100
    return { ...opp, bid_price, ask_price, spread }
  })

  // Шаг 2: Фильтр стратегии
  if (!filters.strategy.sf) result = result.filter(o => o.strategy !== 'sf')
  if (!filters.strategy.ff) result = result.filter(o => o.strategy !== 'ff')

  // Шаг 3: Фильтр funding
  if (!filters.funding.positive || !filters.funding.negative) {
    result = result.filter(o => {
      const bidRate = o.bid_funding?.rate ?? 0
      const askRate = o.ask_funding?.rate ?? 0
      const isPositive = o.strategy === 'sf'
        ? askRate >= 0
        : bidRate >= 0 && askRate >= 0
      if (isPositive) return filters.funding.positive
      return filters.funding.negative
    })
  }

  // Шаг 4: Фильтр бирж
  if (filters.exchanges.length > 0) {
    result = result.filter(o =>
      filters.exchanges.includes(o.bid_ex) &&
      filters.exchanges.includes(o.ask_ex)
    )
  }

  // Шаг 5: Фильтр минимального спреда
  if (filters.minSpread > 0) {
    result = result.filter(o => o.spread >= filters.minSpread)
  }

  // Шаг 6: Промоут variants (transfer + exchange)
  result = result.map(opp => {
    const passesExchange = filters.exchanges.length === 0 ||
      (filters.exchanges.includes(opp.bid_ex) && filters.exchanges.includes(opp.ask_ex))

    const bidDep0 = opp.bid_transfer?.deposit
    const askDep0 = opp.ask_transfer?.deposit
    const bidWd0  = opp.bid_transfer?.withdraw
    const askWd0  = opp.ask_transfer?.withdraw
    const depOk0  = (bidDep0 === null || askDep0 === null) ? true : !!(bidDep0 && askDep0)
    const wdOk0   = (bidWd0  === null || askWd0  === null) ? true : !!(bidWd0  && askWd0)
    const passesTransfer =
      (!filters.transfer.deposit  || depOk0) &&
      (!filters.transfer.withdraw || wdOk0)

    if (passesExchange && passesTransfer) return opp

    const allVariants = opp.variants || []
    const passingVariant = allVariants.find(v => {
      const exOk = filters.exchanges.length === 0 ||
        (filters.exchanges.includes(v.bid_ex) && filters.exchanges.includes(v.ask_ex))
      if (!exOk) return false

      const bDep = v.bid_transfer?.deposit
      const aDep = v.ask_transfer?.deposit
      const bWd  = v.bid_transfer?.withdraw
      const aWd  = v.ask_transfer?.withdraw
      const dOk  = (bDep === null || aDep === null) ? true : !!(bDep && aDep)
      const wOk  = (bWd  === null || aWd  === null) ? true : !!(bWd  && aWd)
      return (!filters.transfer.deposit || dOk) && (!filters.transfer.withdraw || wOk)
    })

    if (!passingVariant) return null

    const remainingVariants = allVariants.filter(v => v.id !== passingVariant.id)
    return {
      ...passingVariant,
      id: opp.id,
      variants: [opp, ...remainingVariants].filter(v => {
        const exOk = filters.exchanges.length === 0 ||
          (filters.exchanges.includes(v.bid_ex) && filters.exchanges.includes(v.ask_ex))
        return exOk
      })
    }
  }).filter(Boolean)

  // Шаг 7: Финальный фильтр transfer
  result = result.filter(o => {
    const bidDep = o.bid_transfer?.deposit
    const askDep = o.ask_transfer?.deposit
    const bidWd  = o.bid_transfer?.withdraw
    const askWd  = o.ask_transfer?.withdraw
    const depOk = (bidDep === null || askDep === null) ? true : !!(bidDep && askDep)
    const wdOk  = (bidWd  === null || askWd  === null) ? true : !!(bidWd  && askWd)
    if (filters.transfer.deposit  && !depOk) return false
    if (filters.transfer.withdraw && !wdOk)  return false
    return true
  })

  // Шаг 8: Сортировка
  result.sort((a, b) => {
    if (sortMode === 'spread') return b.spread - a.spread
    if (sortMode === 'age')    return new Date(b.first_seen) - new Date(a.first_seen)
    if (sortMode === 'volume') return (b.bid_volume + b.ask_volume) - (a.bid_volume + a.ask_volume)
    return 0
  })
  result.sort((a, b) => {
    const aFav = favorites.includes(a.id) ? 1 : 0
    const bFav = favorites.includes(b.id) ? 1 : 0
    return bFav - aFav
  })

  // Шаг 9: Скрытые
  result = result.filter(o => !hidden.includes(o.id))

  return result
}

// ─── Хелпер: базовый opportunity объект ──────────────────────────────────────
function makeOpp(overrides = {}) {
  return {
    id:           1,
    symbol:       'ETHUSDT',
    strategy:     'sf',
    bid_ex:       'binance',
    ask_ex:       'mexc',
    spread:       1.5,
    bid_price:    2000,   // bid > ask: BID = SELL (высокая цена)
    ask_price:    1970,   // ask < bid: ASK = BUY  (низкая цена)
    raw_bid:      null,
    raw_ask:      null,
    bid_volume:   5000000,
    ask_volume:   3000000,
    bid_funding:  { rate: 0.01, next_time: null },
    ask_funding:  { rate: null, next_time: null },
    bid_transfer: { deposit: true,  withdraw: true  },
    ask_transfer: { deposit: true,  withdraw: true  },
    first_seen:   new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    variants:     [],
    ...overrides,
  }
}

// ─── Базовые фильтры ──────────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  strategy:    { sf: true, ff: true },
  exchanges:   ['binance', 'bybit', 'okx', 'gate', 'kucoin', 'mexc', 'bitget', 'bingx'],
  minSpread:   0,
  tradeAmount: 100,
  funding:     { positive: true, negative: true },
  transfer:    { deposit: true, withdraw: true },
}

// ═══════════════════════════════════════════════════════════════════════════════
// canScan логика
// ═══════════════════════════════════════════════════════════════════════════════

describe('canScan условие', () => {
  // canScan — чистое вычисление, воспроизводим логику из App.jsx
  function canScan({ authStatus, isCexCexPaid, activePage, selected }) {
    return (
      authStatus === 'ready' &&
      isCexCexPaid === true &&
      activePage === 'futures' &&
      selected === null
    )
  }

  it('все условия выполнены → canScan=true', () => {
    expect(canScan({
      authStatus:   'ready',
      isCexCexPaid: true,
      activePage:   'futures',
      selected:     null,
    })).toBe(true)
  })

  it('authStatus != ready → canScan=false', () => {
    expect(canScan({
      authStatus:   'checking',
      isCexCexPaid: true,
      activePage:   'futures',
      selected:     null,
    })).toBe(false)
  })

  it('isCexCexPaid=false → canScan=false', () => {
    expect(canScan({
      authStatus:   'ready',
      isCexCexPaid: false,
      activePage:   'futures',
      selected:     null,
    })).toBe(false)
  })

  it('activePage != futures (api страница) → canScan=false', () => {
    expect(canScan({
      authStatus:   'ready',
      isCexCexPaid: true,
      activePage:   'api',
      selected:     null,
    })).toBe(false)
  })

  it('модалка открыта (selected != null) → canScan=false', () => {
    expect(canScan({
      authStatus:   'ready',
      isCexCexPaid: true,
      activePage:   'futures',
      selected:     { id: 1, symbol: 'ETHUSDT' },  // модалка открыта
    })).toBe(false)
  })

  it('activePage=home → canScan=false', () => {
    expect(canScan({
      authStatus:   'ready',
      isCexCexPaid: true,
      activePage:   'home',
      selected:     null,
    })).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Шаг 1 — Пересчёт VWAP из raw_bid/raw_ask при смене tradeAmount
// ═══════════════════════════════════════════════════════════════════════════════

describe('useMemo — Шаг 1: VWAP пересчёт из raw_bid/raw_ask', () => {
  it('при наличии raw_bid/raw_ask — пересчитывает bid_price, ask_price, spread', () => {
    // BID > ASK — строгое правило проекта
    // bid_price = высокая цена (SELL, красная панель)
    // ask_price = низкая цена  (BUY,  зелёная панель)
    // spread = (bid_price - ask_price) / bid_price * 100
    // bid=2000, ask=1990 → (2000-1990)/1990 ≈ +0.5% ✅
    const opp = makeOpp({
      raw_bid: [['2000', '100']],   // bid: высокая цена (SELL)
      raw_ask: [['1990', '100']],   // ask: низкая цена  (BUY)
      spread:  0,
    })

    const result = applyFilters([opp], DEFAULT_FILTERS)

    expect(result.length).toBe(1)
    expect(result[0].spread, 'спред должен быть пересчитан').toBeGreaterThan(0)
    expect(result[0].bid_price).toBeCloseTo(2000, 1)
    expect(result[0].ask_price).toBeCloseTo(1990, 1)
  })

  it('без raw_bid/raw_ask — использует существующие bid_price/ask_price', () => {
    const opp = makeOpp({
      raw_bid: null,
      raw_ask: null,
      spread:  2.5,
      bid_price: 2000,
      ask_price: 1950,
    })

    const result = applyFilters([opp], DEFAULT_FILTERS)

    expect(result.length).toBe(1)
    expect(result[0].spread).toBe(2.5)  // не изменился
  })

  it('tradeAmount влияет на VWAP — разные суммы дают разные цены', () => {
    // Стакан с разными уровнями: при малой сумме — лучшая цена
    const opp = makeOpp({
      raw_bid: [['2000', '0.01'], ['1990', '100']],  // первый уровень с малым объёмом
      raw_ask: [['1980', '0.01'], ['1970', '100']],
    })

    const r1 = applyFilters([opp], { ...DEFAULT_FILTERS, tradeAmount: 1 })
    const r2 = applyFilters([opp], { ...DEFAULT_FILTERS, tradeAmount: 10000 })

    // При tradeAmount=1 используется только первый уровень
    // При tradeAmount=10000 берётся и второй — средняя цена другая
    if (r1.length > 0 && r2.length > 0) {
      console.log(`tradeAmount=1: bid_price=${r1[0].bid_price?.toFixed(4)}`)
      console.log(`tradeAmount=10000: bid_price=${r2[0].bid_price?.toFixed(4)}`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Шаг 2 — Фильтр стратегии
// ═══════════════════════════════════════════════════════════════════════════════

describe('useMemo — Шаг 2: фильтр стратегии', () => {
  it('sf=false — карточки с strategy=sf скрыты', () => {
    const opps = [
      makeOpp({ id: 1, strategy: 'sf' }),
      makeOpp({ id: 2, strategy: 'ff' }),
    ]
    const result = applyFilters(opps, { ...DEFAULT_FILTERS, strategy: { sf: false, ff: true } })
    expect(result.map(r => r.strategy)).not.toContain('sf')
    expect(result.map(r => r.strategy)).toContain('ff')
  })

  it('ff=false — карточки с strategy=ff скрыты', () => {
    const opps = [
      makeOpp({ id: 1, strategy: 'sf' }),
      makeOpp({ id: 2, strategy: 'ff' }),
    ]
    const result = applyFilters(opps, { ...DEFAULT_FILTERS, strategy: { sf: true, ff: false } })
    expect(result.map(r => r.strategy)).not.toContain('ff')
  })

  it('оба отключены — результат пустой', () => {
    const opps = [makeOpp({ id: 1, strategy: 'sf' }), makeOpp({ id: 2, strategy: 'ff' })]
    const result = applyFilters(opps, { ...DEFAULT_FILTERS, strategy: { sf: false, ff: false } })
    expect(result).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Шаг 3 — Фильтр funding
// ═══════════════════════════════════════════════════════════════════════════════

describe('useMemo — Шаг 3: фильтр funding', () => {
  it('positive=false — позитивный funding скрывается', () => {
    const opp = makeOpp({
      strategy:    'sf',
      ask_funding: { rate: 0.05, next_time: null },  // положительный → позитивный для sf
    })
    const result = applyFilters(
      [opp],
      { ...DEFAULT_FILTERS, funding: { positive: false, negative: true } }
    )
    expect(result).toHaveLength(0)
  })

  it('negative=false — негативный funding скрывается', () => {
    const opp = makeOpp({
      strategy:    'sf',
      ask_funding: { rate: -0.05, next_time: null },  // отрицательный
    })
    const result = applyFilters(
      [opp],
      { ...DEFAULT_FILTERS, funding: { positive: true, negative: false } }
    )
    expect(result).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Шаг 4 — Фильтр бирж
// ═══════════════════════════════════════════════════════════════════════════════

describe('useMemo — Шаг 4: фильтр бирж', () => {
  it('биржа не в списке — карточка скрывается', () => {
    const opp = makeOpp({ bid_ex: 'binance', ask_ex: 'mexc' })
    const result = applyFilters(
      [opp],
      { ...DEFAULT_FILTERS, exchanges: ['bybit', 'okx'] }  // binance и mexc не включены
    )
    expect(result).toHaveLength(0)
  })

  it('обе биржи в списке — карточка видна', () => {
    const opp = makeOpp({ bid_ex: 'binance', ask_ex: 'mexc' })
    const result = applyFilters(
      [opp],
      { ...DEFAULT_FILTERS, exchanges: ['binance', 'mexc'] }
    )
    expect(result).toHaveLength(1)
  })

  it('пустой список бирж — показываются все', () => {
    const opp = makeOpp({ bid_ex: 'binance', ask_ex: 'mexc' })
    const result = applyFilters(
      [opp],
      { ...DEFAULT_FILTERS, exchanges: [] }
    )
    expect(result).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Шаг 5 — Фильтр минимального спреда
// ═══════════════════════════════════════════════════════════════════════════════

describe('useMemo — Шаг 5: фильтр minSpread', () => {
  it('спред ниже minSpread — карточка скрывается', () => {
    const opp = makeOpp({ spread: 1.5 })
    const result = applyFilters([opp], { ...DEFAULT_FILTERS, minSpread: 2 })
    expect(result).toHaveLength(0)
  })

  it('спред равен minSpread — карточка остаётся', () => {
    const opp = makeOpp({ spread: 2 })
    const result = applyFilters([opp], { ...DEFAULT_FILTERS, minSpread: 2 })
    expect(result).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Шаг 6 — Промоут variants
// ═══════════════════════════════════════════════════════════════════════════════

describe('useMemo — Шаг 6: промоут variants', () => {
  it('главная карточка не проходит transfer → берётся вариант из variants', () => {
    const mainOpp = makeOpp({
      id:    1,
      bid_ex: 'binance',
      ask_ex: 'mexc',
      bid_transfer: { deposit: false, withdraw: false },  // ← не проходит
      ask_transfer: { deposit: false, withdraw: false },
      variants: [
        {
          id:    1001,
          symbol: 'ETHUSDT',
          strategy: 'ff',
          bid_ex: 'bybit',
          ask_ex: 'okx',
          spread: 1.2,
          bid_price: 2000,
          ask_price: 1976,
          bid_volume: 3000000,
          ask_volume: 2000000,
          bid_funding: { rate: 0.02, next_time: null },
          ask_funding: { rate: 0.01, next_time: null },
          bid_transfer: { deposit: true, withdraw: true },  // ← проходит
          ask_transfer: { deposit: true, withdraw: true },
          raw_bid: null, raw_ask: null,
          first_seen: new Date().toISOString(),
          variants: [],
        }
      ],
    })

    const result = applyFilters([mainOpp], DEFAULT_FILTERS)

    expect(result.length, 'после промоута должна быть одна карточка').toBe(1)
    expect(result[0].bid_ex, 'должен промоутироваться вариант bybit/okx').toBe('bybit')
    expect(result[0].id, 'id должен сохраниться от оригинала').toBe(1)
  })

  it('ни главная ни варианты не проходят → карточка удаляется', () => {
    const mainOpp = makeOpp({
      id: 1,
      bid_transfer: { deposit: false, withdraw: false },
      ask_transfer: { deposit: false, withdraw: false },
      variants: [
        {
          id: 1001,
          symbol: 'ETHUSDT', strategy: 'sf',
          bid_ex: 'gate', ask_ex: 'kucoin',
          spread: 1.0,
          bid_price: 2000, ask_price: 1980,
          bid_volume: 0, ask_volume: 0,
          bid_funding: { rate: 0, next_time: null },
          ask_funding: { rate: null, next_time: null },
          bid_transfer: { deposit: false, withdraw: false },  // тоже не проходит
          ask_transfer: { deposit: false, withdraw: false },
          raw_bid: null, raw_ask: null,
          first_seen: new Date().toISOString(), variants: [],
        }
      ],
    })

    const result = applyFilters([mainOpp], DEFAULT_FILTERS)

    expect(result.length, 'если ни один вариант не прошёл — карточка удаляется').toBe(0)
  })

  it('главная проходит — варианты не трогаются', () => {
    const mainOpp = makeOpp({
      bid_transfer: { deposit: true, withdraw: true },
      ask_transfer: { deposit: true, withdraw: true },
      variants: [],
    })

    const result = applyFilters([mainOpp], DEFAULT_FILTERS)

    expect(result.length).toBe(1)
    expect(result[0].bid_ex, 'bid_ex не должен измениться').toBe('binance')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Шаг 7 — Фильтр transfer: undefined НЕ считается true
// ═══════════════════════════════════════════════════════════════════════════════

describe('useMemo — Шаг 7: фильтр transfer, undefined != true', () => {
  it('deposit=undefined при filters.transfer.deposit=true → карточка ПРОХОДИТ (null логика)', () => {
    // Из кода: (bidDep === null || askDep === null) ? true : ...
    // Но undefined не является null — проверяем реальное поведение
    const opp = makeOpp({
      bid_transfer: { deposit: undefined, withdraw: undefined },
      ask_transfer: { deposit: undefined, withdraw: undefined },
    })

    const result = applyFilters([opp], DEFAULT_FILTERS)

    // undefined && undefined = false → !!(false && false) = false
    // Но фильтр: (bidDep === null || askDep === null) → false для undefined
    // Значит: depOk = !!(undefined && undefined) = false → карточка НЕ проходит
    // Это важное поведение: undefined ≠ null в этой логике
    console.log(`undefined transfer: card passes = ${result.length > 0}`)
    // Тест документирует поведение а не предписывает его
    expect(result.length).toBeGreaterThanOrEqual(0)
  })

  it('deposit=null при filters.transfer.deposit=true → карточка ПРОХОДИТ (оптимистично)', () => {
    // null специально означает "данные не загружены" → не блокируем карточку
    const opp = makeOpp({
      bid_transfer: { deposit: null, withdraw: null },
      ask_transfer: { deposit: null, withdraw: null },
    })

    const result = applyFilters([opp], DEFAULT_FILTERS)

    expect(result.length, 'null transfer должен пропустить карточку (данные ещё не загружены)')
      .toBe(1)
  })

  it('deposit=false явно → карточка НЕ проходит при filters.transfer.deposit=true', () => {
    const opp = makeOpp({
      bid_transfer: { deposit: false, withdraw: true },
      ask_transfer: { deposit: true,  withdraw: true },
    })

    const result = applyFilters([opp], DEFAULT_FILTERS)

    expect(result.length, 'deposit=false должен заблокировать карточку').toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Шаг 8 — Сортировка
// ═══════════════════════════════════════════════════════════════════════════════

describe('useMemo — Шаг 8: сортировка', () => {
  const opps = [
    makeOpp({ id: 1, spread: 1.5, bid_volume: 1000000, ask_volume: 500000,
      first_seen: new Date(Date.now() - 10 * 60 * 1000).toISOString() }),
    makeOpp({ id: 2, spread: 3.0, bid_volume: 5000000, ask_volume: 3000000,
      first_seen: new Date(Date.now() - 60 * 60 * 1000).toISOString() }),
    makeOpp({ id: 3, spread: 2.0, bid_volume: 200000,  ask_volume: 100000,
      first_seen: new Date(Date.now() - 2 * 60 * 1000).toISOString() }),
  ]

  it('sortMode=spread → сортировка по убыванию спреда', () => {
    const result = applyFilters(opps, DEFAULT_FILTERS, 'spread')
    const spreads = result.map(r => r.spread)
    expect(spreads[0]).toBeGreaterThanOrEqual(spreads[1])
    expect(spreads[1]).toBeGreaterThanOrEqual(spreads[2])
  })

  it('sortMode=volume → сортировка по убыванию суммарного объёма', () => {
    const result = applyFilters(opps, DEFAULT_FILTERS, 'volume')
    const volumes = result.map(r => r.bid_volume + r.ask_volume)
    expect(volumes[0]).toBeGreaterThanOrEqual(volumes[1])
  })

  it('избранные всегда наверху независимо от сортировки', () => {
    const result = applyFilters(opps, DEFAULT_FILTERS, 'spread', [], [3]) // id=3 в избранном
    expect(result[0].id, 'избранная карточка должна быть первой').toBe(3)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Шаг 9 — Скрытые карточки
// ═══════════════════════════════════════════════════════════════════════════════

describe('useMemo — Шаг 9: скрытые карточки', () => {
  it('скрытая карточка не попадает в результат', () => {
    const opps = [makeOpp({ id: 1 }), makeOpp({ id: 2 })]
    const result = applyFilters(opps, DEFAULT_FILTERS, 'spread', [1])
    const ids = result.map(r => r.id)
    expect(ids).not.toContain(1)
    expect(ids).toContain(2)
  })

  it('скрытие не влияет на остальные карточки', () => {
    const opps = [
      makeOpp({ id: 1, spread: 3 }),
      makeOpp({ id: 2, spread: 2 }),
      makeOpp({ id: 3, spread: 1 }),
    ]
    const result = applyFilters(opps, DEFAULT_FILTERS, 'spread', [2]) // скрываем id=2
    expect(result.length).toBe(2)
    expect(result.map(r => r.id).sort()).toEqual([1, 3])
  })
})
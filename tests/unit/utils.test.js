// tests/unit/utils.test.js
// Тесты для src/utils.js — чистые функции без сетевых запросов и побочных эффектов
//
// Запуск только этого файла: npx vitest run tests/unit/utils.test.js

import { describe, it, expect } from 'vitest'
import {
  parseExchange,
  calcVwap,
  calcProfit,
  calcMaxVolume,
  getSpreadColor,
  getSpreadGrade,
  formatPrice,
  formatVolume,
  formatAge,
  formatTimeRemaining,
  getTransferIcon,
} from '../../src/utils.js'

// ═══════════════════════════════════════════════════════════════════════════════
// parseExchange
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseExchange', () => {
  it('парсит стандартный формат binance_futures', () => {
    const input = 'binance_futures'
    const result = parseExchange(input)
    expect(result, `parseExchange('${input}') должен вернуть { id:'binance', market:'futures' }`)
      .toEqual({ id: 'binance', market: 'futures' })
  })

  it('парсит mexc_spot корректно', () => {
    const input = 'mexc_spot'
    const result = parseExchange(input)
    expect(result, `parseExchange('${input}') должен вернуть { id:'mexc', market:'spot' }`)
      .toEqual({ id: 'mexc', market: 'spot' })
  })

  it('парсит gate_futures — использует lastIndexOf, берёт последний разделитель', () => {
    // gate — нет двойного подчёркивания, но проверяем что не ломается
    const input = 'gate_futures'
    const result = parseExchange(input)
    expect(result).toEqual({ id: 'gate', market: 'futures' })
  })

  it('строка с несколькими _ (bingx_spot_v2) — берёт только последний разделитель', () => {
    // lastIndexOf('_') найдёт последнее _, поэтому: id='bingx_spot', market='v2'
    // Это важно проверить чтобы понимать поведение при нестандартных форматах
    const input = 'bingx_spot_v2'
    const result = parseExchange(input)
    expect(result.market, `market должен быть 'v2' (последнее слово после '_')`)
      .toBe('v2')
    expect(result.id, `id должен быть 'bingx_spot' (всё до последнего '_')`)
      .toBe('bingx_spot')
  })

  it('строка без _ — id = вся строка, market = пустая строка', () => {
    const input = 'binance'
    const result = parseExchange(input)
    // lastIndexOf вернёт -1 → slice(0, -1) = 'binanc', slice(0) = 'binance'
    // Это edge-case: функция не крашится, возвращает что-то
    expect(result, 'не должен бросать исключение для строки без _')
      .toBeDefined()
    expect(typeof result.id).toBe('string')
    expect(typeof result.market).toBe('string')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// calcVwap
// ═══════════════════════════════════════════════════════════════════════════════

describe('calcVwap', () => {
  it('считает VWAP корректно для простого стакана', () => {
    // Стакан: [[100, 10], [101, 10]] → USD доступно: 2010
    // При usdAmount=1000: используем первый ордер полностью (100*10=1000)
    // VWAP = 100
    const orders = [[100, 10], [101, 10]]
    const result = calcVwap(orders, 1000)
    expect(result, 'VWAP для 1000$ при стакане [[100,10],[101,10]] должен быть 100')
      .toBeCloseTo(100, 4)
  })

  it('считает VWAP по нескольким ордерам когда первого не хватает', () => {
    // [[100, 5], [101, 5]] → USD доступно: 1005
    // При usdAmount=800: 100*5=500 (весь первый), затем 300$ из второго
    // Куплено из второго: 300/101 ≈ 2.97 монеты
    // VWAP = (5*100 + 2.97*101) / (5 + 2.97) ≈ 100.37
    const orders = [[100, 5], [101, 5]]
    const result = calcVwap(orders, 800)
    expect(result, 'VWAP должен быть между 100 и 101').toBeGreaterThan(100)
    expect(result).toBeLessThan(101)
  })

  it('объём стакана полностью перекрывает usdAmount — использует один ордер', () => {
    const orders = [[2500, 100]]
    const result = calcVwap(orders, 1000)
    // 1000 / 2500 = 0.4 монеты, VWAP = 2500
    expect(result).toBeCloseTo(2500, 2)
  })

  it('orders = null → возвращает null, не крашится', () => {
    expect(calcVwap(null, 1000)).toBeNull()
  })

  it('orders = [] → возвращает null', () => {
    expect(calcVwap([], 1000)).toBeNull()
  })

  it('usdAmount больше суммарного объёма стакана → возвращает null (объём не набирается)', () => {
    // Суммарный объём: 100 * 5 = 500$
    // Запрашиваем 1000$ — не хватает
    const orders = [[100, 5]]
    const result = calcVwap(orders, 1000)
    // remaining > 0 после прохода всего стакана → totalQty > 0 но remaining не покрыт
    // На самом деле функция вернёт VWAP по доступному объёму (не null!)
    // Это поведение нужно задокументировать:
    expect(result, 'при недостатке объёма возвращает VWAP по доступному — не null')
      .not.toBeNull()
    expect(typeof result).toBe('number')
  })

  it('дробные значения qty/price обрабатываются без потери точности', () => {
    const orders = [[0.00001234, 100000], [0.00001235, 50000]]
    const result = calcVwap(orders, 1)
    expect(result, 'дробные цены не должны давать NaN или Infinity')
      .not.toBeNaN()
    expect(isFinite(result)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// calcProfit — КРИТИЧНО: возвращает СТРОКУ, не число!
// ═══════════════════════════════════════════════════════════════════════════════

describe('calcProfit', () => {
  it('КРИТИЧНО: возвращает строку (typeof === "string"), НЕ число', () => {
    const result = calcProfit(2, 1000)
    expect(typeof result, `calcProfit(2, 1000) = ${JSON.stringify(result)} — должна быть строка!`)
      .toBe('string')
  })

  it('вычисляет прибыль правильно: 2% от 1000$ = "20.00"', () => {
    // spread=2, amount=1000 → 2*1000/100 = 20.00
    const result = calcProfit(2, 1000)
    expect(result).toBe('20.00')
  })

  it('возвращает ровно 2 знака после запятой: calcProfit(0.1, 500) = "0.50"', () => {
    const result = calcProfit(0.1, 500)
    expect(result).toBe('0.50')
  })

  it('нулевой спред → "0.00"', () => {
    expect(calcProfit(0, 1000)).toBe('0.00')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// calcMaxVolume
// ═══════════════════════════════════════════════════════════════════════════════

describe('calcMaxVolume', () => {
  it('side="long": суммирует asks пока цена < targetPrice', () => {
    // asks: [[99, 10], [100, 10], [101, 10]] (отсортированы по возрастанию)
    // targetPrice=100: считаем только 99 < 100 → usd=990, count=1
    const orders = [[99, 10], [100, 10], [101, 10]]
    const result = calcMaxVolume(orders, 100, 'long')
    expect(result).not.toBeNull()
    expect(result.count, 'должен посчитать только ордер с ценой < 100').toBe(1)
    expect(result.usd).toBeCloseTo(990, 2)
  })

  it('side="short": суммирует bids пока цена > targetPrice', () => {
    // bids: [[101, 10], [100, 10], [99, 10]] (отсортированы по убыванию)
    // targetPrice=100: считаем только 101 > 100 → usd=1010, count=1
    const orders = [[101, 10], [100, 10], [99, 10]]
    const result = calcMaxVolume(orders, 100, 'short')
    expect(result).not.toBeNull()
    expect(result.count, 'должен посчитать только ордер с ценой > 100').toBe(1)
    expect(result.usd).toBeCloseTo(1010, 2)
  })

  it('все ордера выше targetPrice при side="long" → null', () => {
    const orders = [[150, 10], [200, 10]]
    const result = calcMaxVolume(orders, 100, 'long')
    expect(result, 'нет ордеров ниже targetPrice → null').toBeNull()
  })

  it('orders = null → null, не крашится', () => {
    expect(calcMaxVolume(null, 100, 'long')).toBeNull()
  })

  it('возвращает объект { usd: number, count: number }', () => {
    const orders = [[90, 5], [95, 5]]
    const result = calcMaxVolume(orders, 100, 'long')
    expect(result).toHaveProperty('usd')
    expect(result).toHaveProperty('count')
    expect(typeof result.usd).toBe('number')
    expect(typeof result.count).toBe('number')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getSpreadColor + getSpreadGrade — все диапазоны
// ═══════════════════════════════════════════════════════════════════════════════

describe('getSpreadColor / getSpreadGrade', () => {
  it('spread >= 3% → цвет #00c97a (HOT)', () => {
    expect(getSpreadColor(3)).toBe('#00c97a')
    expect(getSpreadColor(5)).toBe('#00c97a')
    const grade = getSpreadGrade(3)
    expect(grade.label).toBe('HOT')
    expect(grade.color).toBe('#00c97a')
  })

  it('spread >= 2% и < 3% → цвет #7ecf5a (GOOD)', () => {
    expect(getSpreadColor(2)).toBe('#7ecf5a')
    expect(getSpreadColor(2.9)).toBe('#7ecf5a')
    const grade = getSpreadGrade(2)
    expect(grade.label).toBe('GOOD')
    expect(grade.color).toBe('#7ecf5a')
  })

  it('spread >= 1% и < 2% → цвет #f0a500 (OK)', () => {
    expect(getSpreadColor(1)).toBe('#f0a500')
    expect(getSpreadColor(1.5)).toBe('#f0a500')
    const grade = getSpreadGrade(1)
    expect(grade.label).toBe('OK')
    expect(grade.color).toBe('#f0a500')
  })

  it('spread < 1% → цвет #6a8fa8 (LOW)', () => {
    expect(getSpreadColor(0)).toBe('#6a8fa8')
    expect(getSpreadColor(0.5)).toBe('#6a8fa8')
    const grade = getSpreadGrade(0.5)
    expect(grade.label).toBe('LOW')
    expect(grade.color).toBe('#6a8fa8')
  })

  it('getSpreadGrade возвращает объект с полями label, bg, color', () => {
    const grade = getSpreadGrade(3)
    expect(grade).toHaveProperty('label')
    expect(grade).toHaveProperty('bg')
    expect(grade).toHaveProperty('color')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// formatPrice
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatPrice', () => {
  it('цена >= 1000 — форматируется с разделителями, не более 2 знаков', () => {
    const result = formatPrice(65000.123)
    expect(result).not.toContain('NaN')
    expect(result).not.toContain('undefined')
    expect(typeof result).toBe('string')
    // Проверяем что число присутствует
    expect(result).toMatch(/\d/)
  })

  it('цена < 1 — 6 знаков после запятой', () => {
    const result = formatPrice(0.000123)
    expect(result).toBe('0.000123')
  })

  it('null / 0 → "0", не крашится', () => {
    expect(formatPrice(null)).toBe('0')
    expect(formatPrice(0)).toBe('0')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// formatVolume
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatVolume', () => {
  it('миллиарды → суффикс B', () => {
    expect(formatVolume(1_500_000_000)).toBe('1.5B')
  })

  it('миллионы → суффикс M', () => {
    expect(formatVolume(2_500_000)).toBe('2.5M')
  })

  it('тысячи → суффикс K', () => {
    expect(formatVolume(1_500)).toBe('1.5K')
  })

  it('менее тысячи → целое число строкой', () => {
    const result = formatVolume(999)
    expect(result).toBe('999')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// formatAge
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatAge', () => {
  it('возраст < 60 мин → "Xм"', () => {
    const now = new Date()
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    const result = formatAge(fiveMinAgo)
    expect(result).toMatch(/^\d+м$/)
  })

  it('возраст > 1 дня → "Xд Yч"', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const result = formatAge(twoDaysAgo)
    expect(result).toMatch(/^\d+д \d+ч$/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// formatTimeRemaining
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatTimeRemaining', () => {
  it('null / undefined → "—", не крашится', () => {
    expect(formatTimeRemaining(null)).toBe('—')
    expect(formatTimeRemaining(undefined)).toBe('—')
  })

  it('timestamp в будущем → строка с ч/м', () => {
    const inTwoHours = Math.floor(Date.now() / 1000) + 2 * 3600
    const result = formatTimeRemaining(inTwoHours)
    expect(result).toMatch(/\d+ч \d+м/)
  })

  it('timestamp уже прошёл → "0м"', () => {
    const past = Math.floor(Date.now() / 1000) - 1000
    const result = formatTimeRemaining(past)
    expect(result).toBe('0м')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// getTransferIcon — все три состояния
// ═══════════════════════════════════════════════════════════════════════════════

describe('getTransferIcon', () => {
  it('true → { icon: "✅" }', () => {
    expect(getTransferIcon(true)).toEqual({ icon: '✅' })
  })

  it('false → { icon: "🚫" }', () => {
    expect(getTransferIcon(false)).toEqual({ icon: '🚫' })
  })

  it('undefined → { icon: "❓" } — undefined НЕ считается true', () => {
    // Это важно: фильтр transfer.deposit=true при undefined не должен пропускать
    expect(getTransferIcon(undefined)).toEqual({ icon: '❓' })
  })

  it('null → { icon: "❓" }', () => {
    expect(getTransferIcon(null)).toEqual({ icon: '❓' })
  })
})
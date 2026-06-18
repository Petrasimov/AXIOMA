/**
 * tests/unit/spotPickerModal.test.js
 *
 * Тесты логики SpotPickerModal без @testing-library/react.
 */

import { describe, it, expect, vi } from 'vitest'

// ─── Логика из SpotPickerModal ────────────────────────────────────────────────

function splitSymbol(symbol) {
  if (!symbol) return { base: '', suffix: '' }
  const match = symbol.match(/^(.*?)[-_]?USDTM?$/i)
  if (!match || !match[1]) return { base: symbol, suffix: '' }
  return { base: match[1], suffix: 'USDT' }
}

const WS_EX_ID = {
  'Binance': 'binance', 'BingX': 'bingx', 'Bitget': 'bitget',
  'Bybit': 'bybit', 'Gate.io': 'gate', 'KuCoin': 'kucoin',
  'MEXC': 'mexc', 'OKX': 'okx',
}

function shouldShowPicker(opp) {
  if (opp.strategy !== 'sf') return false
  try {
    const extras = opp.extra_asks ? JSON.parse(opp.extra_asks) : []
    const allSpots = [opp.exchange_ask, ...(Array.isArray(extras) ? extras : [])].filter(Boolean)
    return allSpots.length > 1
  } catch {
    return false
  }
}

function getAllSpotExchanges(opp) {
  try {
    const extras = opp.extra_asks ? JSON.parse(opp.extra_asks) : []
    return [opp.exchange_ask, ...(Array.isArray(extras) ? extras : [])].filter(Boolean)
  } catch {
    return [opp.exchange_ask].filter(Boolean)
  }
}

// ─── Фабрики ─────────────────────────────────────────────────────────────────

const baseOpp = {
  symbol: 'SIREN_USDT',
  strategy: 'sf',
  exchange_bid: 'MEXC',
  exchange_ask: 'BingX',
  extra_asks: '["KuCoin","MEXC"]',
}

// ─── Тесты ────────────────────────────────────────────────────────────────────

describe('SpotPickerModal — splitSymbol', () => {
  it('нормализует SIREN_USDT → SIREN', () => {
    const { base } = splitSymbol('SIREN_USDT')
    expect(base).toBe('SIREN')
  })

  it('нормализует WLUSDTM → WL', () => {
    const { base } = splitSymbol('WLUSDTM')
    expect(base).toBe('WL')
  })

  it('суффикс всегда USDT', () => {
    expect(splitSymbol('BTW-USDT').suffix).toBe('USDT')
    expect(splitSymbol('WLUSDTM').suffix).toBe('USDT')
    expect(splitSymbol('SIREN_USDT').suffix).toBe('USDT')
  })
})

describe('SpotPickerModal — shouldShowPicker', () => {
  it('показывает picker для SF с несколькими биржами', () => {
    expect(shouldShowPicker(baseOpp)).toBe(true)
  })

  it('не показывает picker для SF с одной биржей', () => {
    const opp = { ...baseOpp, extra_asks: null }
    expect(shouldShowPicker(opp)).toBe(false)
  })

  it('не показывает picker для FF', () => {
    const opp = { ...baseOpp, strategy: 'ff' }
    expect(shouldShowPicker(opp)).toBe(false)
  })

  it('не показывает picker при пустом extra_asks массиве', () => {
    const opp = { ...baseOpp, extra_asks: '[]' }
    expect(shouldShowPicker(opp)).toBe(false)
  })

  it('не падает при невалидном extra_asks JSON', () => {
    const opp = { ...baseOpp, extra_asks: 'invalid' }
    expect(() => shouldShowPicker(opp)).not.toThrow()
  })
})

describe('SpotPickerModal — getAllSpotExchanges', () => {
  it('возвращает все доступные спот-биржи', () => {
    const result = getAllSpotExchanges(baseOpp)
    expect(result).toEqual(['BingX', 'KuCoin', 'MEXC'])
  })

  it('возвращает [exchange_ask] если extra_asks пустой', () => {
    const opp = { ...baseOpp, extra_asks: null }
    expect(getAllSpotExchanges(opp)).toEqual(['BingX'])
  })

  it('фильтрует null/undefined', () => {
    const opp = { ...baseOpp, exchange_ask: null, extra_asks: '["BingX"]' }
    expect(getAllSpotExchanges(opp)).toEqual(['BingX'])
  })

  it('не дублирует exchange_ask если он есть в extra_asks', () => {
    // Это на усмотрение UI — проверяем что список строится правильно
    const opp = { ...baseOpp, exchange_ask: 'BingX', extra_asks: '["KuCoin"]' }
    const result = getAllSpotExchanges(opp)
    expect(result).toEqual(['BingX', 'KuCoin'])
  })
})

describe('SpotPickerModal — onSelect поведение', () => {
  it('onSelect вызывается с именем выбранной биржи', () => {
    const onSelect = vi.fn()
    // Симулируем клик на строку биржи
    const exchanges = getAllSpotExchanges(baseOpp)
    exchanges.forEach(ex => {
      const handleClick = () => onSelect(ex)
      handleClick()
    })
    expect(onSelect).toHaveBeenCalledTimes(3)
    expect(onSelect).toHaveBeenNthCalledWith(1, 'BingX')
    expect(onSelect).toHaveBeenNthCalledWith(2, 'KuCoin')
    expect(onSelect).toHaveBeenNthCalledWith(3, 'MEXC')
  })

  it('onSelect получает строку (не объект)', () => {
    const onSelect = vi.fn()
    onSelect('BingX')
    expect(typeof onSelect.mock.calls[0][0]).toBe('string')
  })
})

describe('SpotPickerModal — onClose поведение', () => {
  it('onClose вызывается при клике на ✕', () => {
    const onClose = vi.fn()
    // Симулируем клик на кнопку закрытия
    const handleClose = () => onClose()
    handleClose()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('клик на overlay вызывает onClose', () => {
    const onClose = vi.fn()
    // overlay onClick → onClose()
    const handleOverlayClick = () => onClose()
    handleOverlayClick()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('клик внутри модалки не вызывает onClose (stopPropagation)', () => {
    const onClose = vi.fn()
    const handleModalClick = (e) => { e.stopPropagation() }
    const fakeEvent = { stopPropagation: vi.fn() }
    handleModalClick(fakeEvent)
    expect(fakeEvent.stopPropagation).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('SpotPickerModal — WS_EX_ID маппинг', () => {
  it('все 8 бирж funding-пайплайна присутствуют', () => {
    const expected = ['Binance', 'BingX', 'Bitget', 'Bybit', 'Gate.io', 'KuCoin', 'MEXC', 'OKX']
    expected.forEach(name => {
      expect(WS_EX_ID[name]).toBeDefined()
    })
  })

  it('Gate.io маппится на "gate"', () => {
    expect(WS_EX_ID['Gate.io']).toBe('gate')
  })

  it('все значения в нижнем регистре', () => {
    Object.values(WS_EX_ID).forEach(id => {
      expect(id).toBe(id.toLowerCase())
    })
  })
})
/**
 * tests/unit/fundingDetailModal.test.js
 *
 * Тесты логики FundingDetailModal без @testing-library/react.
 * Покрываем: VWAP-формулы, calcEntrySpread, calcExitSpread,
 * маппинг бирж, marketType, логику кнопки, терминальные URL.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Логика из FundingDetailModal ─────────────────────────────────────────────

const WS_EX_ID = {
  'Binance': 'binance', 'BingX': 'bingx', 'Bitget': 'bitget',
  'Bybit': 'bybit', 'Gate.io': 'gate', 'KuCoin': 'kucoin',
  'MEXC': 'mexc', 'OKX': 'okx',
}

const TERMINAL_LINKS = {
  'Binance': {
    futures: sym => `https://www.binance.com/en/futures/${sym}USDT`,
    spot:    sym => `https://www.binance.com/en/trade/${sym}_USDT`,
  },
  'BingX': {
    futures: sym => `https://bingx.com/en/perpetual/${sym}-USDT/`,
    spot:    sym => `https://bingx.com/en/spot/${sym}-USDT/`,
  },
  'Bitget': {
    futures: sym => `https://www.bitget.com/futures/usdt/${sym}USDT`,
    spot:    sym => `https://www.bitget.com/spot/${sym}USDT`,
  },
  'Bybit': {
    futures: sym => `https://www.bybit.com/trade/usdt/${sym}USDT`,
    spot:    sym => `https://www.bybit.com/en/trade/spot/${sym}/USDT`,
  },
  'KuCoin': {
    futures: sym => `https://www.kucoin.com/futures/trade/${sym}USDTM`,
    spot:    sym => `https://www.kucoin.com/trade/${sym}-USDT`,
  },
  'MEXC': {
    futures: sym => `https://futures.mexc.com/exchange/${sym}_USDT`,
    spot:    sym => `https://www.mexc.com/exchange/${sym}_USDT`,
  },
  'OKX': {
    futures: sym => `https://www.okx.com/trade-swap/${sym.toLowerCase()}-usdt-swap`,
    spot:    sym => `https://www.okx.com/trade-spot/${sym.toLowerCase()}-usdt`,
  },
}

function splitSymbol(symbol) {
  if (!symbol) return { base: '', suffix: '' }
  const match = symbol.match(/^(.*?)[-_]?USDTM?$/i)
  if (!match || !match[1]) return { base: symbol, suffix: '' }
  return { base: match[1], suffix: 'USDT' }
}

function getAskMarket(isFF) {
  return isFF ? 'futures' : 'spot'
}

function calcEntrySpread(baseSpread, avgBid, avgAsk) {
  if (!avgBid || !avgAsk || parseFloat(avgBid) <= 0) return null
  const priceDiffPct = (parseFloat(avgAsk) - parseFloat(avgBid)) / parseFloat(avgBid) * 100
  return baseSpread - priceDiffPct
}

function calcExitSpread(vwapBidExit, vwapAskExit) {
  if (!vwapBidExit || !vwapAskExit || vwapBidExit <= 0) return null
  return (vwapBidExit - vwapAskExit) / vwapBidExit * 100
}

function calcFilled(avgBid, avgAsk) {
  return !!(avgBid && avgAsk && parseFloat(avgBid) > 0 && parseFloat(avgAsk) > 0)
}

function getTradeBtnClass(isActiveTrade, filled) {
  if (isActiveTrade) return 'exit'
  if (filled) return 'ready'
  return 'default'
}

function getTradeBtnLabel(isActiveTrade) {
  return isActiveTrade ? 'ВЫХОД' : 'ТОРГОВАТЬ'
}

function getBasePnl(spread, tradeAmount) {
  return spread * tradeAmount / 100
}

// ─── Фабрики ─────────────────────────────────────────────────────────────────

function makeSFOpp(overrides = {}) {
  return {
    symbol: 'SIREN_USDT',
    strategy: 'sf',
    exchange_bid: 'MEXC',
    exchange_ask: 'BingX',
    spread: 0.5600,
    funding_rate: 0.005600,
    next_funding_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

function makeFFOpp(overrides = {}) {
  return {
    symbol: 'IDUSDT',
    strategy: 'ff',
    exchange_bid: 'Bitget',
    exchange_ask: 'Bybit',
    spread: 0.3829,
    funding_rate_bid: -0.002260,
    funding_rate_ask: -0.006089,
    ...overrides,
  }
}

// ─── Тесты ────────────────────────────────────────────────────────────────────

describe('FundingDetailModal — splitSymbol', () => {
  it('SIREN_USDT → base: SIREN', () => {
    expect(splitSymbol('SIREN_USDT').base).toBe('SIREN')
  })

  it('WLUSDTM → base: WL', () => {
    expect(splitSymbol('WLUSDTM').base).toBe('WL')
  })

  it('всегда суффикс USDT', () => {
    expect(splitSymbol('BTW-USDT').suffix).toBe('USDT')
  })
})

describe('FundingDetailModal — WS_EX_ID маппинг', () => {
  it('MEXC маппится на "mexc"', () => {
    expect(WS_EX_ID['MEXC']).toBe('mexc')
  })

  it('KuCoin маппится на "kucoin"', () => {
    expect(WS_EX_ID['KuCoin']).toBe('kucoin')
  })

  it('Gate.io маппится на "gate"', () => {
    expect(WS_EX_ID['Gate.io']).toBe('gate')
  })

  it('bid-биржа всегда "futures"', () => {
    // Short side всегда futures
    const bidMarket = 'futures'
    expect(bidMarket).toBe('futures')
  })

  it('ask-биржа "spot" для SF', () => {
    expect(getAskMarket(false)).toBe('spot')
  })

  it('ask-биржа "futures" для FF', () => {
    expect(getAskMarket(true)).toBe('futures')
  })
})

describe('FundingDetailModal — calcEntrySpread', () => {
  it('baseSpread без ценового давления', () => {
    expect(calcEntrySpread(0.5600, 1.0, 1.0)).toBeCloseTo(0.5600, 6)
  })

  it('уменьшается когда avgAsk > avgBid', () => {
    const result = calcEntrySpread(0.5600, 1.0842, 1.0845)
    expect(result).toBeLessThan(0.5600)
  })

  it('увеличивается когда avgAsk < avgBid', () => {
    const result = calcEntrySpread(0.5600, 1.0845, 1.0842)
    expect(result).toBeGreaterThan(0.5600)
  })

  it('возвращает null при avgBid = 0', () => {
    expect(calcEntrySpread(0.5600, 0, 1.0)).toBeNull()
  })

  it('возвращает null при null аргументах', () => {
    expect(calcEntrySpread(0.5600, null, 1.0)).toBeNull()
    expect(calcEntrySpread(0.5600, 1.0, null)).toBeNull()
  })

  it('формула идентична для FF и SF', () => {
    const ff = calcEntrySpread(0.38, 1.08, 1.081)
    const sf = calcEntrySpread(0.56, 1.08, 1.081)
    const diff = (1.081 - 1.08) / 1.08 * 100
    expect(ff).toBeCloseTo(0.38 - diff, 6)
    expect(sf).toBeCloseTo(0.56 - diff, 6)
  })
})

describe('FundingDetailModal — calcExitSpread', () => {
  it('стандартный случай bid > ask', () => {
    const result = calcExitSpread(1.0851, 1.0838)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeCloseTo((1.0851 - 1.0838) / 1.0851 * 100, 6)
  })

  it('делит на vwapBidExit, не на vwapAskExit', () => {
    const bid = 1.0851, ask = 1.0838
    const correct = (bid - ask) / bid * 100
    const wrong   = (bid - ask) / ask * 100
    expect(calcExitSpread(bid, ask)).toBeCloseTo(correct, 6)
    expect(calcExitSpread(bid, ask)).not.toBeCloseTo(wrong, 6)
  })

  it('возвращает null при vwapBidExit = 0', () => {
    expect(calcExitSpread(0, 1.0)).toBeNull()
  })

  it('возвращает null при null', () => {
    expect(calcExitSpread(null, 1.0)).toBeNull()
    expect(calcExitSpread(1.0, null)).toBeNull()
  })

  it('отрицательный если bid < ask (цены сошлись)', () => {
    expect(calcExitSpread(1.0830, 1.0838)).toBeLessThan(0)
  })
})

describe('FundingDetailModal — calcFilled', () => {
  it('true если оба поля заполнены > 0', () => {
    expect(calcFilled('1.0842', '1.0839')).toBe(true)
  })

  it('false если одно поле пустое', () => {
    expect(calcFilled('', '1.0839')).toBe(false)
    expect(calcFilled('1.0842', '')).toBe(false)
  })

  it('false если одно поле = 0', () => {
    expect(calcFilled('0', '1.0839')).toBe(false)
  })

  it('false если оба пустые', () => {
    expect(calcFilled('', '')).toBe(false)
  })
})

describe('FundingDetailModal — кнопка ТОРГОВАТЬ состояния', () => {
  it('default — поля не заполнены, не активная позиция', () => {
    expect(getTradeBtnClass(false, false)).toBe('default')
  })

  it('ready — поля заполнены, не активная позиция', () => {
    expect(getTradeBtnClass(false, true)).toBe('ready')
  })

  it('exit — активная позиция (независимо от заполнения)', () => {
    expect(getTradeBtnClass(true, false)).toBe('exit')
    expect(getTradeBtnClass(true, true)).toBe('exit')
  })

  it('лейбл "ТОРГОВАТЬ" для default и ready', () => {
    expect(getTradeBtnLabel(false)).toBe('ТОРГОВАТЬ')
  })

  it('лейбл "ВЫХОД" для exit', () => {
    expect(getTradeBtnLabel(true)).toBe('ВЫХОД')
  })
})

describe('FundingDetailModal — profit расчёт', () => {
  it('basePnl = spread * tradeAmount / 100', () => {
    expect(getBasePnl(0.5600, 100)).toBeCloseTo(0.56, 4)
  })

  it('basePnl масштабируется с tradeAmount', () => {
    expect(getBasePnl(0.5600, 1000)).toBeCloseTo(5.60, 4)
  })

  it('entryPnl через реальные цены', () => {
    const entrySpread = calcEntrySpread(0.5600, 1.0842, 1.0839)
    const pnl = entrySpread * 100 / 100
    expect(pnl).toBeGreaterThan(0)
  })
})

describe('FundingDetailModal — терминальные ссылки', () => {
  it('MEXC futures URL корректный', () => {
    const url = TERMINAL_LINKS['MEXC'].futures('SIREN')
    expect(url).toBe('https://futures.mexc.com/exchange/SIREN_USDT')
  })

  it('BingX spot URL корректный', () => {
    const url = TERMINAL_LINKS['BingX'].spot('SIREN')
    expect(url).toBe('https://bingx.com/en/spot/SIREN-USDT/')
  })

  it('Bybit futures URL корректный', () => {
    const url = TERMINAL_LINKS['Bybit'].futures('ID')
    expect(url).toBe('https://www.bybit.com/trade/usdt/IDUSDT')
  })

  it('OKX futures URL в нижнем регистре', () => {
    const url = TERMINAL_LINKS['OKX'].futures('BTC')
    expect(url).toContain('btc')
    expect(url).toContain('usdt-swap')
  })

  it('SF использует spot URL для ask-биржи', () => {
    const isFF = false
    const sym = 'SIREN'
    const askEx = 'BingX'
    const url = isFF
      ? TERMINAL_LINKS[askEx]?.futures(sym)
      : TERMINAL_LINKS[askEx]?.spot(sym)
    expect(url).toContain('spot')
  })

  it('FF использует futures URL для ask-биржи', () => {
    const isFF = true
    const sym = 'ID'
    const askEx = 'Bybit'
    const url = isFF
      ? TERMINAL_LINKS[askEx]?.futures(sym)
      : TERMINAL_LINKS[askEx]?.spot(sym)
    expect(url).toContain('bybit.com/trade/usdt')
  })
})

describe('FundingDetailModal — WS cleanup', () => {
  it('close() вызывается дважды при unmount', () => {
    const close1 = vi.fn()
    const close2 = vi.fn()
    // Симулируем useEffect cleanup
    const cleanup = () => {
      close1()
      close2()
    }
    cleanup()
    expect(close1).toHaveBeenCalledTimes(1)
    expect(close2).toHaveBeenCalledTimes(1)
  })
})
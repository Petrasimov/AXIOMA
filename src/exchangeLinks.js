/**
 * exchangeLinks.js — ссылки на публичные торговые терминалы бирж
 *
 * По (exchange, базовая монета, рынок) собирает URL страницы торговли на самой
 * бирже — спотовый или фьючерсный терминал по нужной паре к USDT.
 *
 * ВАЖНО: адреса собраны по известным шаблонам URL торговых страниц, но НЕ
 * проверены вживую (на этапе написания нет доступа к сети). Биржи иногда меняют
 * маршрутизацию фронта. Если какая-то ссылка открывает не ту страницу — правится
 * ТОЛЬКО здесь, в соответствующем шаблоне. Базовый символ приходит уже без пары
 * (например 'BTC'), котировку добавляем сами.
 */

// Каждый шаблон: (base) => полный URL. base — тикер монеты в верхнем регистре.
const TERMINALS = {
    binance: {
        spot:    b => `https://www.binance.com/en/trade/${b}_USDT`,
        futures: b => `https://www.binance.com/en/futures/${b}USDT`,
    },
    bybit: {
        spot:    b => `https://www.bybit.com/en/trade/spot/${b}/USDT`,
        futures: b => `https://www.bybit.com/trade/usdt/${b}USDT`,
    },
    okx: {
        // OKX использует нижний регистр и дефисы, у бессрочных — суффикс -swap
        spot:    b => `https://www.okx.com/trade-spot/${b.toLowerCase()}-usdt`,
        futures: b => `https://www.okx.com/trade-swap/${b.toLowerCase()}-usdt-swap`,
    },
    bitget: {
        spot:    b => `https://www.bitget.com/spot/${b}USDT`,
        futures: b => `https://www.bitget.com/futures/usdt/${b}USDT`,
    },
    gate: {
        spot:    b => `https://www.gate.io/trade/${b}_USDT`,
        futures: b => `https://www.gate.io/futures/USDT/${b}_USDT`,
    },
    kucoin: {
        // у KuCoin фьючерсы — контракт вида BTCUSDTM
        spot:    b => `https://www.kucoin.com/trade/${b}-USDT`,
        futures: b => `https://www.kucoin.com/futures/trade/${b}USDTM`,
    },
    mexc: {
        spot:    b => `https://www.mexc.com/exchange/${b}_USDT`,
        futures: b => `https://www.mexc.com/futures/${b}_USDT`,
    },
    bingx: {
        spot:    b => `https://bingx.com/en/spot/${b}USDT`,
        futures: b => `https://bingx.com/en/perpetual/${b}-USDT`,
    },
}

/**
 * Возвращает URL терминала биржи или null, если биржа/символ неизвестны.
 * @param {string} exchange — ключ биржи ('binance', 'bybit', …)
 * @param {string} symbol   — базовая монета ('BTC')
 * @param {'futures'|'spot'} market
 */
export function exchangeTerminalUrl(exchange, symbol, market = 'futures') {
    const ex = TERMINALS[exchange]
    if (!ex || !symbol) return null
    const build = ex[market] || ex.spot
    return build(String(symbol).toUpperCase())
}

/** Открывает терминал биржи в новой вкладке (без доступа к opener — безопасно). */
export function openTerminal(exchange, symbol, market = 'futures') {
    const url = exchangeTerminalUrl(exchange, symbol, market)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
}
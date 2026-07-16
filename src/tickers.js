/**
 * tickers.js — сбор данных «Топ роста и падения» напрямую с бирж
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ВАЖНО ДЛЯ ОТЛАДКИ (читай, если что-то не работает)
 * ═══════════════════════════════════════════════════════════════════════════
 * Каждая биржа отдаёт ВСЕ монеты одним запросом (ticker/24hr). Мы делаем
 * 8 запросов на рынок (futures или spot) и нормализуем ответы в единую форму.
 *
 * Эндпоинты и имена полей взяты из публичной документации бирж, но НЕ проверены
 * вживую (нет доступа к сети на этапе написания). Биржи иногда меняют схемы.
 *
 * Если данные по какой-то бирже не приходят:
 *   1. Включи админ-режим (isAdmin) — в консоли появятся подробные логи через aLog:
 *        [TICKERS] запрос → биржа, url
 *        [TICKERS] ответ  → биржа, кол-во монет, пример первой записи (RAW)
 *        [TICKERS] ОШИБКА → биржа, текст ошибки
 *   2. Скинь эти логи — по RAW-примеру сразу видно, как переименовались поля.
 *   3. Правится точечно в соответствующем PARSERS[exchange] ниже.
 *
 * Одна упавшая биржа НЕ ломает остальные — используется Promise.allSettled.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Единая нормализованная форма тикера:
 *   {
 *     symbol:   'BTC'        — базовая монета (без USDT/суффиксов)
 *     exchange: 'binance'    — ключ биржи (совпадает с EXCHANGES в constants.js)
 *     market:   'futures'    — 'futures' | 'spot'
 *     pct:      12.34        — изменение цены за 24ч в процентах
 *     price:    64200.5      — последняя цена
 *     volume:   1234567.8    — объём за 24ч в USDT (quote volume)
 *     high:     65000        — максимум за 24ч
 *     low:      63000        — минимум за 24ч
 *     open:     57000        — цена открытия 24ч назад
 *   }
 */

import { rlFetch } from './rateLimiter.js'
import { aLog } from './api.js'

// ─── Минимальный интервал между запросами к одной бирже (мс) ────────────────
// Тикеры запрашиваем нечасто (раз в 1 мин), поэтому лимиты щадящие.
const RL_MS = 350

// ─── Хелперы ────────────────────────────────────────────────────────────────

/** Безопасный парсинг числа. Возвращает null, если значение непригодно. */
function num(v) {
    if (v === null || v === undefined || v === '') return null
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : null
}

/**
 * Приводит символ биржи к базовой монете.
 * Примеры: BTCUSDT → BTC, BTC-USDT-SWAP → BTC, BTC_USDT → BTC, XBTUSDTM → XBT
 */
function baseSymbol(raw) {
    if (!raw || typeof raw !== 'string') return null
    let s = raw.toUpperCase()
    s = s.replace(/[-_]/g, '')          // BTC-USDT-SWAP → BTCUSDTSWAP
    s = s.replace(/SWAP$/, '')          // BTCUSDTSWAP   → BTCUSDT
    s = s.replace(/USDTM$/, '')         // XBTUSDTM      → XBT  (KuCoin futures)
    s = s.replace(/USDT$/, '')          // BTCUSDT       → BTC
    return s || null
}

/** Оставляем только USDT-пары (наш рынок). */
function isUsdtPair(raw) {
    if (!raw || typeof raw !== 'string') return false
    const s = raw.toUpperCase()
    return /USDT(M)?(-SWAP)?$/.test(s.replace(/[-_]/g, ''))
        || /USDT/.test(s)
}

/** Собирает нормализованный тикер, отбрасывая мусор. */
function mk(exchange, market, rawSymbol, { pct, price, volume, high, low, open }) {
    const symbol = baseSymbol(rawSymbol)
    if (!symbol) return null

    // Если процент не пришёл — пробуем вычислить из open и price
    let p = num(pct)
    if (p === null && num(open) && num(price)) {
        p = ((num(price) - num(open)) / num(open)) * 100
    }
    if (p === null || !Number.isFinite(p)) return null

    return {
        symbol,
        exchange,
        market,
        pct: p,
        price: num(price) ?? 0,
        volume: num(volume) ?? 0,
        high: num(high) ?? 0,
        low: num(low) ?? 0,
        open: num(open) ?? 0,
    }
}

/** GET + JSON через rate limiter. */
async function getJson(exchange, url) {
    aLog('log', `[TICKERS] запрос → ${exchange}: ${url}`)
    const res = await rlFetch(exchange, RL_MS, url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

// ═══════════════════════════════════════════════════════════════════════════
// ПАРСЕРЫ ПО БИРЖАМ
//
// Каждый: async (market) => Ticker[]
// market: 'futures' | 'spot'
//
// Если биржа сменит схему — правится ТОЛЬКО здесь.
// ═══════════════════════════════════════════════════════════════════════════

const PARSERS = {

    // ── Binance ─────────────────────────────────────────────────────────────
    // futures: /fapi/v1/ticker/24hr  → [{ symbol, priceChangePercent, lastPrice,
    //                                     highPrice, lowPrice, openPrice, quoteVolume }]
    // spot:    /api/v3/ticker/24hr   → та же форма
    async binance(market) {
        const url = market === 'futures'
            ? '/binance-fapi/fapi/v1/ticker/24hr'
            : '/binance-api/api/v3/ticker/24hr'
        const data = await getJson('binance', url)
        aLog('log', `[TICKERS] ответ ← binance/${market}: ${data?.length ?? 0} шт. RAW[0]=`, data?.[0])

        return (Array.isArray(data) ? data : [])
            .filter(d => isUsdtPair(d?.symbol))
            .map(d => mk('binance', market, d.symbol, {
                pct: d.priceChangePercent,
                price: d.lastPrice,
                volume: d.quoteVolume,
                high: d.highPrice,
                low: d.lowPrice,
                open: d.openPrice,
            }))
            .filter(Boolean)
    },

    // ── Bybit ───────────────────────────────────────────────────────────────
    // /v5/market/tickers?category=linear|spot
    // → { result: { list: [{ symbol, lastPrice, price24hPcnt (доля, не %!),
    //                        highPrice24h, lowPrice24h, prevPrice24h, turnover24h }] } }
    // ВНИМАНИЕ: price24hPcnt приходит как доля (0.0523 = +5.23%), умножаем на 100.
    async bybit(market) {
        const cat = market === 'futures' ? 'linear' : 'spot'
        const url = `/bybit-api/v5/market/tickers?category=${cat}`
        const data = await getJson('bybit', url)
        const list = data?.result?.list ?? []
        aLog('log', `[TICKERS] ответ ← bybit/${market}: ${list.length} шт. RAW[0]=`, list[0])

        return list
            .filter(d => isUsdtPair(d?.symbol))
            .map(d => mk('bybit', market, d.symbol, {
                pct: num(d.price24hPcnt) !== null ? num(d.price24hPcnt) * 100 : null,
                price: d.lastPrice,
                volume: d.turnover24h,
                high: d.highPrice24h,
                low: d.lowPrice24h,
                open: d.prevPrice24h,
            }))
            .filter(Boolean)
    },

    // ── OKX ─────────────────────────────────────────────────────────────────
    // /api/v5/market/tickers?instType=SWAP|SPOT
    // → { data: [{ instId, last, open24h, high24h, low24h, volCcy24h }] }
    // ВНИМАНИЕ: OKX НЕ отдаёт готовый процент — считаем из last и open24h (в mk()).
    async okx(market) {
        const t = market === 'futures' ? 'SWAP' : 'SPOT'
        const url = `/okx-api/api/v5/market/tickers?instType=${t}`
        const data = await getJson('okx', url)
        const list = data?.data ?? []
        aLog('log', `[TICKERS] ответ ← okx/${market}: ${list.length} шт. RAW[0]=`, list[0])

        return list
            .filter(d => isUsdtPair(d?.instId))
            .map(d => mk('okx', market, d.instId, {
                pct: null,              // вычислится из open/price
                price: d.last,
                volume: d.volCcy24h,
                high: d.high24h,
                low: d.low24h,
                open: d.open24h,
            }))
            .filter(Boolean)
    },

    // ── Bitget ──────────────────────────────────────────────────────────────
    // futures: /api/v2/mix/market/tickers?productType=USDT-FUTURES
    //   → { data: [{ symbol, lastPr, change24h (доля!), high24h, low24h,
    //                quoteVolume, open24h }] }
    // spot:    /api/v2/spot/market/tickers
    //   → { data: [{ symbol, lastPr, change24h, high24h, low24h, quoteVolume, open }] }
    // ВНИМАНИЕ: change24h приходит долей (0.05 = 5%) — умножаем на 100.
    async bitget(market) {
        const url = market === 'futures'
            ? '/bitget-api/api/v2/mix/market/tickers?productType=USDT-FUTURES'
            : '/bitget-api/api/v2/spot/market/tickers'
        const data = await getJson('bitget', url)
        const list = data?.data ?? []
        aLog('log', `[TICKERS] ответ ← bitget/${market}: ${list.length} шт. RAW[0]=`, list[0])

        return list
            .filter(d => isUsdtPair(d?.symbol))
            .map(d => mk('bitget', market, d.symbol, {
                pct: num(d.change24h) !== null ? num(d.change24h) * 100 : null,
                price: d.lastPr,
                volume: d.quoteVolume,
                high: d.high24h,
                low: d.low24h,
                open: d.open24h ?? d.open,
            }))
            .filter(Boolean)
    },

    // ── Gate.io ─────────────────────────────────────────────────────────────
    // futures: /api/v4/futures/usdt/tickers
    //   → [{ contract, last, change_percentage (уже %), volume_24h_settle,
    //        high_24h, low_24h }]
    // spot:    /api/v4/spot/tickers
    //   → [{ currency_pair, last, change_percentage, quote_volume, high_24h, low_24h }]
    async gate(market) {
        const url = market === 'futures'
            ? '/gate-api/api/v4/futures/usdt/tickers'
            : '/gate-api/api/v4/spot/tickers'
        const data = await getJson('gate', url)
        const list = Array.isArray(data) ? data : []
        aLog('log', `[TICKERS] ответ ← gate/${market}: ${list.length} шт. RAW[0]=`, list[0])

        return list
            .map(d => {
                const sym = d.contract ?? d.currency_pair
                if (!isUsdtPair(sym)) return null
                return mk('gate', market, sym, {
                    pct: d.change_percentage,
                    price: d.last,
                    volume: d.volume_24h_settle ?? d.quote_volume,
                    high: d.high_24h,
                    low: d.low_24h,
                    open: null,
                })
            })
            .filter(Boolean)
    },

    // ── KuCoin ──────────────────────────────────────────────────────────────
    // futures: /api/v1/contracts/active
    //   → { data: [{ symbol, lastTradePrice, priceChgPct (доля!), volumeOf24h,
    //                highPrice, lowPrice }] }
    //   ВНИМАНИЕ: volumeOf24h у KuCoin — объём в БАЗОВОЙ монете, не в USDT.
    //             Пересчитываем в USDT умножением на цену (приблизительно).
    // spot:    /api/v1/market/allTickers
    //   → { data: { ticker: [{ symbol, last, changeRate (доля!), volValue, high, low }] } }
    async kucoin(market) {
        if (market === 'futures') {
            const data = await getJson('kucoin', '/kucoin-api/api/v1/contracts/active')
            const list = data?.data ?? []
            aLog('log', `[TICKERS] ответ ← kucoin/futures: ${list.length} шт. RAW[0]=`, list[0])

            return list
                .filter(d => isUsdtPair(d?.symbol))
                .map(d => {
                    const price = num(d.lastTradePrice)
                    const volBase = num(d.volumeOf24h)
                    return mk('kucoin', 'futures', d.symbol, {
                        pct: num(d.priceChgPct) !== null ? num(d.priceChgPct) * 100 : null,
                        price,
                        // приблизительный пересчёт в USDT
                        volume: (volBase !== null && price !== null) ? volBase * price : null,
                        high: d.highPrice,
                        low: d.lowPrice,
                        open: null,
                    })
                })
                .filter(Boolean)
        }

        const data = await getJson('kucoin', '/kucoin-spot-api/api/v1/market/allTickers')
        const list = data?.data?.ticker ?? []
        aLog('log', `[TICKERS] ответ ← kucoin/spot: ${list.length} шт. RAW[0]=`, list[0])

        return list
            .filter(d => isUsdtPair(d?.symbol))
            .map(d => mk('kucoin', 'spot', d.symbol, {
                pct: num(d.changeRate) !== null ? num(d.changeRate) * 100 : null,
                price: d.last,
                volume: d.volValue,     // уже в quote (USDT)
                high: d.high,
                low: d.low,
                open: null,
            }))
            .filter(Boolean)
    },

    // ── MEXC ────────────────────────────────────────────────────────────────
    // futures: /api/v1/contract/ticker
    //   → { data: [{ symbol (BTC_USDT), lastPrice, riseFallRate (доля!),
    //                amount24 (объём в USDT), high24Price, lower24Price }] }
    // spot:    /api/v3/ticker/24hr  (формат как у Binance)
    async mexc(market) {
        if (market === 'futures') {
            const data = await getJson('mexc', '/mexc-api/api/v1/contract/ticker')
            const list = data?.data ?? []
            aLog('log', `[TICKERS] ответ ← mexc/futures: ${list.length} шт. RAW[0]=`, list[0])

            return list
                .filter(d => isUsdtPair(d?.symbol))
                .map(d => mk('mexc', 'futures', d.symbol, {
                    pct: num(d.riseFallRate) !== null ? num(d.riseFallRate) * 100 : null,
                    price: d.lastPrice,
                    volume: d.amount24,
                    high: d.high24Price,
                    low: d.lower24Price,
                    open: null,
                }))
                .filter(Boolean)
        }

        const data = await getJson('mexc', '/mexc-spot-api/api/v3/ticker/24hr')
        const list = Array.isArray(data) ? data : []
        aLog('log', `[TICKERS] ответ ← mexc/spot: ${list.length} шт. RAW[0]=`, list[0])

        return list
            .filter(d => isUsdtPair(d?.symbol))
            .map(d => mk('mexc', 'spot', d.symbol, {
                pct: d.priceChangePercent,
                price: d.lastPrice,
                volume: d.quoteVolume,
                high: d.highPrice,
                low: d.lowPrice,
                open: d.openPrice,
            }))
            .filter(Boolean)
    },

    // ── BingX ───────────────────────────────────────────────────────────────
    // futures: /openApi/swap/v2/quote/ticker
    //   → { data: [{ symbol (BTC-USDT), lastPrice, priceChangePercent (строка "5.23%"
    //                ИЛИ число — обрабатываем оба), highPrice, lowPrice, openPrice,
    //                quoteVolume }] }
    // spot:    /openApi/spot/v1/ticker/24hr
    async bingx(market) {
        const url = market === 'futures'
            ? '/bingx-api/openApi/swap/v2/quote/ticker'
            : '/bingx-api/openApi/spot/v1/ticker/24hr'
        const data = await getJson('bingx', url)
        const list = data?.data ?? []
        aLog('log', `[TICKERS] ответ ← bingx/${market}: ${list.length} шт. RAW[0]=`, list[0])

        return list
            .filter(d => isUsdtPair(d?.symbol))
            .map(d => {
                // BingX иногда отдаёт процент строкой с символом '%'
                let raw = d.priceChangePercent
                if (typeof raw === 'string') raw = raw.replace('%', '')
                return mk('bingx', market, d.symbol, {
                    pct: raw,
                    price: d.lastPrice,
                    volume: d.quoteVolume,
                    high: d.highPrice,
                    low: d.lowPrice,
                    open: d.openPrice,
                })
            })
            .filter(Boolean)
    },
}

export const TICKER_EXCHANGES = Object.keys(PARSERS)

// ═══════════════════════════════════════════════════════════════════════════
// СБОР СО ВСЕХ БИРЖ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Забирает тикеры со всех бирж параллельно.
 * Упавшая биржа не ломает остальные — вернётся частичный результат.
 *
 * @param {'futures'|'spot'} market
 * @returns {Promise<{ tickers: Ticker[], failed: string[], ok: string[] }>}
 */
export async function fetchAllTickers(market = 'futures') {
    const t0 = Date.now()
    aLog('warn', `[TICKERS] ═══ Старт сбора: рынок=${market}, бирж=${TICKER_EXCHANGES.length} ═══`)

    const results = await Promise.allSettled(
        TICKER_EXCHANGES.map(ex => PARSERS[ex](market))
    )

    const tickers = []
    const failed = []
    const ok = []

    results.forEach((r, i) => {
        const ex = TICKER_EXCHANGES[i]
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            tickers.push(...r.value)
            ok.push(ex)
            aLog('log', `[TICKERS] ✓ ${ex}: ${r.value.length} монет`)
        } else {
            failed.push(ex)
            aLog('error', `[TICKERS] ✗ ОШИБКА ${ex}:`, r.reason?.message ?? r.reason)
        }
    })

    aLog('warn', `[TICKERS] ═══ Готово за ${Date.now() - t0}мс | всего ${tickers.length} тикеров | ok: ${ok.join(', ') || '—'} | упало: ${failed.join(', ') || '—'} ═══`)

    return { tickers, failed, ok }
}

// ═══════════════════════════════════════════════════════════════════════════
// ФИЛЬТР МУСОРА (согласовано с Петром)
// ═══════════════════════════════════════════════════════════════════════════

// Минимальный объём за 24ч (USDT) — держим даже на пресете «ВСЕ».
const MIN_VOLUME_FLOOR = 50_000
// Потолок |% изменения| — выше почти всегда битый референс цены, а не реальный памп.
const MAX_ABS_PCT = 2000

/**
 * Мусорные инструменты, которым не место в крипто-арбитраже:
 *   - Плечевые токены (3L/3S/5L/5S) — двигаются в 3–5× базового актива,
 *     забивают топ и к арбитражу непригодны (пара уникальна для биржи).
 *   - Синтетика BingX (NCSK/NCFX/NCCO/NCSI…): токенизированные акции, форекс,
 *     товары, индексы. Не крипта; дают ложные +млрд% из-за нулевой базовой цены.
 *
 * Матчинг по БАЗОВОМУ символу (уже без /USDT): плечевые — по окончанию,
 * синтетика — по префиксу и только на BingX (чтобы не задеть настоящие монеты).
 * Если появится новое семейство мусора — правится тут.
 */
function isJunkSymbol(symbol, exchange) {
    if (!symbol) return true
    if (/(?:3|5)[LS]$/.test(symbol)) return true                 // …3L/3S/5L/5S
    if (exchange === 'bingx' && /^NC[A-Z]{2}/.test(symbol)) return true
    return false
}

// ═══════════════════════════════════════════════════════════════════════════
// АГРЕГАЦИЯ ДЛЯ ПУЗЫРЬКОВОЙ КАРТЫ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Схлопывает тикеры в «одна монета = один пузырь».
 *
 * Логика (согласована с Петром):
 *   - Группируем по монете
 *   - Лидером становится биржа с МАКСИМАЛЬНЫМ ПО МОДУЛЮ движением
 *     (то есть либо самый большой рост, либо самое большое падение)
 *   - Остальные биржи по этой монете складываем в others[] → показываются в тултипе
 *
 * @param {Ticker[]} tickers
 * @param {object} opts
 * @param {number} opts.minVolume — отсечь монеты с объёмом ниже (защита от неликвида,
 *                                  где +300% нарисованы одной сделкой)
 * @returns {AggregatedCoin[]} — [{ ...leaderTicker, others: Ticker[] }]
 */
export function aggregateByCoin(tickers, { minVolume = 0 } = {}) {
    // Порог объёма: даже на пресете «ВСЕ» (minVolume=0) держим floor от пыли —
    // рост на монете с оборотом в пару тысяч $ нарисован одной сделкой.
    const volFloor = Math.max(minVolume, MIN_VOLUME_FLOOR)

    const byCoin = new Map()

    for (const t of tickers) {
        if (!t?.symbol) continue
        if (isJunkSymbol(t.symbol, t.exchange)) continue   // синтетика BingX / плечевые
        if (Math.abs(t.pct) > MAX_ABS_PCT) continue         // аномалия — битый референс цены
        if (!byCoin.has(t.symbol)) byCoin.set(t.symbol, [])
        byCoin.get(t.symbol).push(t)
    }

    const out = []

    for (const [symbol, list] of byCoin) {
        // лидер = максимальное по модулю движение
        let leader = list[0]
        for (const t of list) {
            if (Math.abs(t.pct) > Math.abs(leader.pct)) leader = t
        }

        // фильтр неликвида — по объёму биржи-лидера
        if (leader.volume < volFloor) continue

        const others = list
            .filter(t => t !== leader)
            .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))

        out.push({ ...leader, others })
    }

    // сортировка по силе движения (для карты — самые сильные первыми)
    out.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))

    aLog('log', `[TICKERS] Агрегация: ${tickers.length} тикеров → ${out.length} монет (minVolume=${minVolume})`)

    return out
}

/**
 * Разброс ТЕКУЩИХ цен по монете между биржами, в процентах — прямой признак
 * арбитражной возможности. Например, если цена на самой дорогой бирже на 3.5%
 * выше, чем на самой дешёвой, вернёт 3.5.
 *
 *   divergence = (maxPrice − minPrice) / minPrice × 100
 *
 * Требуется минимум 2 биржи с валидной (положительной) ценой, иначе 0.
 *
 * @returns {number} разброс цен между биржами, в % (0, если сравнивать не с чем)
 */
export function coinDivergence(coin) {
    if (!coin?.others?.length) return 0
    const prices = [coin.price, ...coin.others.map(o => o.price)]
        .map(Number)
        .filter(p => Number.isFinite(p) && p > 0)
    if (prices.length < 2) return 0
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    if (min <= 0) return 0
    return ((max - min) / min) * 100
}
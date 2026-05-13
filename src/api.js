import {
    getBinanceStatus, getBingXStatus, getBitgetStatus,
    getBybitStatus, getKuCoinStatus, getMEXCStatus,
    getOKXStatus
} from './coinStatus.js'
import { parseExchange, calcVwap, calcMaxVolume } from './utils.js'
import { rlFetch } from './rateLimiter.js'

// ─── Сборщик логов для скачивания ────────────────────────────────────────────
export const logCollector = {
    entries: [],
    active: false,

    start() {
        this.entries = []
        this.active = true
        this.entries.push(`═══ AXIOMA SCAN — Лог цикла ═══`)
        this.entries.push(`Время старта: ${new Date().toLocaleString('ru-RU')}`)
        this.entries.push('')
    },

    add(level, ...args) {
        if (!this.active) return
        const text = args.map(a =>
            typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
        ).join(' ')
        // Убираем CSS-стили из %c логов
        const clean = text.replace(/%c/g, '').trim()
        if (clean) this.entries.push(`[${level.toUpperCase()}] ${clean}`)
    },

    finish() {
        this.active = false
        this.entries.push('')
        this.entries.push(`Время завершения: ${new Date().toLocaleString('ru-RU')}`)
        this.entries.push(`═══ Конец лога ═══`)
    },

    download() {
        const content = this.entries.join('\n')
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `axioma-log-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }
}

// ─── Флаг логирования (включается только для администраторов) ────────────────
let _adminLogging = false

export function setAdminLogging(isAdmin) {
    _adminLogging = !!isAdmin
}
// ─────────────────────────────────────────────────────────────────────────────

// Патчим console:
// - Логи всегда пишутся в logCollector (для скачивания .txt)
// - В браузер выводятся только если пользователь — администратор
const _origLog   = console.log.bind(console)
const _origWarn  = console.warn.bind(console)
const _origError = console.error.bind(console)
const _origGroup = console.group.bind(console)

console.log   = (...a) => { if (_adminLogging) _origLog(...a);   logCollector.add('log',   ...a) }
console.warn  = (...a) => { if (_adminLogging) _origWarn(...a);  logCollector.add('warn',  ...a) }
console.error = (...a) => { if (_adminLogging) _origError(...a); logCollector.add('error', ...a) }
console.group = (...a) => { if (_adminLogging) _origGroup(...a); logCollector.add('group', ...a) }
// ─────────────────────────────────────────────────────────────────────────────

// ─── Rate limit intervals (ms между запросами, -10% от официальных лимитов) ──
const RL = {
    binance: 560,
    bybit:   9,
    mexc:    22,
    bingx:   6,
    kucoin:  37,
    bitget:  56,
    okx:     56,
    gate:    77,
}

const cache = {}
const pendingFetches = {}  // key → Promise — дедупликация одновременных запросов

function isFresh(key, ttlMs = 55000) {
    return cache[key] && (Date.now() - cache[key].timestamp < ttlMs)
}

function setCache(key, data) {
    cache[key] = { data, timestamp: Date.now() }
    delete pendingFetches[key]  // убираем pending после завершения
}

function getCache(key) {
    return cache[key]?.data
}

// Обёртка для дедупликации: если запрос уже выполняется — ждём его
function withDedup(key, fn) {
    if (isFresh(key)) return Promise.resolve(getCache(key))
    if (pendingFetches[key]) return pendingFetches[key]
    const promise = fn().finally(() => {
        if (pendingFetches[key] === promise) delete pendingFetches[key]
    })
    pendingFetches[key] = promise
    return promise
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────
// market = 'futures' → фьючерсный endpoint + funding rate
// market = 'spot'    → спотовый endpoint, funding = null
// В обоих случаях deposit/withdraw берётся из coinStatus (реальные данные)

export function fetchBinance(symbol, market = 'futures') {
    const key = `binance_${market}_${symbol}`
    return withDedup(key, async () => {
    try {
        let result

        if (market === 'spot') {
            const [res, status] = await Promise.all([
                rlFetch('binance', RL.binance,
                    `/binance-api/api/v3/ticker/24hr?symbol=${symbol}USDT`),
                getBinanceStatus(symbol)
            ])
            if (!res.ok) return null
            const ticker = await res.json()
            if (!ticker || ticker.code) return null
            result = {
                funding:     null,
                nextFunding: null,
                volume:      parseFloat(ticker.quoteVolume) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
            }
        } else {
            const [[tickerRes, fundRes], status] = await Promise.all([
                Promise.all([
                    rlFetch('binance', RL.binance, `/binance-fapi/fapi/v1/ticker/24hr?symbol=${symbol}USDT`),
                    rlFetch('binance', RL.binance, `/binance-fapi/fapi/v1/premiumIndex?symbol=${symbol}USDT`)
                ]),
                getBinanceStatus(symbol)
            ])
            if (!tickerRes.ok || !fundRes.ok) return null
            const ticker = await tickerRes.json()
            const fund   = await fundRes.json()
            result = {
                funding:     parseFloat(fund.lastFundingRate) || 0,
                volume:      parseFloat(ticker.quoteVolume) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
                nextFunding: parseInt(fund.nextFundingTime)
            }
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('Binance fetch failed:', symbol, market, e.message)
        return null
    }
    })
}

export function fetchBingX(symbol, market = 'futures') {
    const key = `bingx_${market}_${symbol}`
    return withDedup(key, async () => {
    try {
        let result

        if (market === 'spot') {
            const [res, status] = await Promise.all([
                rlFetch('bingx', RL.bingx,
                    `/bingx-api/openApi/spot/v1/ticker/24hr?symbol=${symbol}-USDT`),
                getBingXStatus(symbol)
            ])
            if (!res.ok) return null
            const data = await res.json()
            const ticker = Array.isArray(data.data) ? data.data[0] : data.data
            if (!ticker) return null
            result = {
                funding:     null,
                nextFunding: null,
                volume:      parseFloat(ticker.quoteVolume) || parseFloat(ticker.volume) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
            }
        } else {
            const [[tickerRes, fundRes], status] = await Promise.all([
                Promise.all([
                    rlFetch('bingx', RL.bingx, `/bingx-api/openApi/swap/v2/quote/ticker?symbol=${symbol}-USDT`),
                    rlFetch('bingx', RL.bingx, `/bingx-api/openApi/swap/v2/quote/premiumIndex?symbol=${symbol}-USDT`)
                ]),
                getBingXStatus(symbol)
            ])
            if (!tickerRes.ok || !fundRes.ok) return null
            const tickerData = await tickerRes.json()
            const fundData   = await fundRes.json()
            const ticker = Array.isArray(tickerData.data) ? tickerData.data[0] : tickerData.data
            const fund   = Array.isArray(fundData.data)   ? fundData.data[0]   : fundData.data
            if (!ticker || !fund) return null
            result = {
                funding:     parseFloat(fund.lastFundingRate) || 0,
                volume:      parseFloat(ticker.quoteVolume) || parseFloat(ticker.volume) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
                nextFunding: parseInt(fund.nextFundingTime)
            }
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('BingX fetch failed:', symbol, market, e.message)
        return null
    }
    })
}

export function fetchBitget(symbol, market = 'futures') {
    const key = `bitget_${market}_${symbol}`
    return withDedup(key, async () => {
    try {
        let result

        if (market === 'spot') {
            const [res, status] = await Promise.all([
                rlFetch('bitget', RL.bitget,
                    `/bitget-api/api/v2/spot/market/tickers?symbol=${symbol}USDT`),
                getBitgetStatus(symbol)
            ])
            if (!res.ok) return null
            const data   = await res.json()
            const ticker = Array.isArray(data.data) ? data.data[0] : data.data
            if (!ticker) return null
            result = {
                funding:     null,
                nextFunding: null,
                volume:      parseFloat(ticker.usdtVolume) || parseFloat(ticker.quoteVolume) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
            }
        } else {
            const [res, status] = await Promise.all([
                rlFetch('bitget', RL.bitget,
                    `/bitget-api/api/v2/mix/market/ticker?symbol=${symbol}USDT&productType=USDT-FUTURES`),
                getBitgetStatus(symbol)
            ])
            if (!res.ok) return null
            const data   = await res.json()
            const ticker = Array.isArray(data.data) ? data.data[0] : data.data
            if (!ticker) return null
            result = {
                funding:     parseFloat(ticker.fundingRate) || 0,
                volume:      parseFloat(ticker.usdtVolume) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
                nextFunding: parseInt(ticker.nextFundingTime)
            }
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('Bitget fetch failed:', symbol, market, e.message)
        return null
    }
    })
}

export function fetchBybit(symbol, market = 'futures') {
    const key = `bybit_${market}_${symbol}`
    return withDedup(key, async () => {
    try {
        let result

        if (market === 'spot') {
            const [res, status] = await Promise.all([
                rlFetch('bybit', RL.bybit,
                    `/bybit-api/v5/market/tickers?category=spot&symbol=${symbol}USDT`),
                getBybitStatus(symbol)
            ])
            if (!res.ok) return null
            const data   = await res.json()
            const ticker = data.result?.list?.[0]
            if (!ticker) return null
            result = {
                funding:     null,
                nextFunding: null,
                volume:      parseFloat(ticker.turnover24h) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
            }
        } else {
            const [res, status] = await Promise.all([
                rlFetch('bybit', RL.bybit,
                    `/bybit-api/v5/market/tickers?category=linear&symbol=${symbol}USDT`),
                getBybitStatus(symbol)
            ])
            if (!res.ok) return null
            const data   = await res.json()
            const ticker = data.result?.list?.[0]
            if (!ticker) return null
            result = {
                funding:     parseFloat(ticker.fundingRate) || 0,
                volume:      parseFloat(ticker.turnover24h) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
                nextFunding: parseInt(ticker.nextFundingTime)
            }
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('Bybit fetch failed:', symbol, market, e.message)
        return null
    }
    })
}

export function fetchGate(symbol, market = 'futures') {
    const key = `gate_${market}_${symbol}`
    return withDedup(key, async () => {
    try {
        let result

        if (market === 'spot') {
            const [tickerRes, currencyRes] = await Promise.all([
                rlFetch('gate', RL.gate,
                    `/gate-api/api/v4/spot/tickers?currency_pair=${symbol}_USDT`),
                rlFetch('gate', RL.gate,
                    `/gate-api/api/v4/spot/currencies/${symbol}`)
            ])
            if (!tickerRes.ok) return null
            const tickers  = await tickerRes.json()
            const currency = currencyRes.ok ? await currencyRes.json() : {}
            const ticker   = tickers?.[0]
            if (!ticker) return null
            result = {
                funding:     null,
                nextFunding: null,
                volume:      parseFloat(ticker.quote_volume) || 0,
                deposit:     !currency.deposit_disabled,
                withdraw:    !currency.withdraw_disabled,
            }
        } else {
            const [tickerRes, contractRes, currencyRes] = await Promise.all([
                rlFetch('gate', RL.gate, `/gate-api/api/v4/futures/usdt/tickers?contract=${symbol}_USDT`),
                rlFetch('gate', RL.gate, `/gate-api/api/v4/futures/usdt/contracts/${symbol}_USDT`),
                rlFetch('gate', RL.gate, `/gate-api/api/v4/spot/currencies/${symbol}`)
            ])
            if (!tickerRes.ok || !contractRes.ok) return null
            const tickers  = await tickerRes.json()
            const contract = await contractRes.json()
            const currency = currencyRes.ok ? await currencyRes.json() : {}
            result = {
                funding:     parseFloat(contract.funding_rate) || 0,
                volume:      parseFloat(tickers[0]?.volume_24h_quote ?? 0) || 0,
                deposit:     !currency.deposit_disabled,
                withdraw:    !currency.withdraw_disabled,
                nextFunding: contract.funding_next_apply
                    ? contract.funding_next_apply * 1000
                    : null,
                quanto_multiplier: parseFloat(contract.quanto_multiplier) || 1,
            }
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('Gate fetch failed:', symbol, market, e.message)
        return null
    }
    })
}

export function fetchKuCoin(symbol, market = 'futures') {
    const key = `kucoin_${market}_${symbol}`
    return withDedup(key, async () => {
    try {
        let result

        if (market === 'spot') {
            const [res, status] = await Promise.all([
                rlFetch('kucoin', RL.kucoin,
                    `/kucoin-spot-api/api/v1/market/stats?symbol=${symbol}-USDT`),
                getKuCoinStatus(symbol)
            ])
            if (!res.ok) return null
            const data  = await res.json()
            const stats = data.data
            if (!stats) return null
            result = {
                funding:     null,
                nextFunding: null,
                volume:      parseFloat(stats.volValue) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
            }
        } else {
            const [res, status] = await Promise.all([
                rlFetch('kucoin', RL.kucoin,
                    `/kucoin-api/api/v1/contracts/${symbol}USDTM`),
                getKuCoinStatus(symbol)
            ])
            if (!res.ok) return null
            const data     = await res.json()
            const contract = data.data
            if (!contract) return null
            result = {
                funding:     parseFloat(contract.fundingFeeRate) || 0,
                volume:      parseFloat(contract.turnoverOf24h) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
                nextFunding: contract.nextFundingRateTime
                    ? Date.now() + contract.nextFundingRateTime
                    : null,
            }
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('KuCoin fetch failed:', symbol, market, e.message)
        return null
    }
    })
}

export function fetchMEXC(symbol, market = 'futures') {
    const key = `mexc_${market}_${symbol}`
    return withDedup(key, async () => {
    try {
        let result

        if (market === 'spot') {
            const [res, status] = await Promise.all([
                rlFetch('mexc', RL.mexc,
                    `/mexc-spot-api/api/v3/ticker/24hr?symbol=${symbol}USDT`),
                getMEXCStatus(symbol)
            ])
            if (!res.ok) return null
            const ticker = await res.json()
            if (!ticker || ticker.code) return null
            result = {
                funding:     null,
                nextFunding: null,
                volume:      parseFloat(ticker.quoteVolume) || parseFloat(ticker.volume) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
            }
        } else {
            const [[tickerRes, fundingRes], status] = await Promise.all([
                Promise.all([
                    rlFetch('mexc', RL.mexc, `/mexc-api/api/v1/contract/ticker?symbol=${symbol}_USDT`),
                    rlFetch('mexc', RL.mexc, `/mexc-api/api/v1/contract/funding_rate/${symbol}_USDT`)
                ]),
                getMEXCStatus(symbol)
            ])
            if (!tickerRes.ok) return null
            const tickerData  = await tickerRes.json()
            const fundingData = fundingRes.ok ? await fundingRes.json() : {}
            const ticker      = tickerData.data
            if (!ticker) return null
            result = {
                funding:     parseFloat(ticker.fundingRate) || 0,
                volume:      parseFloat(ticker.amount24) || parseFloat(ticker.volume24) || 0,
                deposit:     status.deposit,
                withdraw:    status.withdraw,
                nextFunding: fundingData?.data?.nextSettleTime ?? null
            }
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('MEXC fetch failed:', symbol, market, e.message)
        return null
    }
    })
}

export function fetchOKX(symbol, market = 'futures') {
    const key = `okx_${market}_${symbol}`
    return withDedup(key, async () => {
    try {
        let result

        if (market === 'spot') {
            const [res, status] = await Promise.all([
                rlFetch('okx', RL.okx,
                    `/okx-api/api/v5/market/ticker?instId=${symbol}-USDT`),
                getOKXStatus(symbol)
            ])
            if (!res.ok) return null
            const ticker = await res.json()
            const t      = ticker.data?.[0]
            if (!t) return null
            result = {
                funding:     null,
                nextFunding: null,
                volume:      (parseFloat(t.volCcy24h) || 0) * (parseFloat(t.last) || 0),
                deposit:     status.deposit,
                withdraw:    status.withdraw,
            }
        } else {
            const instId = `${symbol}-USDT-SWAP`
            const [[fundRes, tickerRes], status] = await Promise.all([
                Promise.all([
                    rlFetch('okx', RL.okx, `/okx-api/api/v5/public/funding-rate?instId=${instId}`),
                    rlFetch('okx', RL.okx, `/okx-api/api/v5/market/ticker?instId=${instId}`)
                ]),
                getOKXStatus(symbol)
            ])
            if (!fundRes.ok || !tickerRes.ok) return null
            const fund   = await fundRes.json()
            const ticker = await tickerRes.json()
            const f = fund.data?.[0]
            const t = ticker.data?.[0]
            if (!f || !t) return null
            result = {
                funding:     parseFloat(f.fundingRate) || 0,
                volume:      (parseFloat(t.volCcy24h) || 0) * (parseFloat(t.last) || 0),
                deposit:     status.deposit,
                withdraw:    status.withdraw,
                nextFunding: parseInt(f.fundingTime)
            }
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('OKX fetch failed:', symbol, market, e.message)
        return null
    }
    })
}

// ─── FETCHERS map ─────────────────────────────────────────────────────────────

const FETCHERS = {
    binance: fetchBinance,
    bingx:   fetchBingX,
    bitget:  fetchBitget,
    bybit:   fetchBybit,
    gate:    fetchGate,
    kucoin:  fetchKuCoin,
    mexc:    fetchMEXC,
    okx:     fetchOKX,
}

// ─── enrichOpportunities ──────────────────────────────────────────────────────

// Конвертирует Gate futures orderbook из контрактного формата в монеты
function convertGateBook(book, quantoMultiplier) {
    // Gate futures order book формат:
    //   p — цена уже в USDT за 1 монету (не требует конвертации)
    //   s — количество контрактов (нужно умножить на quanto_multiplier → монеты)
    // Источник: Gate API docs — "size is specified in contracts, not coins"
    if (!book || !book.length) return []
    if (Array.isArray(book[0])) {
        return book.map(([p, s]) => [
            p,                                                    // цена: не трогаем
            String(parseFloat(s) * quantoMultiplier)              // qty: контракты → монеты
        ])
    }
    return book.map(({ p, s }) => [
        String(p),
        String(parseFloat(s) * quantoMultiplier)
    ])
}

// ─── Кэш Gate quanto_multiplier ──────────────────────────────────────────────
let gateMultipliersCache = {}
let gateMultipliersCacheTs = 0
const GATE_MULT_TTL = 60000  // 60 секунд (один цикл)

async function prefetchGateMultipliers() {
    if (Date.now() - gateMultipliersCacheTs < GATE_MULT_TTL && Object.keys(gateMultipliersCache).length > 0) {
        console.log(`[Gate prefetch] Кэш актуален (${Object.keys(gateMultipliersCache).length} контрактов)`)
        return gateMultipliersCache
    }
    const t = performance.now()
    console.log('[Gate prefetch] Загружаем quanto_multiplier из Gate tickers...')
    try {
        const res = await fetch('/gate-api/api/v4/futures/usdt/tickers')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const tickers = await res.json()

        // Кэшируем: "VANRY_USDT" → "VANRYUSDT" → quanto_multiplier
        // Если multiplier=0 (линейный контракт) → используем 1
        const map = {}
        for (const tk of tickers) {
            if (!tk.contract) continue
            const sym = tk.contract.replace(/_USDT$/, '') + 'USDT'
            const mult = parseFloat(tk.quanto_multiplier)
            map[sym] = (mult > 0) ? mult : 1
        }

        gateMultipliersCache = map
        gateMultipliersCacheTs = Date.now()

        const nonOne = Object.values(map).filter(v => v !== 1).length
        console.log(`[Gate prefetch] ✅ ${Object.keys(map).length} контрактов | multiplier≠1: ${nonOne} | ⏱ ${(performance.now() - t).toFixed(0)}мс`)
        return map
    } catch (e) {
        console.warn(`[Gate prefetch] ❌ Ошибка: ${e.message} — используем старый кэш`)
        return gateMultipliersCache
    }
}
// ─────────────────────────────────────────────────────────────────────────────

export async function enrichOpportunities(rawRecords, tradeAmount = 1000) {
    const BATCH_SIZE = 10
    const results = []

    // Запускаем сборщик логов
    logCollector.start()

    // ════════════════════════════════════════════════════
    // Предзагрузка Gate multipliers (до фильтрации)
    const gateMultipliers = await prefetchGateMultipliers()
    // ════════════════════════════════════════════════════

    // ════════════════════════════════════════════════════
    // ШАГ 4 — Фильтрация (VWAP + спред + группировка)
    const t4 = performance.now()
    console.group('%c[ШАГ 4] Фильтрация арбитражных возможностей', 'color:#f0a500;font-weight:bold')
    console.log(`[ШАГ 4] Входящих записей: ${rawRecords.length} | tradeAmount=$${tradeAmount}`)

    // Шаг 4.1 — считаем VWAP и спред для каждой записи (без запросов к биржам)
    console.log('[ШАГ 4.1] Считаем средние цены (VWAP) и спреды...')
    const t41 = performance.now()

    const vwapResults = rawRecords.map(rec => {
        try {
            const bidEx = parseExchange(rec.bid_ex)
            const askEx = parseExchange(rec.ask_ex)

            // Применяем Gate futures конвертацию если нужно
            let bidBook = rec.bid
            let askBook = rec.ask

            if (bidEx.id === 'gate' && bidEx.market === 'futures') {
                const mult = gateMultipliers[rec.symbol] || 1
                if (mult !== 1) bidBook = convertGateBook(rec.bid, mult)
            }
            if (askEx.id === 'gate' && askEx.market === 'futures') {
                const mult = gateMultipliers[rec.symbol] || 1
                if (mult !== 1) askBook = convertGateBook(rec.ask, mult)
            }

            const sortedBid = [...bidBook].sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
            const sortedAsk = [...askBook].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
            const bid_price = calcVwap(sortedBid, tradeAmount)
            const ask_price = calcVwap(sortedAsk, tradeAmount)
            if (!bid_price || !ask_price) return null
            const spread = (ask_price - bid_price) / bid_price * 100
            return { rec, sortedBid, sortedAsk, bid_price, ask_price, spread }
        } catch { return null }
    }).filter(Boolean)

    console.log(`[ШАГ 4.1] ✅ VWAP посчитан для ${vwapResults.length}/${rawRecords.length} записей | ⏱ ${(performance.now() - t41).toFixed(0)}мс`)

    // Шаг 4.2 — фильтруем по спреду (только положительный <= 50%)
    console.log('[ШАГ 4.2] Фильтруем по спреду (>0% и <=50%)...')
    const t42 = performance.now()

    const spreadFiltered = vwapResults.filter(({ rec, spread }) => {
        if (spread <= 0 || spread > 50) {
            console.warn(`[ШАГ 4.2] ❌ spread=${spread.toFixed(4)}% | ${rec.symbol} | ${rec.bid_ex}→${rec.ask_ex}`)
            return false
        }
        return true
    })

    console.log(`[ШАГ 4.2] ✅ После фильтра спреда: ${spreadFiltered.length}/${vwapResults.length} | ⏱ ${(performance.now() - t42).toFixed(0)}мс`)

    // Шаг 4.3 — группируем по символу
    console.log('[ШАГ 4.3] Группируем по символу монеты...')
    const t43 = performance.now()

    const grouped = {}
    for (const item of spreadFiltered) {
        const sym = item.rec.symbol
        if (!grouped[sym]) grouped[sym] = []
        grouped[sym].push(item)
    }
    console.log(`[ШАГ 4.3] ✅ Уникальных символов: ${Object.keys(grouped).length} | ⏱ ${(performance.now() - t43).toFixed(0)}мс`)

    // Шаг 4.4 — выбираем лучший спред из каждой группы
    console.log('[ШАГ 4.4] Выбираем лучший спред из каждой группы...')
    const t44 = performance.now()

    const bestPerSymbol = Object.entries(grouped).map(([sym, items]) => {
        items.sort((a, b) => b.spread - a.spread)
        return { best: items[0], variants: items.slice(1) }
    })

    console.log(`[ШАГ 4.4] ✅ Лучших монет: ${bestPerSymbol.length}`)
    bestPerSymbol.forEach(({ best, variants }) => {
        console.log(`[ШАГ 4.4]   ${best.rec.symbol}: spread=${best.spread.toFixed(4)}% | ${best.rec.bid_ex}→${best.rec.ask_ex}${variants.length ? ` + ${variants.length} вариантов` : ''}`)
    })
    console.log(`[ШАГ 4.4] ⏱ ${(performance.now() - t44).toFixed(0)}мс`)

    console.log(`%c[ШАГ 4] ✅ Итог фильтрации: ${bestPerSymbol.length} монет | ⏱ ${(performance.now() - t4).toFixed(0)}мс`, 'color:#f0a500;font-weight:bold')
    console.groupEnd()
    // ════════════════════════════════════════════════════

    // ════════════════════════════════════════════════════
    // ШАГ 5 — Запросы к биржам (только для лучших монет)
    const t5 = performance.now()
    const totalToFetch = bestPerSymbol.length + bestPerSymbol.reduce((acc, { variants }) => acc + variants.length, 0)
    console.group(`%c[ШАГ 5] Запросы к биржам (funding, volume, transfer)`, 'color:#3d87c0;font-weight:bold')
    console.log(`[ШАГ 5] Запросов будет: ${totalToFetch} (${bestPerSymbol.length} лучших + варианты)`)
    // ════════════════════════════════════════════════════

    // Собираем все записи для обогащения (лучшие + варианты)
    const allToEnrich = []
    bestPerSymbol.forEach(({ best, variants }) => {
        allToEnrich.push({ ...best, isBest: true })
        variants.forEach(v => allToEnrich.push({ ...v, isBest: false }))
    })

    // Обогащаем батчами
    const enrichedResults = []
    for (let i = 0; i < allToEnrich.length; i += BATCH_SIZE) {
        const batch = allToEnrich.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.all(
            batch.map(async ({ rec, sortedBid, sortedAsk, bid_price, ask_price, spread, isBest }, batchIdx) => {
                const index = i + batchIdx
                try {
                    const bidEx = parseExchange(rec.bid_ex)
                    const askEx = parseExchange(rec.ask_ex)
                    const sym = rec.symbol.replace(/USDT$/, '')

                    // Логируем каждый запрос отдельно
                    const bidCached = isFresh(`${bidEx.id}_${bidEx.market}_${sym}`)
                    const askCached = isFresh(`${askEx.id}_${askEx.market}_${sym}`)
                    console.log(
                        `[ШАГ 5] 📡 ${rec.symbol} | ` +
                        `BID: ${rec.bid_ex} ${bidCached ? '(кэш)' : '(запрос)'} | ` +
                        `ASK: ${rec.ask_ex} ${askCached ? '(кэш)' : '(запрос)'}`
                    )

                    const fetchStart = performance.now()
                    const [bidData, askData] = await Promise.all([
                        FETCHERS[bidEx.id] ? (async () => {
                            const t = performance.now()
                            const data = await FETCHERS[bidEx.id](sym, bidEx.market)
                            const dt = (performance.now() - t).toFixed(0)
                            console.log(
                                `[ШАГ 5]   ↳ ${rec.bid_ex} | ` +
                                `funding=${data?.funding != null ? (data.funding * 100).toFixed(4) + '%' : 'null'} | ` +
                                `vol=${data?.volume != null ? '$' + Math.round(data.volume).toLocaleString() : 'null'} | ` +
                                `dep=${data?.deposit} wd=${data?.withdraw} | ` +
                                `⏱ ${dt}мс${bidCached ? ' [кэш]' : ''}`
                            )
                            return data
                        })() : Promise.resolve(null),
                        FETCHERS[askEx.id] ? (async () => {
                            const t = performance.now()
                            const data = await FETCHERS[askEx.id](sym, askEx.market)
                            const dt = (performance.now() - t).toFixed(0)
                            console.log(
                                `[ШАГ 5]   ↳ ${rec.ask_ex} | ` +
                                `funding=${data?.funding != null ? (data.funding * 100).toFixed(4) + '%' : 'null'} | ` +
                                `vol=${data?.volume != null ? '$' + Math.round(data.volume).toLocaleString() : 'null'} | ` +
                                `dep=${data?.deposit} wd=${data?.withdraw} | ` +
                                `⏱ ${dt}мс${askCached ? ' [кэш]' : ''}`
                            )
                            return data
                        })() : Promise.resolve(null),
                    ])
                    const fetchTime = (performance.now() - fetchStart).toFixed(0)

                    // Gate futures — используем кэш multiplier из Шага 3 (тот же источник что и в Шаге 4)
                    // Конвертация уже была применена в Шаге 4 → sortedBid/sortedAsk уже нормализованы
                    // Здесь просто используем готовые данные без повторной конвертации
                    const finalBid = sortedBid
                    const finalAsk = sortedAsk
                    const finalBidPrice = bid_price
                    const finalAskPrice = ask_price
                    const finalSpread = spread

                    if (!finalBidPrice || !finalAskPrice || finalSpread <= 0 || finalSpread > 50) return null

                    const bidMaxRes = calcMaxVolume(finalBid, finalAskPrice, 'long')
                    const askMaxRes = calcMaxVolume(finalAsk, finalBidPrice, 'short')

                    console.log(
                        `%c[ШАГ 5] ✅ ${rec.symbol} | ${rec.bid_ex}→${rec.ask_ex} | spread=${finalSpread.toFixed(4)}% | ⏱ ${fetchTime}мс`,
                        'color:#00c97a'
                    )

                    return {
                        id: index + 1,
                        symbol: rec.symbol,
                        strategy: rec.strategy,
                        bid_ex: bidEx.id,
                        ask_ex: askEx.id,
                        bid_market: bidEx.market,
                        ask_market: askEx.market,
                        spread: finalSpread,
                        bid_price: finalBidPrice,
                        ask_price: finalAskPrice,
                        raw_bid: finalBid,
                        raw_ask: finalAsk,
                        first_seen: rec.time,
                        bid_max_size: bidMaxRes?.usd ?? null,
                        ask_max_size: askMaxRes?.usd ?? null,
                        bid_funding: {
                            rate: bidData?.funding != null ? bidData.funding * 100 : null,
                            next_time: bidData?.nextFunding ? Math.floor(bidData.nextFunding / 1000) : null
                        },
                        ask_funding: {
                            rate: askData?.funding != null ? askData.funding * 100 : null,
                            next_time: askData?.nextFunding ? Math.floor(askData.nextFunding / 1000) : null
                        },
                        bid_volume: bidData?.volume ?? null,
                        ask_volume: askData?.volume ?? null,
                        bid_transfer: { deposit: bidData?.deposit ?? null, withdraw: bidData?.withdraw ?? null },
                        ask_transfer: { deposit: askData?.deposit ?? null, withdraw: askData?.withdraw ?? null },
                    }
                } catch (e) {
                    console.warn(`[ШАГ 5] ❌ Ошибка ${rec.symbol}:`, e.message)
                    return null
                }
            })
        )
        enrichedResults.push(...batchResults)
    }

    const enrichedFiltered = enrichedResults.filter(Boolean)

    console.log(`%c[ШАГ 5] ✅ Обогащено: ${enrichedFiltered.length}/${totalToFetch} записей | ⏱ ${((performance.now() - t5)/1000).toFixed(2)}с`, 'color:#3d87c0;font-weight:bold')
    console.groupEnd()
    // ════════════════════════════════════════════════════

    // Финальная группировка для variants
    const finalGrouped = {}
    for (const opp of enrichedFiltered) {
        if (!finalGrouped[opp.symbol]) finalGrouped[opp.symbol] = []
        finalGrouped[opp.symbol].push(opp)
    }

    const final = Object.values(finalGrouped).map((group, idx) => {
        group.sort((a, b) => b.spread - a.spread)
        const best = { ...group[0], id: idx + 1 }
        best.variants = group.slice(1).map((v, i) => ({ ...v, id: idx * 1000 + i + 1 }))
        return best
    })

    // Завершаем сборщик логов
    logCollector.finish()

    return final
}

// ─── enrichSingleOpportunity — для DetailModal (10s polling) ─────────────────

export async function enrichSingleOpportunity(opp) {
    const sym = opp.symbol.replace(/USDT$/, '')
    const [bidData, askData] = await Promise.all([
        FETCHERS[opp.bid_ex]
            ? FETCHERS[opp.bid_ex](sym, opp.bid_market ?? 'futures')
            : null,
        FETCHERS[opp.ask_ex]
            ? FETCHERS[opp.ask_ex](sym, opp.ask_market ?? 'futures')
            : null,
    ])
    return {
        ...opp,
        bid_funding: bidData ? {
            ...opp.bid_funding,
            rate: bidData.funding != null
                ? bidData.funding * 100
                : opp.bid_funding?.rate,
            next_time: bidData.nextFunding
                ? Math.floor(bidData.nextFunding / 1000)
                : opp.bid_funding?.next_time
        } : opp.bid_funding,
        ask_funding: askData ? {
            ...opp.ask_funding,
            rate: askData.funding != null
                ? askData.funding * 100
                : opp.ask_funding?.rate,
            next_time: askData.nextFunding
                ? Math.floor(askData.nextFunding / 1000)
                : opp.ask_funding?.next_time
        } : opp.ask_funding,
        bid_volume:   bidData?.volume   ?? opp.bid_volume,
        ask_volume:   askData?.volume   ?? opp.ask_volume,
        bid_transfer: bidData
            ? { deposit: bidData.deposit, withdraw: bidData.withdraw }
            : opp.bid_transfer,
        ask_transfer: askData
            ? { deposit: askData.deposit, withdraw: askData.withdraw }
            : opp.ask_transfer,
    }
}

// ─── clearCacheForOpp ─────────────────────────────────────────────────────────

export function clearCacheForOpp(opp) {
    const sym = opp.symbol.replace(/USDT$/, '')
    delete cache[`${opp.bid_ex}_${opp.bid_market ?? 'futures'}_${sym}`]
    delete cache[`${opp.ask_ex}_${opp.ask_market ?? 'futures'}_${sym}`]
}
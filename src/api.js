import {
    getBinanceStatus, getBingXStatus, getBitgetStatus,
    getBybitStatus, getKuCoinStatus, getMEXCStatus,
    getOKXStatus
} from './coinStatus.js'
import { parseExchange, calcVwap, calcMaxVolume } from './utils.js'
import { rlFetch } from './rateLimiter.js'

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

function isFresh(key, ttlMs = 55000) {
    return cache[key] && (Date.now() - cache[key].timestamp < ttlMs)
}

function setCache(key, data) {
    cache[key] = { data, timestamp: Date.now() }
}

function getCache(key) {
    return cache[key]?.data
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────
// market = 'futures' → фьючерсный endpoint + funding rate
// market = 'spot'    → спотовый endpoint, funding = null
// В обоих случаях deposit/withdraw берётся из coinStatus (реальные данные)

export async function fetchBinance(symbol, market = 'futures') {
    const key = `binance_${market}_${symbol}`
    if (isFresh(key)) return getCache(key)

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
}

export async function fetchBingX(symbol, market = 'futures') {
    const key = `bingx_${market}_${symbol}`
    if (isFresh(key)) return getCache(key)

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
            // BingX spot: data.data может быть объектом или массивом
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
            // BingX futures: data может быть массивом или объектом
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
}

export async function fetchBitget(symbol, market = 'futures') {
    const key = `bitget_${market}_${symbol}`
    if (isFresh(key)) return getCache(key)

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
}

export async function fetchBybit(symbol, market = 'futures') {
    const key = `bybit_${market}_${symbol}`
    if (isFresh(key)) return getCache(key)

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
}

export async function fetchGate(symbol, market = 'futures') {
    const key = `gate_${market}_${symbol}`
    if (isFresh(key)) return getCache(key)

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
            }
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('Gate fetch failed:', symbol, market, e.message)
        return null
    }
}

export async function fetchKuCoin(symbol, market = 'futures') {
    const key = `kucoin_${market}_${symbol}`
    if (isFresh(key)) return getCache(key)

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
}

export async function fetchMEXC(symbol, market = 'futures') {
    const key = `mexc_${market}_${symbol}`
    if (isFresh(key)) return getCache(key)

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
                // MEXC: amount24 — объём в USDT за 24ч
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
}

export async function fetchOKX(symbol, market = 'futures') {
    const key = `okx_${market}_${symbol}`
    if (isFresh(key)) return getCache(key)

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
                // OKX spot: volCcy24h в базовой валюте, умножаем на last для USDT
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

export async function enrichOpportunities(rawRecords, tradeAmount = 1000) {
    const BATCH_SIZE = 10
    const results = []

    for (let i = 0; i < rawRecords.length; i += BATCH_SIZE) {
        const batch = rawRecords.slice(i, i + BATCH_SIZE)

        const batchResults = await Promise.all(
            batch.map(async (rec, batchIndex) => {
                const index = i + batchIndex
                try {
                    const bidEx = parseExchange(rec.bid_ex)
                    const askEx = parseExchange(rec.ask_ex)

                    // Пропускаем Gate futures — контрактный формат
                    if (bidEx.id === 'gate' && bidEx.market === 'futures') return null
                    if (askEx.id === 'gate' && askEx.market === 'futures') return null

                    const sym = rec.symbol.replace(/USDT$/, '')

                    // VWAP цены по книге ордеров
                    const bid_price = calcVwap(rec.bid, tradeAmount)
                    const ask_price = calcVwap(rec.ask, tradeAmount)

                    if (!bid_price || !ask_price) return null

                    const spread = (ask_price - bid_price) / bid_price * 100
                    if (spread <= 0 || spread > 50) return null

                    // Max size: сколько $ можно исполнить до уровня цены другой стороны
                    // bid сторона (LONG): идём по asks, останавливаемся на ask_price
                    // ask сторона (SHORT): идём по bids, останавливаемся на bid_price
                    const bidMaxRes = calcMaxVolume(rec.bid, ask_price, 'long')
                    const askMaxRes = calcMaxVolume(rec.ask, bid_price, 'short')

                    // Запрашиваем данные с правильным market
                    const [bidData, askData] = await Promise.all([
                        FETCHERS[bidEx.id] ? FETCHERS[bidEx.id](sym, bidEx.market) : null,
                        FETCHERS[askEx.id] ? FETCHERS[askEx.id](sym, askEx.market) : null,
                    ])

                    return {
                        id:          index + 1,
                        symbol:      rec.symbol,
                        strategy:    rec.strategy,
                        bid_ex:      bidEx.id,
                        ask_ex:      askEx.id,
                        bid_market:  bidEx.market,
                        ask_market:  askEx.market,
                        spread,
                        bid_price,
                        ask_price,
                        raw_bid:     rec.bid,
                        raw_ask:     rec.ask,
                        first_seen:  rec.time,
                        // Max size отдельно для каждой стороны
                        bid_max_size: bidMaxRes?.usd ?? null,
                        ask_max_size: askMaxRes?.usd ?? null,
                        bid_funding: {
                            rate: bidData?.funding != null
                                ? bidData.funding * 100
                                : null,
                            next_time: bidData?.nextFunding
                                ? Math.floor(bidData.nextFunding / 1000)
                                : null
                        },
                        ask_funding: {
                            rate: askData?.funding != null
                                ? askData.funding * 100
                                : null,
                            next_time: askData?.nextFunding
                                ? Math.floor(askData.nextFunding / 1000)
                                : null
                        },
                        bid_volume:   bidData?.volume   ?? null,
                        ask_volume:   askData?.volume   ?? null,
                        bid_transfer: {
                            deposit:  bidData?.deposit  ?? null,
                            withdraw: bidData?.withdraw ?? null
                        },
                        ask_transfer: {
                            deposit:  askData?.deposit  ?? null,
                            withdraw: askData?.withdraw ?? null
                        },
                    }
                } catch (e) {
                    console.warn('enrichOpportunities failed for', rec.symbol, e.message)
                    return null
                }
            })
        )

        results.push(...batchResults)
    }

    const filtered = results.filter(Boolean)

    // Группируем по символу — лучшая возможность + variants[]
    const grouped = {}
    for (const opp of filtered) {
        if (!grouped[opp.symbol]) grouped[opp.symbol] = []
        grouped[opp.symbol].push(opp)
    }

    return Object.values(grouped)
        .map((group, idx) => {
            group.sort((a, b) => b.spread - a.spread)
            const best = { ...group[0], id: idx + 1 }
            best.variants = group.slice(1).map((v, i) => ({
                ...v,
                id: idx * 1000 + i + 1
            }))
            return best
        })
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
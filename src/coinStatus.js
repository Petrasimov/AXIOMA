/**
 * coinStatus.js — Статусы депозита/вывода монет по биржам
 *
 * Каждая функция getXxxStatus(symbol) возвращает { deposit: bool, withdraw: bool }.
 * При ошибке возвращает { deposit: true, withdraw: true } — оптимистичный дефолт,
 * чтобы не скрывать карточки из-за временной недоступности API.
 *
 * Кэш: TTL 5 минут. OKX, MEXC, Bitget — батч-запросы (все монеты за раз).
 */

import { hmacHex, hmacBase64 } from './sign.js'
import { rlFetch } from './rateLimiter.js'
import { aLog } from './api.js'

const STATUS_TTL = 5 * 60 * 1000  // 5 минут в мс
const cache = {}                    // key → { data, ts }

/** Проверяет актуальность записи в кэше. */
function isFresh(key) {
    return cache[key] && (Date.now() - cache[key].ts < STATUS_TTL)
}

/** Оптимистичный ответ при ошибке — не скрываем монету из-за недоступности API. */
const FALLBACK = { deposit: true, withdraw: true }

// ─── Binance ────────────────────────────────────────────────────────────────

export async function getBinanceStatus(symbol) {
    const key = `binance_${symbol}`
    // Лог входа — биржа и символ
    aLog('log', `[STATUS] getBinanceStatus(${symbol})`)
    if (isFresh(key)) {
        // Лог попадания в кэш — возраст записи
        const ageMs = Date.now() - cache[key].ts
        aLog('log', `[STATUS] Binance ${symbol} → кэш HIT (возраст: ${(ageMs / 1000).toFixed(0)}с)`)
        return cache[key].data
    }
    // Лог промаха кэша
    aLog('log', `[STATUS] Binance ${symbol} → кэш MISS, делаем запрос`)

    try {
        const apiKey = import.meta.env.VITE_BINANCE_API_KEY
        const secret = import.meta.env.VITE_BINANCE_API_SECRET
        const ts     = Date.now()
        const query  = `timestamp=${ts}&recvWindow=60000`
        const sig    = await hmacHex(secret, query)
        const t0     = performance.now()

        const res = await rlFetch(
            'binance', 200,
            `/binance-api/sapi/v1/capital/config/getall?${query}&signature=${sig}`,
            { headers: { 'X-MBX-APIKEY': apiKey } }
        )
        if (!res.ok) {
            console.warn('Binance status error:', res.status, (await res.text()).slice(0, 200))
            return FALLBACK
        }
        const data = await res.json()
        if (!Array.isArray(data)) return FALLBACK

        const coin   = data.find(c => c.coin === symbol.toUpperCase())
        const result = {
            deposit:  coin?.networkList?.some(n => n.depositEnable)  ?? false,
            withdraw: coin?.networkList?.some(n => n.withdrawEnable) ?? false,
        }
        cache[key] = { data: result, ts: Date.now() }
        // Лог успешного результата — deposit/withdraw и время запроса
        aLog('success', `[STATUS] Binance ${symbol} ✅ deposit=${result.deposit} withdraw=${result.withdraw} | ⏱ ${(performance.now() - t0).toFixed(0)}мс`)
        return result
    } catch (e) {
        // Лог ошибки с текстом исключения
        aLog('error', `[STATUS] Binance ${symbol} ❌ ${e.message}`)
        console.warn('Binance status failed:', symbol, e.message)
        return FALLBACK
    }
}

// ─── Bybit ──────────────────────────────────────────────────────────────────

export async function getBybitStatus(symbol) {
    const key = `bybit_${symbol}`
    // Лог входа — биржа и символ
    aLog('log', `[STATUS] getBybitStatus(${symbol})`)
    if (isFresh(key)) {
        // Лог попадания в кэш — возраст записи
        const ageMs = Date.now() - cache[key].ts
        aLog('log', `[STATUS] Bybit ${symbol} → кэш HIT (возраст: ${(ageMs / 1000).toFixed(0)}с)`)
        return cache[key].data
    }
    // Лог промаха кэша
    aLog('log', `[STATUS] Bybit ${symbol} → кэш MISS, делаем запрос`)

    try {
        const apiKey     = import.meta.env.VITE_BYBIT_API_KEY
        const secret     = import.meta.env.VITE_BYBIT_API_SECRET
        const ts         = Date.now().toString()
        const recvWindow = '5000'
        const query      = `coin=${symbol.toUpperCase()}`
        const sig        = await hmacHex(secret, ts + apiKey + recvWindow + query)
        const t0         = performance.now()

        const res = await rlFetch(
            'bybit', 150,
            `https://api.bybit.com/v5/asset/coin/query-info?${query}`,
            { headers: {
                'X-BAPI-API-KEY':      apiKey,
                'X-BAPI-SIGN':         sig,
                'X-BAPI-TIMESTAMP':    ts,
                'X-BAPI-RECV-WINDOW':  recvWindow,
            }}
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data   = await res.json()
        const chains = data.result?.rows?.[0]?.chains ?? []
        const result = {
            deposit:  chains.some(c => c.chainDeposit  === '1'),
            withdraw: chains.some(c => c.chainWithdraw === '1'),
        }
        cache[key] = { data: result, ts: Date.now() }
        // Лог успешного результата — deposit/withdraw и время
        aLog('success', `[STATUS] Bybit ${symbol} ✅ deposit=${result.deposit} withdraw=${result.withdraw} | ⏱ ${(performance.now() - t0).toFixed(0)}мс`)
        return result
    } catch (e) {
        // Лог ошибки с текстом исключения
        aLog('error', `[STATUS] Bybit ${symbol} ❌ ${e.message}`)
        console.warn('Bybit status failed:', symbol, e.message)
        return FALLBACK
    }
}

// ─── OKX (батч: все монеты за один запрос) ──────────────────────────────────

const OKX_BATCH_KEY = 'okx_ALL'

async function fetchAllOKXStatus() {
    if (isFresh(OKX_BATCH_KEY)) {
        // Лог попадания в кэш батча OKX
        const ageMs = Date.now() - cache[OKX_BATCH_KEY].ts
        const count = Object.keys(cache[OKX_BATCH_KEY].data).length
        aLog('log', `[STATUS] OKX батч → кэш HIT (${count} монет, возраст: ${(ageMs / 1000).toFixed(0)}с)`)
        return cache[OKX_BATCH_KEY].data
    }
    // Лог промаха кэша батча
    aLog('log', `[STATUS] OKX батч → кэш MISS, загружаем все монеты`)

    try {
        const apiKey     = import.meta.env.VITE_OKX_API_KEY
        const secret     = import.meta.env.VITE_OKX_API_SECRET
        const passphrase = import.meta.env.VITE_OKX_PASSPHRASE
        const ts         = new Date().toISOString()
        const path       = '/api/v5/asset/currencies'
        const sig        = await hmacBase64(secret, ts + 'GET' + path)
        const t0         = performance.now()

        const res = await rlFetch(
            'okx', 300,
            `https://www.okx.com${path}`,
            { headers: {
                'OK-ACCESS-KEY':        apiKey,
                'OK-ACCESS-SIGN':       sig,
                'OK-ACCESS-TIMESTAMP':  ts,
                'OK-ACCESS-PASSPHRASE': passphrase,
            }}
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        const map  = {}
        for (const chain of (data.data ?? [])) {
            const sym = chain.ccy
            if (!map[sym]) map[sym] = { deposit: false, withdraw: false }
            if (chain.canDep) map[sym].deposit  = true
            if (chain.canWd)  map[sym].withdraw = true
        }
        cache[OKX_BATCH_KEY] = { data: map, ts: Date.now() }
        // Лог успешного батч-запроса — кол-во монет и время
        aLog('success', `[STATUS] OKX батч ✅ ${Object.keys(map).length} монет | ⏱ ${(performance.now() - t0).toFixed(0)}мс`)
        return map
    } catch (e) {
        // Лог ошибки батч-запроса
        aLog('error', `[STATUS] OKX батч ❌ ${e.message}`)
        console.warn('OKX all status failed:', e.message)
        return {}
    }
}

export async function getOKXStatus(symbol) {
    // Лог входа — биржа и символ
    aLog('log', `[STATUS] getOKXStatus(${symbol})`)
    const map = await fetchAllOKXStatus()
    const result = map[symbol.toUpperCase()] ?? FALLBACK
    // Лог итогового результата для конкретного символа
    aLog('log', `[STATUS] OKX ${symbol} → deposit=${result.deposit} withdraw=${result.withdraw}`)
    return result
}

// ─── MEXC (батч: все монеты за один запрос) ─────────────────────────────────

const MEXC_BATCH_KEY = 'mexc_ALL'

// Promise-dedup: если батч уже выполняется — все параллельные вызовы ждут одного результата
let _mexcBatchPromise = null

async function fetchAllMEXCStatus() {
    if (isFresh(MEXC_BATCH_KEY)) {
        // Лог попадания в кэш батча MEXC
        const ageMs = Date.now() - cache[MEXC_BATCH_KEY].ts
        const count = Object.keys(cache[MEXC_BATCH_KEY].data).length
        aLog('log', `[STATUS] MEXC батч → кэш HIT (${count} монет, возраст: ${(ageMs / 1000).toFixed(0)}с)`)
        return cache[MEXC_BATCH_KEY].data
    }

    // Dedup: если запрос уже в процессе — возвращаем тот же Promise
    if (_mexcBatchPromise) {
        aLog('log', `[STATUS] MEXC батч → параллельный вызов, ждём текущий запрос`)
        return _mexcBatchPromise
    }

    // Лог промаха кэша батча
    aLog('log', `[STATUS] MEXC батч → кэш MISS, загружаем все монеты`)

    _mexcBatchPromise = (async () => {
        try {
            const apiKey = import.meta.env.VITE_MEXC_API_KEY
            const secret = import.meta.env.VITE_MEXC_API_SECRET
            const ts     = Date.now()
            const query  = `timestamp=${ts}&recvWindow=60000`
            const sig    = await hmacHex(secret, query)
            const t0     = performance.now()

            const res = await rlFetch(
                'mexc', 300,
                `/mexc-spot-api/api/v3/capital/config/getall?${query}&signature=${sig}`,
                { headers: { 'X-MEXC-APIKEY': apiKey } }
            )
            if (!res.ok) {
                console.warn('MEXC status batch failed:', res.status)
                return {}
            }
            const data = await res.json()
            if (!Array.isArray(data)) return {}

            const map = {}
            for (const coin of data) {
                map[coin.coin] = {
                    deposit:  coin.networkList?.some(n => n.depositEnable)  ?? false,
                    withdraw: coin.networkList?.some(n => n.withdrawEnable) ?? false,
                }
            }
            cache[MEXC_BATCH_KEY] = { data: map, ts: Date.now() }
            // Лог успешного батч-запроса — кол-во монет и время
            aLog('success', `[STATUS] MEXC батч ✅ ${Object.keys(map).length} монет | ⏱ ${(performance.now() - t0).toFixed(0)}мс`)
            return map
        } catch (e) {
            // Лог ошибки батч-запроса
            aLog('error', `[STATUS] MEXC батч ❌ ${e.message}`)
            console.warn('MEXC all status failed:', e.message)
            return {}
        } finally {
            // Сбрасываем dedup-промис после завершения (успех или ошибка)
            _mexcBatchPromise = null
        }
    })()

    return _mexcBatchPromise
}

export async function getMEXCStatus(symbol) {
    // Лог входа — биржа и символ
    aLog('log', `[STATUS] getMEXCStatus(${symbol})`)
    const map = await fetchAllMEXCStatus()
    const result = map[symbol.toUpperCase()] ?? FALLBACK
    // Лог итогового результата для конкретного символа
    aLog('log', `[STATUS] MEXC ${symbol} → deposit=${result.deposit} withdraw=${result.withdraw}`)
    return result
}

// ─── BingX ──────────────────────────────────────────────────────────────────

export async function getBingXStatus(symbol) {
    const key = `bingx_${symbol}`
    // Лог входа — биржа и символ
    aLog('log', `[STATUS] getBingXStatus(${symbol})`)
    if (isFresh(key)) {
        // Лог попадания в кэш — возраст записи
        const ageMs = Date.now() - cache[key].ts
        aLog('log', `[STATUS] BingX ${symbol} → кэш HIT (возраст: ${(ageMs / 1000).toFixed(0)}с)`)
        return cache[key].data
    }
    // Лог промаха кэша
    aLog('log', `[STATUS] BingX ${symbol} → кэш MISS, делаем запрос`)

    try {
        const apiKey = import.meta.env.VITE_BINGX_API_KEY
        const secret = import.meta.env.VITE_BINGX_API_SECRET
        const ts     = Date.now()
        const params = `timestamp=${ts}`
        const sig    = await hmacHex(secret, params)
        const t0     = performance.now()

        const res = await rlFetch(
            'bingx', 250,
            `/bingx-api/openApi/wallets/v1/capital/config/getall?${params}&signature=${sig}`,
            { headers: { 'X-BX-APIKEY': apiKey } }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data   = await res.json()
        const coin   = data.data?.find(c => c.coin === symbol.toUpperCase())
        const result = {
            deposit:  coin?.networkList?.some(n => n.depositEnable)  ?? false,
            withdraw: coin?.networkList?.some(n => n.withdrawEnable) ?? false,
        }
        cache[key] = { data: result, ts: Date.now() }
        // Лог успешного результата — deposit/withdraw и время
        aLog('success', `[STATUS] BingX ${symbol} ✅ deposit=${result.deposit} withdraw=${result.withdraw} | ⏱ ${(performance.now() - t0).toFixed(0)}мс`)
        return result
    } catch (e) {
        // Лог ошибки с текстом исключения
        aLog('error', `[STATUS] BingX ${symbol} ❌ ${e.message}`)
        console.warn('BingX status failed:', symbol, e.message)
        return FALLBACK
    }
}

// ─── Bitget (батч: все монеты за один запрос, публичный API) ────────────────

const BITGET_BATCH_KEY = 'bitget_ALL'

async function fetchAllBitgetStatus() {
    if (isFresh(BITGET_BATCH_KEY)) {
        // Лог попадания в кэш батча Bitget
        const ageMs = Date.now() - cache[BITGET_BATCH_KEY].ts
        const count = Object.keys(cache[BITGET_BATCH_KEY].data).length
        aLog('log', `[STATUS] Bitget батч → кэш HIT (${count} монет, возраст: ${(ageMs / 1000).toFixed(0)}с)`)
        return cache[BITGET_BATCH_KEY].data
    }
    // Лог промаха кэша батча
    aLog('log', `[STATUS] Bitget батч → кэш MISS, загружаем все монеты`)

    try {
        const t0  = performance.now()
        const res = await rlFetch('bitget', 200, 'https://api.bitget.com/api/v2/spot/public/coins')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        const map  = {}
        for (const coin of (data.data ?? [])) {
            map[coin.coin] = {
                deposit:  coin.chains?.some(c => c.rechargeable === 'true') ?? false,
                withdraw: coin.chains?.some(c => c.withdrawable === 'true') ?? false,
            }
        }
        cache[BITGET_BATCH_KEY] = { data: map, ts: Date.now() }
        // Лог успешного батч-запроса — кол-во монет и время
        aLog('success', `[STATUS] Bitget батч ✅ ${Object.keys(map).length} монет | ⏱ ${(performance.now() - t0).toFixed(0)}мс`)
        return map
    } catch (e) {
        // Лог ошибки батч-запроса
        aLog('error', `[STATUS] Bitget батч ❌ ${e.message}`)
        console.warn('Bitget all status failed:', e.message)
        return {}
    }
}

export async function getBitgetStatus(symbol) {
    // Лог входа — биржа и символ
    aLog('log', `[STATUS] getBitgetStatus(${symbol})`)
    const map = await fetchAllBitgetStatus()
    const result = map[symbol.toUpperCase()] ?? FALLBACK
    // Лог итогового результата для конкретного символа
    aLog('log', `[STATUS] Bitget ${symbol} → deposit=${result.deposit} withdraw=${result.withdraw}`)
    return result
}

// ─── KuCoin (публичный API, без авторизации) ─────────────────────────────────

export async function getKuCoinStatus(symbol) {
    const key = `kucoin_${symbol}`
    // Лог входа — биржа и символ
    aLog('log', `[STATUS] getKuCoinStatus(${symbol})`)
    if (isFresh(key)) {
        // Лог попадания в кэш — возраст записи
        const ageMs = Date.now() - cache[key].ts
        aLog('log', `[STATUS] KuCoin ${symbol} → кэш HIT (возраст: ${(ageMs / 1000).toFixed(0)}с)`)
        return cache[key].data
    }
    // Лог промаха кэша
    aLog('log', `[STATUS] KuCoin ${symbol} → кэш MISS, делаем запрос`)

    try {
        const t0  = performance.now()
        const res = await rlFetch(
            'kucoin', 200,
            `/kucoin-spot-api/api/v2/currencies/${symbol.toUpperCase()}`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data   = await res.json()
        const chains = data.data?.chains ?? []
        const result = {
            deposit:  chains.some(c => c.isDepositEnabled),
            withdraw: chains.some(c => c.isWithdrawEnabled),
        }
        cache[key] = { data: result, ts: Date.now() }
        // Лог успешного результата — deposit/withdraw и время
        aLog('success', `[STATUS] KuCoin ${symbol} ✅ deposit=${result.deposit} withdraw=${result.withdraw} | ⏱ ${(performance.now() - t0).toFixed(0)}мс`)
        return result
    } catch (e) {
        // Лог ошибки с текстом исключения
        aLog('error', `[STATUS] KuCoin ${symbol} ❌ ${e.message}`)
        console.warn('KuCoin status failed:', symbol, e.message)
        return FALLBACK
    }
}
import { hmacHex, hmacBase64 } from './sign.js'
import { rlFetch } from './rateLimiter.js'

const statusCache = {}
const STATUS_TTL = 5 * 60 * 1000  // 5 минут

function isFreshStatus(key) {
    return statusCache[key] && (Date.now() - statusCache[key].ts < STATUS_TTL)
}

// ─── Binance ────────────────────────────────────────────────────
export async function getBinanceStatus(symbol) {
    const key = `binance_status_${symbol}`
    if (isFreshStatus(key)) return statusCache[key].data

    try {
        const apiKey = import.meta.env.VITE_BINANCE_API_KEY
        const secret = import.meta.env.VITE_BINANCE_API_SECRET
        const ts = Date.now()
        const query = `timestamp=${ts}&recvWindow=60000`
        const sig = await hmacHex(secret, query)

        const res = await rlFetch(
            'binance', 200,
            `/binance-api/sapi/v1/capital/config/getall?${query}&signature=${sig}`,
            { headers: { 'X-MBX-APIKEY': apiKey } }
        )
        if (!res.ok) {
            const text = await res.text()
            console.warn('Binance raw:', res.status, text.slice(0, 300))
            return { deposit: true, withdraw: true }
        }
        const data = await res.json()
        if (!Array.isArray(data)) {
            console.warn('Binance error:', data)
            return { deposit: true, withdraw: true }
        }

        const coin = data.find(c => c.coin === symbol.toUpperCase())
        const result = {
            deposit: coin?.networkList?.some(n => n.depositEnable) ?? false,
            withdraw: coin?.networkList?.some(n => n.withdrawEnable) ?? false
        }
        statusCache[key] = { data: result, ts: Date.now() }
        return result
    } catch (e) {
        console.warn('Binance status failed:', symbol, e.message)
        return { deposit: true, withdraw: true }
    }
}

// ─── Bybit ──────────────────────────────────────────────────────
export async function getBybitStatus(symbol) {
    const key = `bybit_status_${symbol}`
    if (isFreshStatus(key)) return statusCache[key].data

    try {
        const apiKey = import.meta.env.VITE_BYBIT_API_KEY
        const secret = import.meta.env.VITE_BYBIT_API_SECRET
        const ts = Date.now().toString()
        const recvWindow = '5000'
        const queryString = `coin=${symbol.toUpperCase()}`
        const sig = await hmacHex(secret, ts + apiKey + recvWindow + queryString)

        const res = await rlFetch(
            'bybit', 150,
            `https://api.bybit.com/v5/asset/coin/query-info?${queryString}`,
            { headers: {
                'X-BAPI-API-KEY': apiKey,
                'X-BAPI-SIGN': sig,
                'X-BAPI-TIMESTAMP': ts,
                'X-BAPI-RECV-WINDOW': recvWindow
            }}
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const chains = data.result?.rows?.[0]?.chains ?? []
        const result = {
            deposit: chains.some(c => c.chainDeposit === '1'),
            withdraw: chains.some(c => c.chainWithdraw === '1')
        }
        statusCache[key] = { data: result, ts: Date.now() }
        return result
    } catch (e) {
        console.warn('Bybit status failed:', symbol, e.message)
        return { deposit: true, withdraw: true }
    }
}

// ─── OKX (batch: все монеты за один запрос) ─────────────────────
const OKX_ALL_KEY = 'okx_status_ALL'

async function fetchAllOKXStatus() {
    if (isFreshStatus(OKX_ALL_KEY)) return statusCache[OKX_ALL_KEY].data

    try {
        const apiKey = import.meta.env.VITE_OKX_API_KEY
        const secret = import.meta.env.VITE_OKX_API_SECRET
        const passphrase = import.meta.env.VITE_OKX_PASSPHRASE
        const ts = new Date().toISOString()
        const path = '/api/v5/asset/currencies'
        const sig = await hmacBase64(secret, ts + 'GET' + path)

        const res = await rlFetch(
            'okx', 300,
            `https://www.okx.com${path}`,
            { headers: {
                'OK-ACCESS-KEY': apiKey,
                'OK-ACCESS-SIGN': sig,
                'OK-ACCESS-TIMESTAMP': ts,
                'OK-ACCESS-PASSPHRASE': passphrase
            }}
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const map = {}
        for (const chain of (data.data ?? [])) {
            const sym = chain.ccy
            if (!map[sym]) map[sym] = { deposit: false, withdraw: false }
            if (chain.canDep) map[sym].deposit = true
            if (chain.canWd) map[sym].withdraw = true
        }
        statusCache[OKX_ALL_KEY] = { data: map, ts: Date.now() }
        return map
    } catch (e) {
        console.warn('OKX all status failed:', e.message)
        return {}
    }
}

export async function getOKXStatus(symbol) {
    const map = await fetchAllOKXStatus()
    return map[symbol.toUpperCase()] ?? { deposit: true, withdraw: true }
}


// ─── MEXC ───────────────────────────────────────────────────────
export async function getMEXCStatus(symbol) {
    const key = `mexc_status_${symbol}`
    if (isFreshStatus(key)) return statusCache[key].data

    try {
        const apiKey = import.meta.env.VITE_MEXC_API_KEY
        const secret = import.meta.env.VITE_MEXC_API_SECRET
        const ts = Date.now()
        const query = `timestamp=${ts}&recvWindow=60000`
        const sig = await hmacHex(secret, query)

        const res = await rlFetch(
            'mexc', 300,
            `/mexc-spot-api/api/v3/capital/config/getall?${query}&signature=${sig}`,
            { headers: { 'X-MEXC-APIKEY': apiKey } }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!Array.isArray(data)) {
            console.warn('MEXC error:', data)
            return { deposit: true, withdraw: true }
        }
        const coin = data.find(c => c.coin === symbol.toUpperCase())
        const result = {
            deposit: coin?.networkList?.some(n => n.depositEnable) ?? false,
            withdraw: coin?.networkList?.some(n => n.withdrawEnable) ?? false
        }
        statusCache[key] = { data: result, ts: Date.now() }
        return result
    } catch (e) {
        console.warn('MEXC status failed:', symbol, e.message)
        return { deposit: true, withdraw: true }
    }
}

// ─── BingX ──────────────────────────────────────────────────────
export async function getBingXStatus(symbol) {
    const key = `bingx_status_${symbol}`
    if (isFreshStatus(key)) return statusCache[key].data

    try {
        const apiKey = import.meta.env.VITE_BINGX_API_KEY
        const secret = import.meta.env.VITE_BINGX_API_SECRET
        const ts = Date.now()
        const params = `timestamp=${ts}`
        const sig = await hmacHex(secret, params)

        const res = await rlFetch(
            'bingx', 250,
            `/bingx-api/openApi/wallets/v1/capital/config/getall?${params}&signature=${sig}`,
            { headers: { 'X-BX-APIKEY': apiKey } }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const coin = data.data?.find(c => c.coin === symbol.toUpperCase())
        const result = {
            deposit: coin?.networkList?.some(n => n.depositEnable) ?? false,
            withdraw: coin?.networkList?.some(n => n.withdrawEnable) ?? false
        }
        statusCache[key] = { data: result, ts: Date.now() }
        return result
    } catch (e) {
        console.warn('BingX status failed:', symbol, e.message)
        return { deposit: true, withdraw: true }
    }
}

// ─── Bitget (batch: все монеты за один запрос) ──────────────────
const BITGET_ALL_KEY = 'bitget_status_ALL'

async function fetchAllBitgetStatus() {
    if (isFreshStatus(BITGET_ALL_KEY)) return statusCache[BITGET_ALL_KEY].data

    try {
        const res = await rlFetch('bitget', 200, 'https://api.bitget.com/api/v2/spot/public/coins')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const map = {}
        for (const coin of (data.data ?? [])) {
            map[coin.coin] = {
                deposit: coin.chains?.some(c => c.rechargeable === 'true') ?? false,
                withdraw: coin.chains?.some(c => c.withdrawable === 'true') ?? false
            }
        }
        statusCache[BITGET_ALL_KEY] = { data: map, ts: Date.now() }
        return map
    } catch (e) {
        console.warn('Bitget all status failed:', e.message)
        return {}
    }
}

export async function getBitgetStatus(symbol) {
    const map = await fetchAllBitgetStatus()
    return map[symbol.toUpperCase()] ?? { deposit: true, withdraw: true }
}


// ─── KuCoin (public, no auth) ────────────────────────────────────
export async function getKuCoinStatus(symbol) {
    const key = `kucoin_status_${symbol}`
    if (isFreshStatus(key)) return statusCache[key].data

    try {
        const res = await rlFetch(
            'kucoin', 200,
            `/kucoin-spot-api/api/v2/currencies/${symbol.toUpperCase()}`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const chains = data.data?.chains ?? []
        const result = {
            deposit: chains.some(c => c.isDepositEnabled),
            withdraw: chains.some(c => c.isWithdrawEnabled)
        }
        statusCache[key] = { data: result, ts: Date.now() }
        return result
    } catch (e) {
        console.warn('KuCoin status failed:', symbol, e.message)
        return { deposit: true, withdraw: true }
    }
}

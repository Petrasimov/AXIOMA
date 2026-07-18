/**
 * ExchangeLogo.jsx — логотип биржи по её ключу или отображаемому имени
 *
 * Тот же подход, что на главной (InlineFavicon): грузим фавикон биржи по домену,
 * а если картинка не отдалась — короткий буквенный фолбэк (BN, BB, …).
 * Никаких брендовых иконок из lucide-react и никаких локальных ассетов.
 *
 * Вход терпим к написанию: принимает и ключи ('binance', 'gate' — как в TopMovers),
 * и отображаемые имена funding-API ('Binance', 'Gate.io', 'KuCoin').
 */

import { useState } from 'react'

// Канонический ключ биржи → домен для фавиконки + буквенный фолбэк.
const EX_DOMAIN = {
    binance: { domain: 'binance.com', fallback: 'BN' },
    bybit:   { domain: 'bybit.com',   fallback: 'BB' },
    okx:     { domain: 'okx.com',     fallback: 'OK' },
    bitget:  { domain: 'bitget.com',  fallback: 'BG' },
    gate:    { domain: 'gate.io',     fallback: 'GT' },
    kucoin:  { domain: 'kucoin.com',  fallback: 'KC' },
    mexc:    { domain: 'mexc.com',    fallback: 'MX' },
    bingx:   { domain: 'bingx.com',   fallback: 'BX' },
}

// Нормализованные варианты, которые не совпадают с ключом напрямую.
const ALIASES = { gateio: 'gate', gatecom: 'gate' }

// Любое написание биржи → ключ EX_DOMAIN (или null, если не узнали).
// 'Binance'→'binance', 'Gate.io'/'gateio'→'gate', 'binance_futures'→'binance'.
function resolveKey(exchange) {
    if (!exchange) return null
    const norm = String(exchange).toLowerCase().replace(/[^a-z]/g, '')
    if (EX_DOMAIN[norm]) return norm
    if (ALIASES[norm]) return ALIASES[norm]
    for (const key of Object.keys(EX_DOMAIN)) {
        if (norm.startsWith(key)) return key   // 'binancefutures' → 'binance'
    }
    return null
}

function fallbackText(exchange, info) {
    if (info) return info.fallback
    return (String(exchange || '?').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?')
}

function ExchangeLogo({ exchange, size = 16, color = '#8aa0b2', style: extra }) {
    const [err, setErr] = useState(false)
    const key = resolveKey(exchange)
    const info = key ? EX_DOMAIN[key] : null

    if (!info || err) {
        return (
            <span style={{
                fontFamily: 'var(--font-mono)', fontSize: Math.round(size * 0.5),
                fontWeight: 800, color, lineHeight: 1, flexShrink: 0, ...extra,
            }}>
                {fallbackText(exchange, info)}
            </span>
        )
    }

    return (
        <img
            src={`https://www.google.com/s2/favicons?domain=${info.domain}&sz=64`}
            width={size}
            height={size}
            alt={info.fallback}
            onError={() => setErr(true)}
            style={{ borderRadius: 4, display: 'block', flexShrink: 0, ...extra }}
        />
    )
}

export default ExchangeLogo
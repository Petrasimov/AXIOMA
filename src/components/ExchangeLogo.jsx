/**
 * ExchangeLogo.jsx — логотип биржи по её ключу
 *
 * Тот же подход, что на главной (InlineFavicon): грузим фавикон биржи по домену
 * через сервис фавиконок, а если картинка не отдалась — показываем короткий
 * текстовый фолбэк (BN, BB, …) цветом биржи. Никаких брендовых иконок из
 * lucide-react (их там нет) и никаких локальных ассетов.
 */

import { useState } from 'react'

// Ключ биржи → домен для фавиконки + буквенный фолбэк.
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

function ExchangeLogo({ exchange, size = 16, color = '#8aa0b2', style: extra }) {
    const [err, setErr] = useState(false)
    const info = EX_DOMAIN[exchange]
    if (!info) return null

    if (err) {
        return (
            <span style={{
                fontFamily: 'var(--font-mono)', fontSize: Math.round(size * 0.5),
                fontWeight: 800, color, lineHeight: 1, flexShrink: 0, ...extra,
            }}>
                {info.fallback}
            </span>
        )
    }

    return (
        <img
            src={`https://www.google.com/s2/favicons?domain=${info.domain}&sz=32`}
            width={size}
            height={size}
            alt={info.fallback}
            onError={() => setErr(true)}
            style={{ borderRadius: 3, display: 'block', flexShrink: 0, ...extra }}
        />
    )
}

export default ExchangeLogo
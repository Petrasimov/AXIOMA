/**
 * utils.js — Утилиты общего назначения
 *
 * Форматирование, расчёты, цветовая индикация.
 * Не содержит сетевых запросов и побочных эффектов.
 */

import { EXCHANGES } from './constants'

// ─── Биржи ───────────────────────────────────────────────────────────────────

/** Возвращает метаданные биржи по id. При отсутствии — заглушку. */
export function getExchangeInfo(id) {
    return EXCHANGES[id] ?? { name: id, short: id, color: '#666', logo: '' }
}

// ─── Форматирование чисел ────────────────────────────────────────────────────

/** Форматирует объём в читаемый вид: 1.2M, 500K и т.д. */
export function formatVolume(value) {
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B'
    if (value >= 1_000_000)     return (value / 1_000_000).toFixed(1)     + 'M'
    if (value >= 1_000)         return (value / 1_000).toFixed(1)         + 'K'
    return value?.toFixed(0) ?? '0'
}

/** Форматирует цену с адаптивной точностью. */
export function formatPrice(price) {
    if (!price) return '0'
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
    if (price >= 1)    return price.toFixed(4)
    return price.toFixed(6)
}

/** Форматирует возраст возможности в читаемый вид: "2д 3ч", "5ч 12м", "8м". */
export function formatAge(isoString) {
    const diff    = Date.now() - new Date(isoString).getTime()
    const minutes = Math.floor(diff / 60_000)
    const hours   = Math.floor(diff / 3_600_000)
    const days    = Math.floor(diff / 86_400_000)

    if (days > 0)   return `${days}д ${hours % 24}ч`
    if (hours > 0)  return `${hours}ч ${minutes % 60}м`
    return `${minutes}м`
}

/** Форматирует время до следующего funding: "2ч 15м", "45м". */
export function formatTimeRemaining(unixTimestamp) {
    if (!unixTimestamp) return '—'
    const diff = unixTimestamp * 1000 - Date.now()
    if (diff <= 0) return '0м'
    const hours   = Math.floor(diff / 3_600_000)
    const minutes = Math.floor((diff % 3_600_000) / 60_000)
    return hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`
}

// ─── Цветовая индикация ──────────────────────────────────────────────────────

/** Цвет спреда: зелёный ≥3%, желтый ≥1%, серый — остальное. */
export function getSpreadColor(spread) {
    if (spread >= 3) return '#00c97a'
    if (spread >= 2) return '#7ecf5a'
    if (spread >= 1) return '#f0a500'
    return '#6a8fa8'
}

/** Текстовый и цветовой грейд спреда для бейджей. */
export function getSpreadGrade(spread) {
    if (spread >= 3) return { label: 'HOT',  bg: '#00c97a22', color: '#00c97a' }
    if (spread >= 2) return { label: 'GOOD', bg: '#7ecf5a22', color: '#7ecf5a' }
    if (spread >= 1) return { label: 'OK',   bg: '#f0a50022', color: '#f0a500' }
    return                  { label: 'LOW',  bg: '#6a8fa822', color: '#6a8fa8' }
}

/** Иконка возраста возможности. */
export function getAgeIcon(isoString) {
    if (!isoString) return '⏳'
    const minutes = (Date.now() - new Date(isoString).getTime()) / 60_000
    if (minutes < 5)  return '🆕'
    if (minutes < 30) return '🕐'
    return '⏳'
}

/** Иконка статуса депозита/вывода. */
export function getTransferIcon(val) {
    if (val === true)  return { icon: '✅' }
    if (val === false) return { icon: '🚫' }
    return                   { icon: '❓' }
}

// ─── Расчёты ─────────────────────────────────────────────────────────────────

/** Расчёт ориентировочной прибыли от сделки. */
export function calcProfit(spread, tradeAmount) {
    return (spread * tradeAmount / 100).toFixed(2)
}

/**
 * Расчёт VWAP (средневзвешенной цены) для заданного объёма в USD.
 * orders — массив [price, qty] отсортированный по цене.
 * Возвращает null если объём не набирается.
 */
export function calcVwap(orders, usdAmount) {
    if (!orders?.length) return null

    let remaining = usdAmount
    let totalCost = 0
    let totalQty  = 0

    for (const [price, qty] of orders) {
        if (remaining <= 0) break
        const available = qty * price
        const spend     = Math.min(remaining, available)
        const bought    = spend / price
        totalCost += bought * price
        totalQty  += bought
        remaining -= spend
    }

    return totalQty > 0 ? totalCost / totalQty : null
}

/**
 * Расчёт максимального объёма входа до достижения целевой цены.
 * side: 'long' — идём по asks снизу вверх до targetPrice
 *       'short' — идём по bids сверху вниз до targetPrice
 * Возвращает { usd, count } или null.
 */
export function calcMaxVolume(orders, targetPrice, side) {
    if (!orders?.length || !targetPrice) return null

    let totalUsd = 0
    let count    = 0

    for (const [price, qty] of orders) {
        const p = parseFloat(price)
        const q = parseFloat(qty)
        if (side === 'long'  && p >= targetPrice) break
        if (side === 'short' && p <= targetPrice) break
        totalUsd += p * q
        count++
    }

    return totalUsd > 0 ? { usd: totalUsd, count } : null
}

/**
 * Парсит строку вида "binance_futures" → { id: 'binance', market: 'futures' }
 * Используется для работы с bid_ex / ask_ex из бэкенда.
 */
export function parseExchange(str) {
    const idx = str.lastIndexOf('_')
    return { id: str.slice(0, idx), market: str.slice(idx + 1) }
}

/**
 * Расчёт спреда по пересечению стаканов (Market Depth Spread).
 * Объективная рыночная метрика — не зависит от tradeAmount пользователя.
 *
 * Алгоритм:
 *   1. overlap = min(Σ bid объём в USD, Σ ask объём в USD)
 *   2. bid_vwap — VWAP при закрытии overlap объёма, идём сверху вниз по bid
 *   3. ask_vwap — VWAP при закрытии overlap объёма, идём снизу вверх по ask
 *   4. spread = (bid_vwap - ask_vwap) / bid_vwap * 100
 *
 * @param {Array} bidBook — [[price, qty], ...] отсортирован по убыванию цены
 * @param {Array} askBook — [[price, qty], ...] отсортирован по возрастанию цены
 * @returns {{ spread: number, bid_vwap: number, ask_vwap: number, overlap_usd: number } | null}
 */
export function calcDepthSpread(bidBook, askBook) {
    if (!bidBook?.length || !askBook?.length) return null

    // Шаг 1 — объём пересечения стаканов
    const totalBid = bidBook.reduce((s, [p, q]) => s + parseFloat(p) * parseFloat(q), 0)
    const totalAsk = askBook.reduce((s, [p, q]) => s + parseFloat(p) * parseFloat(q), 0)
    const overlap  = Math.min(totalBid, totalAsk)
    if (overlap <= 0) return null

    // Шаг 2 — bid VWAP (стакан уже отсортирован по убыванию — сверху вниз)
    let rem = overlap, bidW = 0, bidQ = 0
    for (const [p, q] of bidBook) {
        const price = parseFloat(p)
        const usd   = price * parseFloat(q)
        const take  = Math.min(usd, rem)
        const qty   = take / price
        bidW += price * qty
        bidQ += qty
        rem  -= take
        if (rem <= 0) break
    }
    if (bidQ <= 0) return null
    const bid_vwap = bidW / bidQ

    // Шаг 3 — ask VWAP (стакан уже отсортирован по возрастанию — снизу вверх)
    rem = overlap
    let askW = 0, askQ = 0
    for (const [p, q] of askBook) {
        const price = parseFloat(p)
        const usd   = price * parseFloat(q)
        const take  = Math.min(usd, rem)
        const qty   = take / price
        askW += price * qty
        askQ += qty
        rem  -= take
        if (rem <= 0) break
    }
    if (askQ <= 0 || bid_vwap <= 0) return null
    const ask_vwap = askW / askQ

    // Шаг 4 — спред (bid > ask → положительный при реальном арбитраже)
    const spread = (bid_vwap - ask_vwap) / bid_vwap * 100

    return { spread, bid_vwap, ask_vwap, overlap_usd: overlap }
}
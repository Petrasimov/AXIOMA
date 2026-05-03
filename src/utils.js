import { EXCHANGES } from "./constants";

export function getExchangeInfo(id) {
    return EXCHANGES[id] || { name: id, short: id, color: '#666', logo: '' }
}

export function formatVolume(value) {
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B'
    if (value >= 1_000_000)     return (value / 1_000_000).toFixed(1) + 'M'
    if (value >= 1_000)         return (value / 1_000).toFixed(1) + 'K'
    return value?.toFixed(0) ?? '0'
}

export function formatPrice(price) {
    if (!price) return '0'
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2})
    if (price >= 1)    return price.toFixed(4)
    return price.toFixed(6)    
}

export function formatAge(isoString) {
    const diff = Date.now() - new Date(isoString).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours   = Math.floor(diff / 3600000)
    const days    = Math.floor(diff / 86400000)

    if (days > 0)   return `${days}д ${hours % 24}ч`
    if (hours > 0)  return `${hours}ч ${minutes % 60}м`
    return `${minutes}м`
}

export function getSpreadColor(spread) {
    if (spread >= 3) return '#00c97a'
    if (spread >= 2) return '#7ecf5a'
    if (spread >= 1) return '#f0a500'
    return '#6a8fa8'
}

export function getSpreadGrade(spread) {
  if (spread >= 3) return { label: 'HOT',  bg: '#00c97a22', color: '#00c97a' }
  if (spread >= 2) return { label: 'GOOD', bg: '#7ecf5a22', color: '#7ecf5a' }
  if (spread >= 1) return { label: 'OK',   bg: '#f0a50022', color: '#f0a500' }
  return { label: 'LOW',  bg: '#6a8fa822', color: '#6a8fa8' }
}

export function calcProfit(spread, tradeAmount) {
    return (spread * tradeAmount / 100).toFixed(2)
}

export function formatTimeRemaining(unixTimestamp) {
    if (!unixTimestamp) return '—'
    const diff = unixTimestamp * 1000 - Date.now()
    if (diff <= 0) return '0m'
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    return hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`
}

export function getAgeIcon(isoString) {
    if (!isoString) return '⏳'
    const minutes = (Date.now() - new Date(isoString).getTime()) / 60000
    if (minutes < 5) return '🆕'
    if (minutes < 30) return '🕐'
    return '⏳'
}

export function getTransferIcon(val) {
    if (val === true) return { icon: '✅'}
    if (val === false) return { icon: '🚫'}
    return { icon: '❓'}
}

export function calcVwap(orders, usdAmount) {
    if (!orders || orders.length === 0) return null

    let remaining = usdAmount
    let totalCost = 0
    let totalQty = 0

    for (const [price, qty] of orders) {
        if (remaining <= 0) break

        const available = qty * price 
        const spend = Math.min(remaining, available)
        const bought = spend / price 

        totalCost += bought * price
        totalQty += bought
        remaining -= spend
    }

    if (totalQty === 0) return null
    return totalCost / totalQty
    
}

export function calcMaxVolume(orders, targetPrice, side) {
    if (!orders || orders.length === 0 || !targetPrice) return null

    let totalUsd = 0
    let count = 0

    if (side === 'long') {
        // Идём по asks снизу вверх, останавливаемся когда цена >= targetPrice
        for (const [price, qty] of orders) {
            const p = parseFloat(price)
            const q = parseFloat(qty)
            if (p >= targetPrice) break
            totalUsd += p * q
            count++
        }
    } else {
        // Идём по bids сверху вниз, останавливаемся когда цена <= targetPrice
        for (const [price, qty] of orders) {
            const p = parseFloat(price)
            const q = parseFloat(qty)
            if (p <= targetPrice) break
            totalUsd += p * q
            count++
        }
    }

    if (totalUsd === 0) return null
    return { usd: totalUsd, count }
}

export function parseExchange(str) {
    const idx = str.lastIndexOf('_')
    return { id: str.slice(0, idx), market: str.slice(idx + 1) }
}

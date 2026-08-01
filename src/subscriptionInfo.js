/**
 * subscriptionInfo.js — единый источник данных о подписке
 * Используется в AccessDenied.jsx (paywall) и HomePage.jsx (тариф-секция)
 */

export const PLAN = {
    price: 5,
    currency: 'USDT',
    period: 'месяц',
    label: '$5 / месяц',
}

export const NETWORKS = [
    { id: 'trc20',     label: 'TRC-20',    chain: 'Tron' },
    { id: 'bep20',     label: 'BEP-20',    chain: 'BSC' },
    { id: 'polygon',   label: 'Polygon',   chain: 'Polygon' },
    { id: 'avax',      label: 'AVAX C',    chain: 'Avalanche' },
    { id: 'arbitrum',  label: 'Arbitrum',  chain: 'Arbitrum One' },
    { id: 'optimism',  label: 'Optimism',  chain: 'Optimism' },
    { id: 'ton',       label: 'TON',       chain: 'TON' },
]

export const BENEFITS = [
    'CEX-CEX арбитражный сканер в реальном времени',
    '8 бирж: Binance, Bybit, OKX, Gate, KuCoin, MEXC, BingX, Bitget',
    'Стратегии SF и FF — спот и фьючерсы',
    'WebSocket стаканы с живыми данными',
    'Фандинг-арбитраж сканер',
    'Доступ сразу после оплаты',
]

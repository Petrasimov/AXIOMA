/**
 * FundingDetailModal.jsx
 *
 * Модальное окно funding-арбитража — Дизайн 1 "Split Panels".
 *
 * Левая колонка: биржевые панели (Short / Buy) + смешанный стакан
 *   (bid-строки с биржи short, ask-строки с биржи buy) + VWAP-сводка.
 * Правая колонка: сводка (Profit, Funding In), калькулятор входа,
 *   ссылки на терминалы, кнопка Торговать/Выход.
 *
 * WS: два отдельных connectOrderBook, объединённых в один визуальный стакан.
 * Формулы калькулятора — новые (не из DetailModal.jsx futures-сканера):
 *   итоговый_спред = opp.spread − (avgAsk − avgBid) / avgBid × 100
 *   спред_выхода   = (vwapBidExit − vwapAskExit) / vwapBidExit × 100
 */

import { useState, useEffect, useRef } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { connectOrderBook } from '../ws.js'
import { calcVwap, calcMaxVolume, formatPrice, formatVolume, getSpreadColor } from '../utils.js'

// ─── Маппинг: название биржи в funding-API → id для connectOrderBook ─────────
const WS_EX_ID = {
  'Binance': 'binance',
  'BingX':   'bingx',
  'Bitget':  'bitget',
  'Bybit':   'bybit',
  'Gate.io': 'gate',
  'KuCoin':  'kucoin',
  'MEXC':    'mexc',
  'OKX':     'okx',
}

// ─── Ссылки на терминалы ──────────────────────────────────────────────────────
const TERMINAL_LINKS = {
  'Binance': {
    futures: sym => `https://www.binance.com/en/futures/${sym}USDT`,
    spot:    sym => `https://www.binance.com/en/trade/${sym}_USDT`,
  },
  'BingX': {
    futures: sym => `https://bingx.com/en/futures/${sym}USDT/`,
    spot:    sym => `https://bingx.com/en/spot/${sym}_USDT/`,
  },
  'Bitget': {
    futures: sym => `https://www.bitget.com/futures/usdt/${sym}USDT`,
    spot:    sym => `https://www.bitget.com/spot/${sym}USDT`,
  },
  'Bybit': {
    futures: sym => `https://www.bybit.com/trade/usdt/${sym}USDT`,
    spot:    sym => `https://www.bybit.com/en/trade/spot/${sym}/USDT`,
  },
  'Gate.io': {
    futures: sym => `https://www.gate.io/futures/usdt/${sym}_USDT`,
    spot:    sym => `https://www.gate.io/trade/${sym}_USDT`,
  },
  'KuCoin': {
    futures: sym => `https://www.kucoin.com/futures/trade/${sym}USDTM`,
    spot:    sym => `https://www.kucoin.com/trade/${sym}-USDT`,
  },
  'MEXC': {
    futures: sym => `https://futures.mexc.com/exchange/${sym}_USDT`,
    spot:    sym => `https://www.mexc.com/exchange/${sym}_USDT`,
  },
  'OKX': {
    futures: sym => `https://www.okx.com/trade-swap/${sym.toLowerCase()}-usdt-swap`,
    spot:    sym => `https://www.okx.com/trade-spot/${sym.toLowerCase()}-usdt`,
  },
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const style = `
  .fdm-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.78);
    backdrop-filter: blur(4px);
    z-index: 300;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }

  .fdm {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    width: 980px; max-width: 100%;
    box-shadow: 0 32px 96px rgba(0,0,0,0.7);
    display: flex; flex-direction: column;
    max-height: 92vh;
    animation: fdm-appear 0.15s ease;
  }

  @keyframes fdm-appear {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* HEADER */
  .fdm-head {
    display: flex; align-items: center; gap: 10px;
    padding: 13px 20px;
    background: #071828;
    border-bottom: 1px solid #0e2a42;
    flex-shrink: 0;
  }

  .fdm-sym {
    font-family: var(--font-mono);
    font-size: 18px; font-weight: 900;
    color: #fff; letter-spacing: 0.5px;
  }
  .fdm-sym span {
    color: rgba(255,255,255,0.4);
    font-weight: 400; font-size: 13px;
  }

  .fdm-badge {
    font-size: 9px; font-weight: 600;
    letter-spacing: 1.5px;
    color: rgba(255,255,255,0.5);
    padding: 3px 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
  }

  .fdm-spacer { flex: 1; }

  .fdm-spread-wrap { text-align: right; }
  .fdm-spread-val {
    font-family: var(--font-mono);
    font-size: 22px; font-weight: 700;
    color: var(--warning);
  }
  .fdm-spread-label {
    font-size: 8px; letter-spacing: 1.5px;
    color: rgba(255,255,255,0.3);
  }

  .fdm-btn {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.6);
    cursor: pointer; width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .fdm-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
  .fdm-btn.close:hover {
    background: rgba(224,62,62,0.2);
    border-color: var(--error); color: var(--error);
  }

  /* BODY */
  .fdm-body {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    flex: 1; min-height: 0; overflow: hidden;
  }

  /* LEFT */
  .fdm-left {
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    overflow-y: auto;
  }
  .fdm-left::-webkit-scrollbar { width: 3px; }
  .fdm-left::-webkit-scrollbar-thumb { background: var(--border); }

  /* Exchange panels */
  .fdm-ex-pair {
    display: grid; grid-template-columns: 1fr 1fr;
    border-bottom: 1px solid var(--border);
  }

  .fdm-ex-panel {
    padding: 14px 16px;
    position: relative;
  }
  .fdm-ex-panel.short { border-right: 1px solid var(--border); }
  .fdm-ex-panel::before {
    content: ''; position: absolute;
    left: 0; top: 0; bottom: 0; width: 3px;
  }
  .fdm-ex-panel.short::before { background: var(--error); }
  .fdm-ex-panel.buy::before   { background: var(--success); }

  .fdm-ex-tag {
    font-size: 8px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase;
    margin-bottom: 6px;
  }
  .fdm-ex-tag.short { color: rgba(224,62,62,.85); }
  .fdm-ex-tag.buy   { color: rgba(0,201,122,.85); }

  .fdm-ex-name {
    font-size: 15px; font-weight: 700;
    color: var(--text-primary); margin-bottom: 10px;
  }

  .fdm-ex-row {
    display: flex; justify-content: space-between;
    font-size: 10px; color: var(--text-secondary);
    margin-bottom: 4px;
  }
  .fdm-ex-row b {
    font-family: var(--font-mono);
    color: var(--text-primary);
  }

  .fdm-ex-funding {
    margin-top: 8px; padding-top: 8px;
    border-top: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .fdm-ex-funding-label {
    font-size: 8px; letter-spacing: 1px;
    color: var(--text-muted); text-transform: uppercase;
    margin-bottom: 3px;
  }
  .fdm-ex-funding-rate {
    font-family: var(--font-mono);
    font-size: 13px; font-weight: 700;
    color: var(--success);
  }
  .fdm-ex-countdown {
    font-family: var(--font-mono);
    font-size: 11px; font-weight: 700;
    color: var(--accent-bright);
  }
  .fdm-ex-countdown.soon { color: var(--warning); }

  /* Orderbook */
  .fdm-ob {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .fdm-ob-title {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .fdm-ob-label {
    font-size: 8px; font-weight: 700;
    letter-spacing: 1.5px; color: var(--text-muted);
    text-transform: uppercase;
  }
  .fdm-ob-live {
    display: flex; align-items: center; gap: 5px;
    font-size: 8px; font-weight: 700;
    color: var(--success);
  }
  .fdm-ob-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--success);
    animation: fdm-pulse 2s infinite;
  }
  @keyframes fdm-pulse {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.3; }
  }

  .fdm-ob-head {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    font-size: 8px; letter-spacing: 1px;
    color: var(--text-muted); text-transform: uppercase;
    padding: 0 0 4px; border-bottom: 1px solid var(--border);
    margin-bottom: 3px;
  }
  .fdm-ob-head span:last-child { text-align: right; }

  .fdm-ob-row {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    font-family: var(--font-mono); font-size: 10px;
    padding: 2px 0; position: relative; cursor: default;
  }
  .fdm-ob-row span:last-child { text-align: right; }

  .fdm-ob-row.ask { color: var(--error); }
  .fdm-ob-row.bid { color: var(--success); }

  .fdm-ob-bar {
    position: absolute; top: 0; bottom: 0; right: 0;
    pointer-events: none;
  }
  .fdm-ob-row.ask .fdm-ob-bar { background: rgba(224,62,62,.07); }
  .fdm-ob-row.bid .fdm-ob-bar { background: rgba(0,201,122,.07); }

  .fdm-ob-mid {
    text-align: center; font-size: 9px;
    color: var(--text-muted);
    padding: 5px 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    margin: 3px 0;
    font-family: var(--font-mono);
  }

  .fdm-ob-empty {
    text-align: center; padding: 20px;
    font-size: 11px; color: var(--text-muted);
  }

  /* VWAP strip */
  .fdm-vwap {
    display: flex; padding: 11px 16px;
    gap: 0; border-bottom: 1px solid var(--border);
  }
  .fdm-vwap-item { flex: 1; }
  .fdm-vwap-label {
    font-size: 8px; letter-spacing: 1px;
    color: var(--text-muted); text-transform: uppercase;
    margin-bottom: 3px;
  }
  .fdm-vwap-val {
    font-family: var(--font-mono);
    font-size: 15px; font-weight: 700;
  }
  .fdm-vwap-val.bid { color: var(--error); }
  .fdm-vwap-val.ask { color: var(--success); }
  .fdm-vwap-sep {
    width: 1px; background: var(--border);
    margin: 0 16px;
  }

  /* RIGHT */
  .fdm-right {
    display: flex; flex-direction: column;
    overflow-y: auto;
  }
  .fdm-right::-webkit-scrollbar { width: 3px; }
  .fdm-right::-webkit-scrollbar-thumb { background: var(--border); }

  .fdm-section {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }

  .fdm-section-title {
    font-size: 8px; font-weight: 700;
    letter-spacing: 1.8px; text-transform: uppercase;
    color: var(--accent-bright);
    margin-bottom: 10px;
  }

  /* Stats grid */
  .fdm-stats {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .fdm-stat {
    background: #071828;
    border: 1px solid #0e2a42;
    padding: 9px 12px;
  }
  .fdm-stat-label {
    font-size: 8px; letter-spacing: 1px;
    color: var(--text-muted); text-transform: uppercase;
    margin-bottom: 4px;
  }
  .fdm-stat-val {
    font-family: var(--font-mono);
    font-size: 15px; font-weight: 700;
    color: var(--text-primary);
  }
  .fdm-stat-val.ok  { color: var(--success); }
  .fdm-stat-val.acc { color: var(--accent-bright); }
  .fdm-stat-val.warn { color: var(--warning); }

  /* Calculator */
  .fdm-calc-row {
    display: flex; gap: 8px;
    margin-bottom: 8px;
  }
  .fdm-calc-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .fdm-calc-label {
    font-size: 9px; color: var(--text-muted);
    letter-spacing: 0.5px;
  }
  .fdm-calc-input {
    background: #071828; border: 1px solid #0e2a42;
    color: var(--text-primary);
    font-family: var(--font-mono); font-size: 13px;
    padding: 8px 10px; width: 100%;
    outline: none; transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .fdm-calc-input:focus { border-color: var(--accent-bright); }

  .fdm-calc-results {
    display: flex; flex-direction: column; gap: 6px;
    margin-top: 8px;
  }
  .fdm-calc-result {
    background: #071828; border: 1px solid #0e2a42;
    border-left: 2px solid var(--accent-bright);
    padding: 8px 12px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .fdm-calc-result-label {
    font-size: 9px; color: var(--text-muted);
    letter-spacing: 0.8px;
  }
  .fdm-calc-result-val {
    font-family: var(--font-mono);
    font-size: 15px; font-weight: 700;
  }

  /* Terminal links */
  .fdm-links { display: flex; flex-direction: column; gap: 6px; }
  .fdm-link-btn {
    display: flex; align-items: center; justify-content: space-between;
    padding: 9px 12px;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 12px; font-weight: 600;
    text-decoration: none; cursor: pointer;
    background: none;
    transition: all 0.15s;
    width: 100%;
    text-align: left;
  }
  .fdm-link-btn:hover {
    border-color: var(--accent);
    color: var(--text-primary);
  }
  .fdm-link-tag {
    font-size: 8px; font-weight: 700;
    letter-spacing: 1px; color: var(--text-muted);
  }

  /* Trade button area */
  .fdm-trade-area {
    padding: 14px 16px;
    margin-top: auto;
  }

  .fdm-trade-btn {
    width: 100%; padding: 12px;
    font-size: 11px; font-weight: 700;
    letter-spacing: 1.5px; font-family: var(--font-sans);
    cursor: pointer; border: 1px solid;
    transition: all 0.15s;
  }
  .fdm-trade-btn.default {
    color: var(--accent-bright);
    border-color: rgba(61,135,192,0.4);
    background: rgba(61,135,192,0.07);
  }
  .fdm-trade-btn.default:hover { background: rgba(61,135,192,0.15); }
  .fdm-trade-btn.ready {
    color: #000; border-color: var(--success);
    background: var(--success);
  }
  .fdm-trade-btn.ready:hover { background: #00e88a; }
  .fdm-trade-btn.exit {
    color: #fff; border-color: var(--error);
    background: var(--error);
  }
  .fdm-trade-btn.exit:hover { background: #ff4f4f; }
  .fdm-trade-btn:disabled {
    opacity: 0.4; cursor: not-allowed;
  }

  .fdm-trade-error {
    margin-top: 6px;
    font-size: 10px; color: var(--error);
    background: rgba(224,62,62,0.08);
    border: 1px solid rgba(224,62,62,0.25);
    padding: 5px 10px; line-height: 1.4;
  }
`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitSymbol(symbol) {
  if (!symbol) return { base: '', suffix: '' }
  const match = symbol.match(/^(.*?)[-_]?USDTM?$/i)
  if (!match || !match[1]) return { base: symbol, suffix: '' }
  return { base: match[1], suffix: 'USDT' }
}

function formatCountdown(isoString) {
  if (!isoString) return null
  const diffMs = new Date(isoString).getTime() - Date.now()
  if (isNaN(diffMs) || diffMs <= 0) return 'now'
  const totalSec = Math.floor(diffMs / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

function isSoonCountdown(isoString) {
  if (!isoString) return false
  const diffMs = new Date(isoString).getTime() - Date.now()
  return diffMs > 0 && diffMs <= 5 * 60 * 1000
}

// Сколько строк стакана показывать
const OB_ROWS = 6

// ─── Orderbook row ────────────────────────────────────────────────────────────
function ObRow({ price, qty, side, maxQty }) {
  const pct = maxQty > 0 ? Math.min((qty / maxQty) * 100, 100) : 0
  return (
    <div className={`fdm-ob-row ${side}`}>
      <span>{formatPrice(price)}</span>
      <span>{formatVolume(qty)}</span>
      <span>${formatVolume(price * qty)}</span>
      <div className="fdm-ob-bar" style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Live countdown внутри модалки (тикает каждую секунду) ────────────────────
function LiveCountdown({ isoString }) {
  const [label, setLabel] = useState(() => formatCountdown(isoString))

  useEffect(() => {
    setLabel(formatCountdown(isoString))
    if (!isoString) return
    const id = setInterval(() => setLabel(formatCountdown(isoString)), 1000)
    return () => clearInterval(id)
  }, [isoString])

  if (!label) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  return (
    <span className={`fdm-ex-countdown ${isSoonCountdown(isoString) ? 'soon' : ''}`}>
      {label}
    </span>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
function FundingDetailModal({
  opp,
  selectedSpotEx,  // string — выбранная спот-биржа (для SF)
  tradeAmount,
  onClose,
  onTrade,         // (opp, avgBid, avgAsk, selectedSpotEx) => void
  isActiveTrade,
  onRemoveTrade,
  initialAvgBid,
  initialAvgAsk,
  tradeError,
}) {
  const [bidBook, setBidBook] = useState(null)
  const [askBook, setAskBook] = useState(null)
  const [avgBid, setAvgBid] = useState(initialAvgBid || '')
  const [avgAsk, setAvgAsk] = useState(initialAvgAsk || '')

  // Для liveHistory — аналог DetailModal для exit-spread
  const latestBidRef     = useRef(null)
  const latestAskRef     = useRef(null)
  const latestBidExitRef = useRef(null)
  const latestAskExitRef = useRef(null)

  const { base, suffix } = splitSymbol(opp.symbol)
  const sym = base // чистый символ без USDT для ws.js и ссылок

  const isFF = opp.strategy === 'ff'

  // Определяем биржи и рынок
  const bidExName = opp.exchange_bid
  const askExName = selectedSpotEx || opp.exchange_ask
  const bidExId   = WS_EX_ID[bidExName] ?? bidExName.toLowerCase()
  const askExId   = WS_EX_ID[askExName] ?? askExName.toLowerCase()
  const askMarket = isFF ? 'futures' : 'spot'

  // ── WS-подключение ──────────────────────────────────────────────────────────
  useEffect(() => {
    const bidWs = connectOrderBook(bidExId, sym, 'futures', data => setBidBook(data))
    const askWs = connectOrderBook(askExId, sym, askMarket, data => setAskBook(data))
    return () => {
      bidWs.close()
      askWs.close()
    }
  }, [bidExId, askExId, sym, askMarket])

  // ESC для закрытия
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── VWAP-расчёты ────────────────────────────────────────────────────────────
  // Вход:
  // Short (продаём на бирже bid) → бьём по bids этой биржи
  // Buy   (покупаем на бирже ask) → бьём по asks этой биржи
  const vwapBid = bidBook ? calcVwap(bidBook.bids, tradeAmount) : null
  const vwapAsk = askBook ? calcVwap(askBook.asks, tradeAmount) : null

  // Выход (разворот для exit-spread):
  // Закрытие Short → покупаем на bid-бирже → asks
  // Закрытие Buy   → продаём на ask-бирже  → bids
  const vwapBidExit = bidBook ? calcVwap(bidBook.asks, tradeAmount) : null
  const vwapAskExit = askBook ? calcVwap(askBook.bids, tradeAmount) : null

  // Максимальный объём до VWAP-цены (для отображения в панелях)
  const maxVolBid = (bidBook && vwapAsk)
    ? calcMaxVolume(bidBook.bids, vwapAsk, 'short')
    : null
  const maxVolAsk = (askBook && vwapBid)
    ? calcMaxVolume(askBook.asks, vwapBid, 'long')
    : null

  // ── Калькулятор ─────────────────────────────────────────────────────────────
  const calcFilled = !!(
    avgBid && avgAsk &&
    parseFloat(avgBid) > 0 && parseFloat(avgAsk) > 0
  )

  // Итоговый спред входа:
  // bid = цена short-входа (продали на bid-бирже)
  // ask = цена long-входа (купили на ask-бирже)
  // entrySpread = (avgBid - avgAsk) / avgBid * 100
  // Положительный если bid > ask → правильная позиция → при закрытии будет прибыль.
  const avgBidNum = parseFloat(avgBid)
  const avgAskNum = parseFloat(avgAsk)
  const entrySpread = calcFilled
    ? (avgBidNum - avgAskNum) / avgBidNum * 100
    : null

  // Спред выхода:
  // Для закрытия: нужно купить на bid-бирже (по ask стакана) и продать на ask-бирже (по bid стакана)
  // exitSpread = (vwapAskExit - vwapBidExit) / vwapAskExit * 100
  // Стремится к 0% при идеальном выходе.
  // vwapBidExit = VWAP по asks bid-биржи (цена откупа short)
  // vwapAskExit = VWAP по bids ask-биржи (цена закрытия long)
  const exitSpread = (vwapBidExit && vwapAskExit)
    ? (vwapAskExit - vwapBidExit) / vwapAskExit * 100
    : null

  // Profit — текущая прибыль с учётом спреда входа и спреда выхода:
  // profit = (entrySpread - exitSpread) * tradeAmount / 100
  // Если exitSpread → 0, то profit ≈ entrySpread * tradeAmount / 100
  const livePnl = (entrySpread !== null && exitSpread !== null)
    ? (entrySpread - exitSpread) * tradeAmount / 100
    : entrySpread !== null
      ? entrySpread * tradeAmount / 100
      : null

  // Текущий profit (по базовому спреду из API, для сводки)
  const basePnl = (opp.spread * tradeAmount / 100)

  // ── Отображение стакана (смешанный) ─────────────────────────────────────────
  // asks — с ask-биржи (BUY side, зелёные) — отсортированы по возрастанию → берём первые N
  // bids — с bid-биржи (SHORT side, красные) — отсортированы по убыванию → берём первые N
  const askRows = askBook?.asks?.slice(0, OB_ROWS) ?? []
  const bidRows = bidBook?.bids?.slice(0, OB_ROWS) ?? []

  // Нормализация объёмов для баров
  const maxAskQty = askRows.reduce((m, [, q]) => Math.max(m, q), 0)
  const maxBidQty = bidRows.reduce((m, [, q]) => Math.max(m, q), 0)

  const bestBid = bidRows[0]?.[0] ?? null
  const bestAsk = askRows[0]?.[0] ?? null

  // ── Кнопка Торговать ─────────────────────────────────────────────────────────
  const limitReached = !isActiveTrade && tradeError

  const tradeBtnClass = isActiveTrade ? 'exit' : calcFilled ? 'ready' : 'default'
  const tradeBtnLabel = isActiveTrade ? 'ВЫХОД' : 'ТОРГОВАТЬ'

  const handleTradeClick = () => {
    if (isActiveTrade) {
      onRemoveTrade?.()
      onClose()
      return
    }
    if (limitReached) return
    if (calcFilled) {
      onTrade?.(opp, avgBid, avgAsk, askExName)
    } else {
      // Открываем терминалы если поля не заполнены
      const bidLinks = TERMINAL_LINKS[bidExName]
      const askLinks = TERMINAL_LINKS[askExName]
      if (bidLinks) window.open(bidLinks.futures(sym), '_blank')
      if (askLinks) window.open(isFF ? askLinks.futures(sym) : askLinks.spot(sym), '_blank')
    }
  }

  // Funding данные для панелей
  const bidFundingRate   = isFF ? opp.funding_rate_bid : opp.funding_rate
  const bidFundingTime   = isFF ? opp.next_funding_time_bid : opp.next_funding_time
  const askFundingRate   = isFF ? opp.funding_rate_ask : null
  const askFundingTime   = isFF ? opp.next_funding_time_ask : null

  const strategyLabel = isFF ? 'FUTURES · FUTURES' : 'SPOT · FUTURES'

  return (
    <>
      <style>{style}</style>
      <div className="fdm-overlay" onClick={onClose}>
        <div className="fdm" onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div className="fdm-head">
            <div className="fdm-sym">
              {base}<span>/{suffix}</span>
            </div>
            <div className="fdm-badge">{strategyLabel}</div>
            <div className="fdm-spacer" />
            <div className="fdm-spread-wrap">
              <div className="fdm-spread-val">{opp.spread?.toFixed(4)}%</div>
              <div className="fdm-spread-label">SPREAD</div>
            </div>
            <button className="fdm-btn close" onClick={onClose}>
              <X size={14} />
            </button>
          </div>

          {/* BODY */}
          <div className="fdm-body">

            {/* ── LEFT ── */}
            <div className="fdm-left">

              {/* Биржевые панели */}
              <div className="fdm-ex-pair">
                {/* SHORT side — bid-биржа */}
                <div
                  className="fdm-ex-panel short"
                  style={{ cursor: TERMINAL_LINKS[bidExName] ? 'pointer' : 'default' }}
                  onClick={() => {
                    const links = TERMINAL_LINKS[bidExName]
                    if (links) window.open(links.futures(sym), '_blank')
                  }}
                >
                  <div className="fdm-ex-tag short">SHORT FUTURES</div>
                  <div className="fdm-ex-name">{bidExName}</div>
                  <div className="fdm-ex-row">
                    <span>VWAP Bid</span>
                    <b>{vwapBid ? formatPrice(vwapBid) : '—'}</b>
                  </div>
                  <div className="fdm-ex-row">
                    <span>Макс. объём</span>
                    <b>{maxVolBid ? `$${formatVolume(maxVolBid.usd)}` : '—'}</b>
                  </div>
                  <div className="fdm-ex-funding">
                    <div>
                      <div className="fdm-ex-funding-label">Ставка funding</div>
                      <div className="fdm-ex-funding-rate">
                        {bidFundingRate != null
                          ? `${bidFundingRate >= 0 ? '+' : ''}${(bidFundingRate * 100).toFixed(4)}%`
                          : '—'
                        }
                      </div>
                    </div>
                    <LiveCountdown isoString={bidFundingTime} />
                  </div>
                </div>

                {/* BUY side — ask-биржа (spot для SF, futures для FF) */}
                <div
                  className="fdm-ex-panel buy"
                  style={{ cursor: TERMINAL_LINKS[askExName] ? 'pointer' : 'default' }}
                  onClick={() => {
                    const links = TERMINAL_LINKS[askExName]
                    if (links) window.open(isFF ? links.futures(sym) : links.spot(sym), '_blank')
                  }}
                >
                  <div className="fdm-ex-tag buy">
                    {isFF ? 'LONG FUTURES' : 'BUY SPOT'}
                  </div>
                  <div className="fdm-ex-name">{askExName}</div>
                  <div className="fdm-ex-row">
                    <span>VWAP Ask</span>
                    <b>{vwapAsk ? formatPrice(vwapAsk) : '—'}</b>
                  </div>
                  <div className="fdm-ex-row">
                    <span>Макс. объём</span>
                    <b>{maxVolAsk ? `$${formatVolume(maxVolAsk.usd)}` : '—'}</b>
                  </div>
                  <div className="fdm-ex-funding">
                    <div>
                      <div className="fdm-ex-funding-label">
                        {isFF ? 'Ставка funding' : 'Spot — без funding'}
                      </div>
                      <div className="fdm-ex-funding-rate" style={!isFF ? { color: 'var(--text-muted)' } : {}}>
                        {isFF && askFundingRate != null
                          ? `${askFundingRate >= 0 ? '+' : ''}${(askFundingRate * 100).toFixed(4)}%`
                          : '—'
                        }
                      </div>
                    </div>
                    {isFF
                      ? <LiveCountdown isoString={askFundingTime} />
                      : <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>hedge</span>
                    }
                  </div>
                </div>
              </div>

              {/* Смешанный стакан */}
              <div className="fdm-ob">
                <div className="fdm-ob-title">
                  <div className="fdm-ob-label">
                    Стакан — {askExName} asks / {bidExName} bids
                  </div>
                  <div className="fdm-ob-live">
                    <div className="fdm-ob-dot" />
                    LIVE
                  </div>
                </div>

                {(askRows.length === 0 && bidRows.length === 0) ? (
                  <div className="fdm-ob-empty">Подключаемся...</div>
                ) : (
                  <>
                    <div className="fdm-ob-head">
                      <span>Цена</span>
                      <span>Кол-во</span>
                      <span>USD</span>
                    </div>

                    {/* ASK строки — с ask-биржи (BUY side) */}
                    {[...askRows].reverse().map(([price, qty], i) => (
                      <ObRow key={`ask-${i}`} price={price} qty={qty} side="ask" maxQty={maxAskQty} />
                    ))}

                    <div className="fdm-ob-mid">
                      {bestBid ? formatPrice(bestBid) : '—'}
                      &nbsp;/&nbsp;
                      {bestAsk ? formatPrice(bestAsk) : '—'}
                    </div>

                    {/* BID строки — с bid-биржи (SHORT side) */}
                    {bidRows.map(([price, qty], i) => (
                      <ObRow key={`bid-${i}`} price={price} qty={qty} side="bid" maxQty={maxBidQty} />
                    ))}
                  </>
                )}
              </div>

              {/* VWAP сводка */}
              <div className="fdm-vwap">
                <div className="fdm-vwap-item">
                  <div className="fdm-vwap-label">VWAP Short (${tradeAmount})</div>
                  <div className="fdm-vwap-val bid">
                    {vwapBid ? formatPrice(vwapBid) : '—'}
                  </div>
                </div>
                <div className="fdm-vwap-sep" />
                <div className="fdm-vwap-item">
                  <div className="fdm-vwap-label">VWAP Buy (${tradeAmount})</div>
                  <div className="fdm-vwap-val ask">
                    {vwapAsk ? formatPrice(vwapAsk) : '—'}
                  </div>
                </div>
              </div>

            </div>

            {/* ── RIGHT ── */}
            <div className="fdm-right">

              {/* Сводка */}
              <div className="fdm-section">
                <div className="fdm-section-title">Сводка</div>
                <div className="fdm-stats">
                  <div className="fdm-stat">
                    <div className="fdm-stat-label">Profit</div>
                    <div className="fdm-stat-val ok">+${basePnl.toFixed(2)}</div>
                  </div>
                  <div className="fdm-stat">
                    <div className="fdm-stat-label">Funding In</div>
                    <div className="fdm-stat-val" style={{ color: '#ffffff' }}>
                      <LiveCountdown isoString={opp.next_funding_time} />
                    </div>
                  </div>
                  {isFF && (
                    <>
                      <div className="fdm-stat">
                        <div className="fdm-stat-label">Rate Short ({bidExName})</div>
                        <div className="fdm-stat-val" style={{ color: 'var(--error)' }}>
                          {bidFundingRate != null
                            ? `${bidFundingRate >= 0 ? '+' : ''}${(bidFundingRate * 100).toFixed(4)}%`
                            : '—'
                          }
                        </div>
                      </div>
                      <div className="fdm-stat">
                        <div className="fdm-stat-label">Rate Long ({askExName})</div>
                        <div className="fdm-stat-val" style={{ color: 'var(--success)' }}>
                          {askFundingRate != null
                            ? `${askFundingRate >= 0 ? '+' : ''}${(askFundingRate * 100).toFixed(4)}%`
                            : '—'
                          }
                        </div>
                      </div>
                    </>
                  )}
                  {!isFF && (
                    <div className="fdm-stat" style={{ gridColumn: '1 / -1' }}>
                      <div className="fdm-stat-label">Ставка финансирования ({bidExName})</div>
                      <div className="fdm-stat-val" style={{ color: 'var(--warning)' }}>
                        {opp.funding_rate != null
                          ? `${opp.funding_rate >= 0 ? '+' : ''}${(opp.funding_rate * 100).toFixed(4)}%`
                          : '—'
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Калькулятор */}
              <div className="fdm-section">
                <div className="fdm-section-title">Калькулятор входа / выхода</div>

                <div className="fdm-calc-row">
                  <div className="fdm-calc-field">
                    <div className="fdm-calc-label">
                      Avg Short — {bidExName}
                    </div>
                    <input
                      className="fdm-calc-input"
                      type="number"
                      placeholder={vwapBid ? formatPrice(vwapBid) : 'Цена входа'}
                      value={avgBid}
                      onChange={e => setAvgBid(e.target.value)}
                    />
                  </div>
                  <div className="fdm-calc-field">
                    <div className="fdm-calc-label">
                      Avg Buy — {askExName}
                    </div>
                    <input
                      className="fdm-calc-input"
                      type="number"
                      placeholder={vwapAsk ? formatPrice(vwapAsk) : 'Цена входа'}
                      value={avgAsk}
                      onChange={e => setAvgAsk(e.target.value)}
                    />
                  </div>
                </div>

                {calcFilled && (
                  <div className="fdm-calc-results">
                    <div className="fdm-calc-result">
                      <span className="fdm-calc-result-label">Итоговый спред входа</span>
                      <span
                        className="fdm-calc-result-val"
                        style={{ color: entrySpread >= 0 ? 'var(--success)' : 'var(--error)' }}
                      >
                        {entrySpread >= 0 ? '+' : ''}{entrySpread.toFixed(4)}%
                      </span>
                    </div>
                    <div className="fdm-calc-result">
                      <span className="fdm-calc-result-label">Спред выхода</span>
                      <span
                        className="fdm-calc-result-val"
                        style={{ color: exitSpread != null
                          ? exitSpread <= 0.05 ? 'var(--success)' : exitSpread <= 0.3 ? 'var(--warning)' : 'var(--error)'
                          : 'var(--text-muted)'
                        }}
                      >
                        {exitSpread != null
                          ? `${exitSpread >= 0 ? '+' : ''}${exitSpread.toFixed(4)}%`
                          : '—'
                        }
                      </span>
                    </div>
                    <div className="fdm-calc-result">
                      <span className="fdm-calc-result-label">P&L</span>
                      <span
                        className="fdm-calc-result-val"
                        style={{ color: livePnl != null
                          ? livePnl >= 0 ? 'var(--success)' : 'var(--error)'
                          : 'var(--text-muted)'
                        }}
                      >
                        {livePnl != null
                          ? `${livePnl >= 0 ? '+' : ''}$${livePnl.toFixed(2)}`
                          : '—'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Кнопка Торговать / Выход */}
              <div className="fdm-trade-area">
                <button
                  className={`fdm-trade-btn ${tradeBtnClass}`}
                  onClick={handleTradeClick}
                  disabled={!isActiveTrade && limitReached && !calcFilled}
                  title={limitReached ? 'Достигнут лимит 5 активных позиций' : undefined}
                >
                  {tradeBtnLabel}
                </button>
                {tradeError && (
                  <div className="fdm-trade-error">{tradeError}</div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default FundingDetailModal
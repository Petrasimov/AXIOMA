const style = `
  .dm-overlay {
    position: fixed; inset: 0;
    background: rgba(3,8,13,0.6);
    backdrop-filter: blur(9px);
    z-index: 300;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .dm-modal {
    background: rgba(13,32,51,0.74);
    backdrop-filter: blur(30px) saturate(160%);
    -webkit-backdrop-filter: blur(30px) saturate(160%);
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-xl);
    width: 1400px; max-width: 100%;
    box-shadow: 0 32px 96px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06);
    display: flex; flex-direction: column;
    max-height: 92vh;
    overflow: hidden;
  }

  /* HEADER */
  .dm-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 20px;
    background: #071828;
    border-bottom: 1px solid #0e2a42;
    flex-shrink: 0; gap: 12px;
  }
  .dm-header-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .dm-header-right { display: flex; align-items: center; gap: 6px; }
  .dm-symbol {
    font-family: var(--font-mono); font-size: 18px; font-weight: 800;
    color: #fff; letter-spacing: 1px;
  }
  .dm-strategy {
    font-size: 10px; font-weight: 600; letter-spacing: 2px;
    color: rgba(255,255,255,0.55);
    padding: 3px 11px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.05);
  }
  .dm-age-badge {
    font-family: var(--font-mono); font-size: 11px;
    color: rgba(255,255,255,0.4);
    border-left: 1px solid rgba(255,255,255,0.1);
    padding-left: 12px;
  }
  .dm-net {
    display: flex; align-items: baseline; gap: 7px; margin-left: auto; padding-right: 6px;
  }
  .dm-net-k { font-size: 9px; letter-spacing: 1.4px; color: var(--text-muted); text-transform: uppercase; }
  .dm-net-v { font-family: var(--font-mono); font-size: 20px; font-weight: 800; }
  .dm-btn {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: var(--radius-sm);
    color: rgba(255,255,255,0.65);
    cursor: pointer; width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .dm-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
  .dm-btn.fav-active { color: #f0a500; border-color: #f0a50066; background: rgba(240,165,0,0.1); }
  .dm-btn.close-btn:hover { background: rgba(224,62,62,0.2); border-color: var(--error); color: var(--error); }

  /* BODY — новая раскладка:
     верх: [кривая+водопад] [панели бирж] [монитор позиции]
     низ:  стакан во всю ширину */
  .dm-body {
    flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden;
    overscroll-behavior: contain;
    padding: 14px;
    display: flex; flex-direction: column; gap: 14px;
    scrollbar-width: thin;
    scrollbar-color: var(--accent-bright) rgba(255,255,255,0.05);
  }
  .dm-body::-webkit-scrollbar { width: 11px; }
  .dm-body::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 6px; }
  .dm-body::-webkit-scrollbar-thumb {
    background: var(--accent-bright); border-radius: 6px;
    border: 3px solid transparent; background-clip: padding-box;
  }
  .dm-body::-webkit-scrollbar-thumb:hover { background: #4a97d0; }

  .dm-top {
    display: grid; grid-template-columns: 1fr 360px 1fr;
    gap: 14px; align-items: start;
  }
  .dm-center { display: flex; flex-direction: column; gap: 10px; }
  .dm-side { display: flex; flex-direction: column; gap: 12px; }

  /* Универсальная карточка инструмента */
  .tool {
    background: var(--glass-fill);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-glass);
    overflow: hidden; display: flex; flex-direction: column;
  }
  .tool-h {
    display: flex; align-items: center; gap: 9px;
    padding: 10px 14px; border-bottom: 1px solid var(--glass-border);
    background: rgba(255,255,255,0.018); flex-shrink: 0;
  }
  .tool-t { font-size: 10.5px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; }
  .tool-sub { font-family: var(--font-mono); font-size: 9px; color: var(--text-muted); margin-left: auto; }
  .tool-b { padding: 13px 14px; }
  .tool-empty {
    padding: 26px 14px; text-align: center;
    font-size: 11.5px; color: var(--text-muted); line-height: 1.6;
  }

  /* EXCHANGE CARD */
  .ex-card {
    border: 1px solid; overflow: hidden;
    border-radius: var(--radius-md);
    position: relative; cursor: pointer;
    transition: box-shadow 0.15s, border-color 0.15s;
    backdrop-filter: blur(8px);
  }
  .ex-card::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    border-radius: 3px 0 0 3px;
  }
  .ex-card.buy { background: linear-gradient(135deg, rgba(0,201,122,0.09), rgba(0,201,122,0.02)); border-color: rgba(0,201,122,0.22); }
  .ex-card.buy:hover { border-color: rgba(0,201,122,0.45); box-shadow: inset 0 0 60px rgba(0,201,122,0.07); }
  .ex-card.buy::before { background: var(--success); box-shadow: 0 0 8px var(--success); }
  .ex-card.sell { background: linear-gradient(135deg, rgba(224,62,62,0.09), rgba(224,62,62,0.02)); border-color: rgba(224,62,62,0.22); }
  .ex-card.sell:hover { border-color: rgba(224,62,62,0.45); box-shadow: inset 0 0 60px rgba(224,62,62,0.07); }
  .ex-card.sell::before { background: var(--error); box-shadow: 0 0 8px var(--error); }
  .ex-inner { padding: 14px 16px 15px 19px; }
  .ex-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
  .ex-name { display: flex; align-items: center; gap: 8px; }
  .ex-logo { width: 22px; height: 22px; border-radius: 50%; object-fit: contain; flex-shrink: 0; }
  .ex-logo-fallback {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 8px; font-weight: 800; color: #000; flex-shrink: 0;
  }
  .ex-title { font-size: 13px; font-weight: 700; color: var(--text-primary); }
  .ex-role { font-size: 8px; letter-spacing: 1px; color: var(--text-muted); margin-top: 1px; }
  .ex-badge { font-size: 8px; letter-spacing: 1.5px; padding: 3px 8px; border: 1px solid; border-radius: 20px; font-weight: 700; }
  .ex-badge.buy { color: var(--success); border-color: rgba(0,201,122,0.35); }
  .ex-badge.sell { color: var(--error); border-color: rgba(224,62,62,0.35); }
  .ex-price {
    font-family: var(--font-mono); font-size: 24px; font-weight: 800;
    color: #ecebee; margin-bottom: 12px;
    padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); line-height: 1;
  }
  .ex-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
  .ex-m-label { font-size: 8.5px; letter-spacing: 1px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px; }
  .ex-m-val { font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary); font-weight: 500; }
  .ex-m-rate-row { display: flex; align-items: baseline; gap: 6px; }
  .ex-m-rate { font-family: var(--font-mono); font-size: 14px; font-weight: 700; }
  .ex-m-rate.green { color: var(--success); }
  .ex-m-rate.red   { color: var(--error); }
  .ex-m-time { font-family: var(--font-mono); font-size: 10px; color: var(--warning); }
  .ex-m-transfer { font-size: 12px; color: var(--text-secondary); }

  /* SPREAD SEPARATOR */
  .spread-sep {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 15px 13px 19px;
    background: var(--glass-fill);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-md);
  }
  .ss-left { display: flex; align-items: center; gap: 9px; }
  .ss-label { font-size: 8.5px; color: var(--text-secondary); letter-spacing: 1.5px; }
  .ss-val { font-family: var(--font-mono); font-size: 23px; font-weight: 700; }
  .ss-grade { font-size: 9px; font-weight: 700; letter-spacing: 2px; padding: 3px 9px; border: 1px solid; border-radius: 20px; }

  .trade-btn {
    padding: 11px 28px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    border-radius: var(--radius-sm);
    cursor: pointer; border: 1px solid; transition: all 0.15s;
    font-family: var(--font-sans); white-space: nowrap;
  }
  .trade-btn.default { color: var(--accent-bright); border-color: rgba(61,135,192,0.4); background: rgba(61,135,192,0.07); }
  .trade-btn.default:hover { background: rgba(61,135,192,0.15); }
  .trade-btn.ready { color: #000; border-color: var(--success); background: var(--success); }
  .trade-btn.ready:hover { background: #00e88a; border-color: #00e88a; }
  .trade-btn.exit { color: #fff; border-color: var(--error); background: var(--error); }
  .trade-btn.exit:hover { background: #ff4f4f; }

  /* ── СТАКАН (MEXC-стиль): два вертикальных стакана рядом ── */
  .ob { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .ob-col { display: flex; flex-direction: column; min-width: 0; }
  .ob-col-h {
    display: flex; align-items: center; gap: 8px;
    padding-bottom: 9px; margin-bottom: 8px;
    border-bottom: 1px solid var(--glass-border);
  }
  .ob-col-name { font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
  .ob-col-role {
    margin-left: auto; font-family: var(--font-mono); font-size: 8.5px;
    letter-spacing: 1px; padding: 3px 9px; border-radius: 20px; border: 1px solid; font-weight: 700;
  }
  .ob-col-role.sell { color: var(--error); border-color: rgba(224,62,62,0.4); background: rgba(224,62,62,0.06); }
  .ob-col-role.buy  { color: var(--success); border-color: rgba(0,201,122,0.4); background: rgba(0,201,122,0.06); }

  .ob-cols {
    display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 8px;
    padding: 0 10px 7px; font-size: 8.5px; letter-spacing: 0.6px;
    text-transform: uppercase; color: var(--text-muted);
  }
  .ob-cols span:nth-child(2), .ob-cols span:nth-child(3) { text-align: right; }

  .ob-row {
    display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 8px;
    position: relative; height: 26px; align-items: center;
    padding: 0 10px; font-family: var(--font-mono); font-size: 11.5px;
  }
  .ob-bar {
    position: absolute; top: 3px; bottom: 3px; right: 0;
    border-radius: 3px; opacity: 0.14; pointer-events: none;
  }
  .ob-col.sell .ob-bar { background: var(--error); }
  .ob-col.buy  .ob-bar { background: var(--success); }
  .ob-row.zone { background: rgba(240,165,0,0.09); border-radius: 4px; }
  .ob-row.zone .ob-p { color: var(--warning); }
  .ob-p { position: relative; font-weight: 700; }
  .ob-col.sell .ob-p { color: var(--error); }
  .ob-col.buy  .ob-p { color: var(--success); }
  .ob-q { position: relative; text-align: right; color: var(--text-secondary); font-size: 10.5px; }
  .ob-t { position: relative; text-align: right; color: var(--text-primary); font-weight: 600; }

  .ob-empty-col { padding: 22px 10px; text-align: center; font-size: 10.5px; color: var(--text-muted); }
  .ob-foot {
    display: flex; gap: 18px; flex-wrap: wrap; margin-top: 12px; padding: 10px 12px;
    border-top: 1px solid var(--glass-border);
    font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);
  }
  .ob-foot b { color: var(--text-primary); font-size: 11.5px; }
  .ob-foot .zone-b { color: var(--warning); }

  /* ── КРИВАЯ ИСПОЛНЕНИЯ ── */
  .curve-legend {
    display: flex; gap: 13px; font-family: var(--font-mono); font-size: 8.5px;
    color: var(--text-muted); margin-top: 8px; flex-wrap: wrap;
  }
  .curve-legend i { display: inline-block; width: 13px; height: 2px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }

  /* ── МОНИТОР ПОЗИЦИИ ── */
  .pos-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 12px; }
  .pos-in-l { font-size: 8.5px; letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px; }
  .pos-in {
    width: 100%; padding: 9px 11px; border-radius: var(--radius-sm);
    font-family: var(--font-mono); font-size: 12.5px; font-weight: 700;
    background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
    color: var(--text-primary); outline: none; box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .pos-in:focus { border-color: var(--accent-bright); box-shadow: 0 0 0 3px rgba(61,135,192,0.15); }
  .pos-in.s { border-left: 2px solid var(--error); }
  .pos-in.b { border-left: 2px solid var(--success); }
  .pos-leg {
    padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 8px;
    background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border);
  }
  .pos-leg.s { border-left: 2px solid var(--error); }
  .pos-leg.b { border-left: 2px solid var(--success); }
  .pos-leg-top { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
  .pos-leg-name { font-size: 11px; font-weight: 700; }
  .pos-leg-dir { font-family: var(--font-mono); font-size: 9px; font-weight: 800; letter-spacing: 1px; }
  .pos-leg-pnl { margin-left: auto; font-family: var(--font-mono); font-size: 12.5px; font-weight: 800; }
  .pos-leg-prices { display: flex; gap: 6px; align-items: center; font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); }
  .pos-leg-prices s { color: var(--text-muted); text-decoration: none; }
  .pos-bar { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.05); margin-top: 7px; overflow: hidden; }
  .pos-bar i { display: block; height: 100%; border-radius: 3px; }
  .pos-sum {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px;
    padding: 11px 0; border-top: 1px solid var(--glass-border); margin-top: 3px;
  }
  .pos-sum-k { font-size: 8.5px; letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 3px; }
  .pos-sum-v { font-family: var(--font-mono); font-size: 14.5px; font-weight: 800; }
  .pos-hint {
    display: flex; gap: 8px; padding: 8px 11px; border-radius: var(--radius-sm);
    font-size: 10.5px; line-height: 1.5;
    background: rgba(0,201,122,0.07); border: 1px solid rgba(0,201,122,0.25); color: var(--success);
  }
  .pos-hint.warn { background: rgba(240,165,0,0.07); border-color: rgba(240,165,0,0.25); color: var(--warning); }
  .pos-hint.neutral { background: rgba(61,135,192,0.07); border-color: rgba(61,135,192,0.25); color: var(--text-secondary); }

  /* ══════════════════════════════════════════════════════════════
     МОБИЛЬНАЯ АДАПТАЦИЯ
     ══════════════════════════════════════════════════════════════
     .dm-top — сетка "1fr | 300px | 1fr". На телефоне даже одна
     центральная колонка шире экрана, поэтому три колонки
     схлопываются в одну. Порядок задаётся order: панели бирж
     поднимаются наверх (это главное что нужно увидеть сразу),
     затем монитор позиции, затем кривая с водопадом.
     Стакан остаётся последним — он и так снизу.
  */
  @media (max-width: 1100px) {
    .dm-top { grid-template-columns: 1fr; }
    .dm-top > .dm-center { order: 1; }
    .dm-top > .dm-side-right { order: 2; }
    .dm-top > .dm-side-left { order: 3; }
  }

  @media (max-width: 768px) {
    .dm-overlay { padding: 0; align-items: stretch; }
    .dm-modal {
      width: 100%; max-width: 100%; height: 100%; max-height: 100dvh;
      border-radius: 0;
      /* 30px blur ощутимо просаживает FPS на мобильном GPU */
      backdrop-filter: blur(16px) saturate(160%);
      -webkit-backdrop-filter: blur(16px) saturate(160%);
    }
    .dm-header {
      padding: 12px 14px;
      padding-top: calc(12px + env(safe-area-inset-top));
    }
    .dm-btn { width: 40px; height: 40px; }
    .dm-net-v { font-size: 17px; }
    .dm-body {
      padding: 12px;
      padding-bottom: calc(12px + env(safe-area-inset-bottom));
      -webkit-overflow-scrolling: touch;
    }
    .pos-inputs { grid-template-columns: 1fr; }
    .pos-sum { grid-template-columns: 1fr 1fr; }
    /* Два стакана рядом не влезают по ширине — ставим их друг под другом */
    .ob { grid-template-columns: 1fr; gap: 18px; }
    .ob-row { height: 30px; }
  }

  @media (max-width: 480px) {
    .dm-symbol { font-size: 16px; }
    .dm-strategy { font-size: 9px; padding: 3px 9px; }
    /* Возраст возможности — второстепенная деталь при таком дефиците места */
    .dm-age-badge { display: none; }
    .pos-sum { grid-template-columns: 1fr; }
  }
`

import { useState, useEffect, useMemo } from 'react'
import { Star, Trash2, X } from 'lucide-react'
import { connectOrderBook } from '../ws.js'
import {
  getExchangeInfo, getSpreadColor, getSpreadGrade,
  formatPrice, formatVolume, formatAge, formatTimeRemaining, calcMaxVolume, calcVwap
} from '../utils.js'

const STRATEGY_NAMES = { ff: 'FUTURES-FUTURES', sf: 'SPOT-FUTURES' }

// Taker-комиссии бирж в процентах за одну сделку (базовые публичные ставки).
// Используются только для оценки «что останется» — реальная ставка зависит
// от VIP-уровня и holdings, поэтому цифры намеренно консервативные.
const TAKER_FEES = {
  binance: 0.05,
  bybit:   0.055,
  okx:     0.05,
  gate:    0.05,
  kucoin:  0.06,
  mexc:    0.02,
  bingx:   0.05,
  bitget:  0.06,
}
const DEFAULT_FEE = 0.055

function takerFee(exId) {
  return TAKER_FEES[String(exId).toLowerCase()] ?? DEFAULT_FEE
}

// Точки объёма для кривой исполнения
const CURVE_STEPS = [100, 250, 500, 1000, 2500, 5000, 10000, 20000]

// ─── Logo с fallback ──────────────────────────────────────────────────────────
function ExLogo({ info }) {
  const [err, setErr] = useState(false)
  if (!err && info.logo) {
    return (
      <img
        className="ex-logo"
        src={info.logo}
        alt={info.name}
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div className="ex-logo-fallback" style={{ background: info.color }}>
      {info.short}
    </div>
  )
}

// ─── Exchange Card ────────────────────────────────────────────────────────────
function ExCard({ side, opp, book, livePrice, refPrice }) {
  const ex = side === 'bid' ? opp.bid_ex : opp.ask_ex
  const info = getExchangeInfo(ex)
  const price = side === 'bid' ? opp.bid_price : opp.ask_price
  const funding = side === 'bid' ? opp.bid_funding : opp.ask_funding
  const volume = side === 'bid' ? opp.bid_volume : opp.ask_volume
  const transfer = side === 'bid' ? opp.bid_transfer : opp.ask_transfer
  const isBuy = side === 'ask'

  const sym = opp.symbol.replace(/USDT$/, '')
  const url = isBuy
    ? (opp.strategy === 'sf' ? info.spotUrl?.(sym) : info.futuresUrl?.(sym))
    : info.futuresUrl?.(sym)

  const displayPrice = livePrice ?? price

  // bid-карточка (SELL): объём доступных покупателей → bids
  // ask-карточка (BUY):  объём доступных продавцов   → asks
  const maxVol = book && refPrice
    ? calcMaxVolume(isBuy ? book.asks : book.bids, refPrice, isBuy ? 'long' : 'short')
    : null

  const fundRate = funding?.rate ?? 0

  return (
    <div
      className={`ex-card ${isBuy ? 'buy' : 'sell'}`}
      onClick={() => url && window.open(url, '_blank')}
      title={`Открыть ${info.name}`}
    >
      <div className="ex-inner">
        <div className="ex-top">
          <div className="ex-name">
            <ExLogo info={info} />
            <div>
              <div className="ex-title">{info.name}</div>
              <div className="ex-role">{side === 'bid' ? 'BID EXCHANGE' : 'ASK EXCHANGE'}</div>
            </div>
          </div>
          <span className={`ex-badge ${isBuy ? 'buy' : 'sell'}`}>
            {isBuy ? 'BUY / LONG' : 'SELL / SHORT'}
          </span>
        </div>

        <div className="ex-price">${formatPrice(displayPrice)}</div>

        <div className="ex-metrics">
          <div className="ex-m-block">
            <div className="ex-m-label">Объём 24h</div>
            <div className="ex-m-val">{formatVolume(volume)}</div>
          </div>
          <div className="ex-m-block">
            <div className="ex-m-label">Макс. объём</div>
            <div className="ex-m-val">{maxVol ? '$' + formatVolume(maxVol.usd) : '—'}</div>
          </div>
          <div className="ex-m-block">
            <div className="ex-m-label">Ставка финансирования</div>
            <div className="ex-m-rate-row">
              <span className={`ex-m-rate ${fundRate >= 0 ? 'green' : 'red'}`}>
                {fundRate >= 0 ? '+' : ''}{fundRate.toFixed(4)}%
              </span>
              <span className="ex-m-time">{formatTimeRemaining(funding?.next_time)}</span>
            </div>
          </div>
          <div className="ex-m-block">
            <div className="ex-m-label">Перевод</div>
            <div className="ex-m-transfer">
              W: {transfer?.withdraw ? '✅' : '❌'} &nbsp; D: {transfer?.deposit ? '✅' : '❌'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Стакан в стиле биржи (два вертикальных стакана рядом) ─────────────────────
// Левый — биржа bid_ex, где мы ПРОДАЁМ (её bids). Правый — ask_ex, где мы
// ПОКУПАЕМ (её asks). Колонки Цена / Кол-во / Сумма выровнены, глубина показана
// накопительной полосой — как в терминале любой биржи. Уровни, по которым
// реально идёт арбитраж (зона пересечения), подсвечены.
function fmtQty(q) {
  if (!isFinite(q)) return '—'
  if (q >= 1000) return formatVolume(q)
  if (q >= 1) return q.toFixed(2)
  return q.toPrecision(3)
}

function OrderBookLadder({ bidBook, askBook, bidEx, askEx, depth = 8 }) {
  const bidInfo = getExchangeInfo(bidEx)
  const askInfo = getExchangeInfo(askEx)

  const data = useMemo(() => {
    const bids = (bidBook?.bids ?? []).slice(0, depth)
      .map(([p, q]) => ({ p: parseFloat(p), q: parseFloat(q) }))
      .filter(l => l.p > 0 && l.q > 0)
    const asks = (askBook?.asks ?? []).slice(0, depth)
      .map(([p, q]) => ({ p: parseFloat(p), q: parseFloat(q) }))
      .filter(l => l.p > 0 && l.q > 0)

    if (!bids.length && !asks.length) return null

    const bestAsk = asks[0]?.p ?? Infinity
    const bestBid = bids[0]?.p ?? -Infinity

    // Накопительный объём по стороне → ширина depth-полосы (как в терминале):
    // нижняя строка = вся видимая глубина = 100%.
    const withCum = (rows, zoneFn) => {
      let cum = 0
      const total = rows.reduce((s, l) => s + l.p * l.q, 0) || 1
      return rows.map(l => {
        const usd = l.p * l.q
        cum += usd
        return { ...l, usd, cumPct: cum / total * 100, zone: zoneFn(l.p) }
      })
    }
    // Продаём выше лучшего ask и покупаем ниже лучшего bid → это и есть профит
    const bidRows = withCum(bids, p => p > bestAsk)
    const askRows = withCum(asks, p => p < bestBid)

    const bidZoneUsd = bidRows.filter(r => r.zone).reduce((s, r) => s + r.usd, 0)
    const askZoneUsd = askRows.filter(r => r.zone).reduce((s, r) => s + r.usd, 0)
    // Реально доступный объём — минимум из двух сторон.
    const overlapUsd = Math.min(bidZoneUsd, askZoneUsd)

    // «Стенка» — крупнейший уровень на стороне покупки.
    const wall = askRows.reduce((best, r) => (r.usd > (best?.usd ?? 0) ? r : best), null)

    return {
      bidRows, askRows, overlapUsd, wall,
      zoneLevels: bidRows.filter(r => r.zone).length + askRows.filter(r => r.zone).length,
    }
  }, [bidBook, askBook, depth])

  if (!data) {
    return (
      <div className="tool">
        <div className="tool-h"><span className="tool-t">Стакан</span></div>
        <div className="tool-empty">Ждём данные стакана обеих бирж…</div>
      </div>
    )
  }

  const { bidRows, askRows, overlapUsd, wall, zoneLevels } = data

  const renderColumn = (info, rows, kind, roleLabel) => (
    <div className={`ob-col ${kind}`}>
      <div className="ob-col-h">
        <ExLogo info={info} />
        <span className="ob-col-name">{info.name}</span>
        <span className={`ob-col-role ${kind}`}>{roleLabel}</span>
      </div>
      <div className="ob-cols">
        <span>Цена</span><span>Кол-во</span><span>Сумма $</span>
      </div>
      {rows.length ? rows.map((r, i) => (
        <div key={i} className={`ob-row ${r.zone ? 'zone' : ''}`}>
          <span className="ob-bar" style={{ width: `${Math.max(3, r.cumPct)}%` }} />
          <span className="ob-p">{formatPrice(r.p)}</span>
          <span className="ob-q">{fmtQty(r.q)}</span>
          <span className="ob-t">${formatVolume(r.usd)}</span>
        </div>
      )) : (
        <div className="ob-empty-col">нет данных</div>
      )}
    </div>
  )

  return (
    <div className="tool">
      <div className="tool-h">
        <span className="tool-t">Стакан</span>
        <span className="tool-sub">{bidInfo.name} ↔ {askInfo.name}</span>
      </div>
      <div className="tool-b">
        <div className="ob">
          {renderColumn(bidInfo, bidRows, 'sell', 'ПРОДАЁМ · BID')}
          {renderColumn(askInfo, askRows, 'buy', 'ПОКУПАЕМ · ASK')}
        </div>

        <div className="ob-foot">
          <span>доступно в зоне <b className="zone-b">${formatVolume(overlapUsd)}</b></span>
          {wall && <span>стенка {askInfo.name} <b>{formatPrice(wall.p)}</b> · ${formatVolume(wall.usd)}</span>}
          <span>уровней в зоне <b>{zoneLevels}</b></span>
        </div>
      </div>
    </div>
  )
}

// ─── Кривая исполнения ────────────────────────────────────────────────────────
// Отвечает на вопрос «какой спред я реально получу на СВОЙ объём».
// Чем больше позиция, тем глубже приходится идти по стакану и тем хуже
// средняя цена исполнения — кривая показывает эту деградацию наглядно
// и даёт предельный объём, после которого сделка уходит в минус.
function ExecutionCurve({ bidBook, askBook, tradeAmount, feeTotal }) {
  const data = useMemo(() => {
    if (!bidBook?.bids?.length || !askBook?.asks?.length) return null

    const points = []
    for (const usd of CURVE_STEPS) {
      const vb = calcVwap(bidBook.bids, usd)
      const va = calcVwap(askBook.asks, usd)
      // null означает что стакана не хватает на такой объём — дальше не идём
      if (!vb || !va) break
      const gross = (vb - va) / vb * 100
      points.push({ usd, net: gross - feeTotal })
    }
    if (points.length < 2) return null

    // Спред на объёме пользователя
    const vbUser = calcVwap(bidBook.bids, tradeAmount)
    const vaUser = calcVwap(askBook.asks, tradeAmount)
    const userNet = (vbUser && vaUser)
      ? (vbUser - vaUser) / vbUser * 100 - feeTotal
      : null

    // Предельный объём — линейная интерполяция между последней прибыльной
    // и первой убыточной точкой
    let breakEvenUsd = null
    for (let i = 1; i < points.length; i++) {
      if (points[i - 1].net > 0 && points[i].net <= 0) {
        const a = points[i - 1], b = points[i]
        const k = a.net / (a.net - b.net)
        breakEvenUsd = a.usd + (b.usd - a.usd) * k
        break
      }
    }

    return { points, userNet, breakEvenUsd, maxUsd: points[points.length - 1].usd }
  }, [bidBook, askBook, tradeAmount, feeTotal])

  if (!data) {
    return (
      <div className="tool">
        <div className="tool-h"><span className="tool-t">Кривая исполнения</span></div>
        <div className="tool-empty">Ждём данные стакана…</div>
      </div>
    )
  }

  const { points, userNet, maxUsd } = data

  // ── Геометрия SVG ──
  const W = 320, H = 170, padL = 34, padR = 12, padT = 12, padB = 24
  const iw = W - padL - padR, ih = H - padT - padB

  const logMin = Math.log10(points[0].usd)
  const logMax = Math.log10(maxUsd)
  const yVals = points.map(p => p.net)
  const yMax = Math.max(...yVals, 0.5) * 1.1
  const yMin = Math.min(...yVals, 0) * 1.1 - 0.1

  const X = v => padL + (Math.log10(v) - logMin) / (logMax - logMin || 1) * iw
  const Y = v => padT + (yMax - v) / (yMax - yMin || 1) * ih

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.usd).toFixed(1)},${Y(p.net).toFixed(1)}`).join(' ')
  const area = `${line} L${X(maxUsd).toFixed(1)},${Y(yMin).toFixed(1)} L${X(points[0].usd).toFixed(1)},${Y(yMin).toFixed(1)} Z`

  const xTicks = points.filter((_, i) => i % 2 === 0)
  const yTicks = [yMax, yMax / 2, 0].filter(v => v >= yMin)

  const userX = tradeAmount >= points[0].usd && tradeAmount <= maxUsd ? X(tradeAmount) : null

  return (
    <div className="tool">
      <div className="tool-h">
        <span className="tool-t">Кривая исполнения</span>
        <span className="tool-sub">спред vs объём</span>
      </div>
      <div className="tool-b">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="ecGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-bright)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent-bright)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((v, i) => (
            <g key={`y${i}`}>
              <line x1={padL} y1={Y(v)} x2={padL + iw} y2={Y(v)} stroke="var(--chart-grid)" strokeWidth="1" />
              <text x={padL - 6} y={Y(v) + 3} fill="var(--chart-label)" fontSize="8.5"
                    fontFamily="var(--font-mono)" textAnchor="end">
                {v.toFixed(1)}%
              </text>
            </g>
          ))}

          {xTicks.map((p, i) => (
            <g key={`x${i}`}>
              <line x1={X(p.usd)} y1={padT} x2={X(p.usd)} y2={padT + ih} stroke="var(--chart-axis)" strokeWidth="1" />
              <text x={X(p.usd)} y={H - 7} fill="var(--chart-label)" fontSize="8.5"
                    fontFamily="var(--font-mono)" textAnchor="middle">
                {p.usd >= 1000 ? `$${p.usd / 1000}K` : `$${p.usd}`}
              </text>
            </g>
          ))}

          {/* Зона убытка — всё что ниже нуля */}
          {yMin < 0 && (
            <>
              <rect x={padL} y={Y(0)} width={iw} height={padT + ih - Y(0)} fill="var(--error)" opacity="0.07" />
              <line x1={padL} y1={Y(0)} x2={padL + iw} y2={Y(0)}
                    stroke="var(--error)" strokeWidth="1" strokeDasharray="3 3" opacity="0.75" />
            </>
          )}

          <path d={area} fill="url(#ecGrad)" />
          <path d={line} fill="none" stroke="var(--accent-bright)" strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />

          {userX !== null && userNet !== null && (
            <>
              <line x1={userX} y1={padT} x2={userX} y2={padT + ih}
                    stroke="var(--warning)" strokeWidth="1" strokeDasharray="2 3" opacity="0.8" />
              <circle cx={userX} cy={Y(userNet)} r="4.5" fill="var(--warning)"
                      stroke="var(--chart-dot-stroke)" strokeWidth="2" />
            </>
          )}
        </svg>

        <div className="curve-legend">
          <span><i style={{ background: 'var(--accent-bright)' }} />чистый спред</span>
          <span><i style={{ background: 'var(--error)' }} />безубыток</span>
          <span><i style={{ background: 'var(--warning)' }} />твой объём</span>
        </div>
      </div>
    </div>
  )
}

// ─── Монитор позиции + калькулятор выхода ─────────────────────────────────────
// Два инструмента слиты в один: без введённых цен входа монитор показывать
// нечего, а сам по себе калькулятор без разбивки по ногам мало что объясняет.
function PositionMonitor({
  opp, tradeAmount,
  avgShort, avgLong, onAvgShort, onAvgLong,
  curBidExit, curAskExit, spreadNow,
  feeTotal,
}) {
  const bidInfo = getExchangeInfo(opp.bid_ex)
  const askInfo = getExchangeInfo(opp.ask_ex)

  const nShort = parseFloat(avgShort)
  const nLong  = parseFloat(avgLong)
  const filled = !!(nShort > 0 && nLong > 0)

  const calc = useMemo(() => {
    if (!filled) return null

    const entrySpread = (nShort - nLong) / nShort * 100

    // SHORT прибылен когда цена падает, LONG — когда растёт
    const shortPct = (nShort - curBidExit) / nShort * 100
    const longPct  = (curAskExit - nLong) / nLong * 100

    // Половина капитала в каждой ноге
    const legAmount = tradeAmount / 2
    const shortPnl = shortPct * legAmount / 100
    const longPnl  = longPct  * legAmount / 100

    // Спред выхода: сколько ещё осталось до схождения цен
    const exitSpread = (curBidExit - curAskExit) / curBidExit * 100
    const totalPnl = shortPnl + longPnl

    // Сколько движения уже отработано
    const progress = entrySpread > 0
      ? Math.max(0, Math.min(100, (entrySpread - exitSpread) / entrySpread * 100))
      : 0

    return {
      entrySpread, shortPct, longPct, shortPnl, longPnl,
      exitSpread, totalPnl, progress,
      breakEven: feeTotal,
    }
  }, [filled, nShort, nLong, curBidExit, curAskExit, tradeAmount, feeTotal])

  return (
    <div className="tool">
      <div className="tool-h">
        <span className="tool-t">Позиция и выход</span>
        <span className="tool-sub">
          {filled ? `спред сейчас ${spreadNow.toFixed(2)}%` : 'введи цены входа'}
        </span>
      </div>
      <div className="tool-b">

        <div className="pos-inputs">
          <div>
            <div className="pos-in-l">Avg Short — вход BID (SELL)</div>
            <input
              className="pos-in s"
              type="number"
              placeholder={formatPrice(opp.bid_price)}
              value={avgShort}
              onChange={e => onAvgShort(e.target.value)}
            />
          </div>
          <div>
            <div className="pos-in-l">Avg Long — вход ASK (BUY)</div>
            <input
              className="pos-in b"
              type="number"
              placeholder={formatPrice(opp.ask_price)}
              value={avgLong}
              onChange={e => onAvgLong(e.target.value)}
            />
          </div>
        </div>

        {!calc && (
          <div className="pos-hint neutral">
            Введи средние цены входа по обеим ногам — покажу P&amp;L каждой стороны,
            спред выхода и точку безубытка.
          </div>
        )}

        {calc && (
          <>
            <div className="pos-leg s">
              <div className="pos-leg-top">
                <span className="pos-leg-name">{bidInfo.name}</span>
                <span className="pos-leg-dir" style={{ color: 'var(--error)' }}>SHORT</span>
                <span className="pos-leg-pnl" style={{ color: calc.shortPnl >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {calc.shortPnl >= 0 ? '+' : ''}${calc.shortPnl.toFixed(2)}
                </span>
              </div>
              <div className="pos-leg-prices">
                <s>{formatPrice(nShort)}</s> → {formatPrice(curBidExit)}
                <span style={{ color: calc.shortPct >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {calc.shortPct >= 0 ? '+' : ''}{calc.shortPct.toFixed(2)}%
                </span>
              </div>
              <div className="pos-bar">
                <i style={{
                  width: `${Math.min(100, Math.abs(calc.shortPct) * 20)}%`,
                  background: calc.shortPct >= 0 ? 'var(--success)' : 'var(--error)',
                }} />
              </div>
            </div>

            <div className="pos-leg b">
              <div className="pos-leg-top">
                <span className="pos-leg-name">{askInfo.name}</span>
                <span className="pos-leg-dir" style={{ color: 'var(--success)' }}>LONG</span>
                <span className="pos-leg-pnl" style={{ color: calc.longPnl >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {calc.longPnl >= 0 ? '+' : ''}${calc.longPnl.toFixed(2)}
                </span>
              </div>
              <div className="pos-leg-prices">
                <s>{formatPrice(nLong)}</s> → {formatPrice(curAskExit)}
                <span style={{ color: calc.longPct >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {calc.longPct >= 0 ? '+' : ''}{calc.longPct.toFixed(2)}%
                </span>
              </div>
              <div className="pos-bar">
                <i style={{
                  width: `${Math.min(100, Math.abs(calc.longPct) * 20)}%`,
                  background: calc.longPct >= 0 ? 'var(--success)' : 'var(--error)',
                }} />
              </div>
            </div>

            <div className="pos-sum">
              <div>
                <div className="pos-sum-k">спред входа</div>
                <div className="pos-sum-v" style={{ color: 'var(--text-muted)' }}>
                  {calc.entrySpread.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="pos-sum-k">спред выхода</div>
                <div className="pos-sum-v" style={{ color: getSpreadColor(calc.exitSpread) }}>
                  {calc.exitSpread.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="pos-sum-k">чистый P&amp;L</div>
                <div className="pos-sum-v" style={{ color: calc.totalPnl >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {calc.totalPnl >= 0 ? '+' : ''}${calc.totalPnl.toFixed(2)}
                </div>
              </div>
            </div>

            {calc.exitSpread <= calc.breakEven ? (
              <div className="pos-hint">
                ✓ Спред сошёлся до {calc.exitSpread.toFixed(2)}% — ниже точки безубытка
                ({calc.breakEven.toFixed(2)}%). Движение отработано, можно закрывать.
              </div>
            ) : (
              <div className="pos-hint warn">
                ⏳ Отработано {calc.progress.toFixed(0)}% движения. Безубыточный выход —
                при спреде {calc.breakEven.toFixed(2)}%.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
function DetailModal({
  opp, tradeAmount, onClose,
  isFavorite, onFavorite, onHide,
  onTrade, initialAvgLong, initialAvgShort, isActiveTrade, onRemoveTrade,
  tradeError,
}) {
  const [bidBook, setBidBook] = useState(null)
  const [askBook, setAskBook] = useState(null)
  const [avgLong, setAvgLong] = useState(initialAvgLong || '')
  const [avgShort, setAvgShort] = useState(initialAvgShort || '')

  // ВХОД — открываем позицию:
  // SELL на bid-бирже → бьём по bids (покупатели готовы купить у нас)
  // BUY  на ask-бирже → бьём по asks (продавцы готовы продать нам)
  const vwapBid = bidBook ? calcVwap(bidBook.bids, tradeAmount) : null
  const vwapAsk = askBook ? calcVwap(askBook.asks, tradeAmount) : null

  // ВЫХОД — закрываем позицию (разворот):
  // Закрытие SHORT на bid-бирже → покупаем → бьём по asks
  // Закрытие LONG  на ask-бирже → продаём  → бьём по bids
  const vwapBidExit = bidBook ? calcVwap(bidBook.asks, tradeAmount) : null
  const vwapAskExit = askBook ? calcVwap(askBook.bids, tradeAmount) : null

  const liveSpread = (vwapBid && vwapAsk)
    ? (vwapBid - vwapAsk) / vwapBid * 100
    : opp.spread

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const sym = opp.symbol.replace(/USDT$/, '')
    const bidMarket = opp.bid_market || (opp.strategy === 'sf' ? 'spot' : 'futures')
    const askMarket = opp.ask_market || 'futures'
    const bidWs = connectOrderBook(opp.bid_ex, sym, bidMarket, data => {
      setBidBook(data)
    })
    const askWs = connectOrderBook(opp.ask_ex, sym, askMarket, data => {
      setAskBook(data)
    })
    return () => { bidWs.close(); askWs.close() }
  }, [opp.bid_ex, opp.ask_ex, opp.symbol, opp.strategy])

  const curBid     = vwapBid     ?? opp.bid_price
  const curAsk     = vwapAsk     ?? opp.ask_price
  const curBidExit = vwapBidExit ?? opp.bid_price
  const curAskExit = vwapAskExit ?? opp.ask_price

  const spreadColor = getSpreadColor(liveSpread)
  const spreadGrade = getSpreadGrade(liveSpread)
  const bidInfo = getExchangeInfo(opp.bid_ex)
  const askInfo = getExchangeInfo(opp.ask_ex)
  const sym = opp.symbol.replace(/USDT$/, '')

  // ── Разбор потерь ──
  const feeBid = takerFee(opp.bid_ex)
  const feeAsk = takerFee(opp.ask_ex)
  // Вход и выход — по сделке на каждой бирже, значит комиссия берётся дважды
  const feeTotal = (feeBid + feeAsk) * 2

  // Проскальзывание — разница между ценой верхнего уровня стакана и VWAP
  // на объём пользователя. Ровно то, что теряется на глубине.
  const slipIn = useMemo(() => {
    const topBid = parseFloat(bidBook?.bids?.[0]?.[0] ?? 0)
    const topAsk = parseFloat(askBook?.asks?.[0]?.[0] ?? 0)
    if (!topBid || !topAsk || !vwapBid || !vwapAsk) return 0
    const gross = (topBid - topAsk) / topBid * 100
    const real  = (vwapBid - vwapAsk) / vwapBid * 100
    return Math.max(0, gross - real)
  }, [bidBook, askBook, vwapBid, vwapAsk])

  // Выход стоит примерно столько же — считаем симметрично
  const slipOut = slipIn

  // Фандинг за одно начисление: платим по короткой ноге, получаем по длинной
  const fundingCost = useMemo(() => {
    const bidRate = opp.bid_funding?.rate ?? 0
    const askRate = opp.ask_funding?.rate ?? 0
    // SHORT платит при положительной ставке, LONG получает — и наоборот
    return Math.max(0, bidRate) + Math.max(0, -askRate)
  }, [opp.bid_funding, opp.ask_funding])

  const grossSpread = liveSpread
  const netSpread = grossSpread - slipIn - slipOut - feeBid * 2 - feeAsk * 2 - fundingCost

  const calcFilled = !!(avgLong && avgShort && parseFloat(avgLong) > 0 && parseFloat(avgShort) > 0)

  const handleTradeBtn = () => {
    if (isActiveTrade) {
      onRemoveTrade?.()
    } else if (calcFilled) {
      onTrade?.(opp, avgLong, avgShort)
    } else {
      const bidUrl = opp.strategy === 'sf' ? bidInfo.spotUrl?.(sym) : bidInfo.futuresUrl?.(sym)
      const askUrl = askInfo.futuresUrl?.(sym)
      if (bidUrl) window.open(bidUrl, '_blank')
      if (askUrl) window.open(askUrl, '_blank')
    }
  }

  const tradeBtnClass = isActiveTrade ? 'exit' : calcFilled ? 'ready' : 'default'
  const tradeBtnLabel = isActiveTrade ? 'ВЫХОД' : 'ТОРГОВАТЬ'

  return (
    <>
      <style>{style}</style>
      <div className="dm-overlay" onClick={onClose}>
        <div className="dm-modal" onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div className="dm-header">
            <div className="dm-header-left">
              <span className="dm-symbol">{opp.symbol}</span>
              <span className="dm-strategy">{STRATEGY_NAMES[opp.strategy] ?? opp.strategy.toUpperCase()}</span>
              <span className="dm-age-badge">🕐 {formatAge(opp.first_seen)}</span>
            </div>
            <div className="dm-net">
              <span className="dm-net-k">чистыми</span>
              <span className="dm-net-v" style={{ color: netSpread >= 0 ? 'var(--success)' : 'var(--error)' }}>
                {netSpread >= 0 ? '+' : ''}{netSpread.toFixed(2)}%
              </span>
            </div>
            <div className="dm-header-right">
              <button
                className={`dm-btn ${isFavorite ? 'fav-active' : ''}`}
                onClick={onFavorite}
                title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
              >
                <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
              <button className="dm-btn" onClick={onHide} title="В чёрный список">
                <Trash2 size={14} />
              </button>
              <button className="dm-btn close-btn" onClick={onClose}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="dm-body">

            <div className="dm-top">

              {/* ЛЕВО — кривая исполнения */}
              <div className="dm-side dm-side-left">
                <ExecutionCurve
                  bidBook={bidBook}
                  askBook={askBook}
                  tradeAmount={tradeAmount}
                  feeTotal={feeTotal + fundingCost}
                />
              </div>

              {/* ЦЕНТР — панели бирж, спред и кнопка */}
              <div className="dm-center">
                <ExCard side="bid" opp={opp} book={bidBook} livePrice={vwapBid} refPrice={vwapAsk} />

                <div className="spread-sep">
                  <div className="ss-left">
                    <span className="ss-label">СПРЕД</span>
                    <span className="ss-val" style={{ color: spreadColor }}>{liveSpread.toFixed(2)}%</span>
                    <span className="ss-grade" style={{
                      color: spreadGrade.color,
                      borderColor: spreadGrade.color + '40',
                      background: spreadGrade.color + '10',
                    }}>
                      {spreadGrade.label}
                    </span>
                  </div>
                  <button className={`trade-btn ${tradeBtnClass}`} onClick={handleTradeBtn}>
                    {tradeBtnLabel}
                  </button>
                </div>

                {/* Уведомление при превышении лимита активных позиций */}
                {tradeError && (
                  <div style={{
                    fontSize: 10,
                    color: 'var(--error)',
                    background: 'rgba(224,62,62,0.08)',
                    border: '1px solid rgba(224,62,62,0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '5px 10px',
                    lineHeight: 1.4,
                  }}>
                    {tradeError}
                  </div>
                )}

                <ExCard side="ask" opp={opp} book={askBook} livePrice={vwapAsk} refPrice={vwapBid} />
              </div>

              {/* ПРАВО — монитор позиции + калькулятор */}
              <div className="dm-side dm-side-right">
                <PositionMonitor
                  opp={opp}
                  tradeAmount={tradeAmount}
                  avgShort={avgShort}
                  avgLong={avgLong}
                  onAvgShort={setAvgShort}
                  onAvgLong={setAvgLong}
                  curBidExit={curBidExit}
                  curAskExit={curAskExit}
                  spreadNow={liveSpread}
                  feeTotal={feeTotal}
                />
              </div>

            </div>

            {/* НИЗ — стакан во всю ширину */}
            <OrderBookLadder
              bidBook={bidBook}
              askBook={askBook}
              bidEx={opp.bid_ex}
              askEx={opp.ask_ex}
            />

          </div>
        </div>
      </div>
    </>
  )
}

export default DetailModal
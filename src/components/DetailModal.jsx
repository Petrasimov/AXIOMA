const style = `
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(4px);
    z-index: 300;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .modal {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    width: 980px; max-width: 100%;
    box-shadow: 0 32px 96px rgba(0,0,0,0.7);
    display: flex; flex-direction: column;
    max-height: 92vh;
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
    padding: 3px 10px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.05);
  }
  .dm-age-badge {
    font-family: var(--font-mono); font-size: 11px;
    color: rgba(255,255,255,0.4);
    border-left: 1px solid rgba(255,255,255,0.1);
    padding-left: 12px;
  }
  .dm-btn {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.65);
    cursor: pointer; width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .dm-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
  .dm-btn.fav-active { color: #f0a500; border-color: #f0a50066; background: rgba(240,165,0,0.1); }
  .dm-btn.close-btn:hover { background: rgba(224,62,62,0.2); border-color: var(--error); color: var(--error); }

  /* BODY */
  .dm-body {
    display: grid; grid-template-columns: 370px 1fr;
    flex: 1; min-height: 0; overflow: hidden;
  }
  .dm-col-l {
    border-right: 1px solid var(--border);
    padding: 12px;
    display: flex; flex-direction: column; gap: 8px;
    overflow-y: auto;
  }
  .dm-col-l::-webkit-scrollbar { width: 3px; }
  .dm-col-l::-webkit-scrollbar-thumb { background: var(--border); }
  .dm-col-r {
    display: flex; flex-direction: column; overflow: hidden;
  }

  /* EXCHANGE CARD */
  .ex-card {
    border: 1px solid; overflow: hidden;
    position: relative; cursor: pointer;
    transition: box-shadow 0.15s, border-color 0.15s;
  }
  .ex-card::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  }
  .ex-card.buy { background: #030f09; border-color: rgba(0,201,122,0.2); }
  .ex-card.buy:hover { border-color: rgba(0,201,122,0.45); box-shadow: inset 0 0 60px rgba(0,201,122,0.07); }
  .ex-card.buy::before { background: var(--success); box-shadow: 0 0 8px var(--success); }
  .ex-card.sell { background: #0f0404; border-color: rgba(224,62,62,0.2); }
  .ex-card.sell:hover { border-color: rgba(224,62,62,0.45); box-shadow: inset 0 0 60px rgba(224,62,62,0.07); }
  .ex-card.sell::before { background: var(--error); box-shadow: 0 0 8px var(--error); }
  .ex-inner { padding: 11px 12px 12px 16px; }
  .ex-top {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px;
  }
  .ex-name { display: flex; align-items: center; gap: 8px; }
  .ex-logo {
    width: 22px; height: 22px; border-radius: 50%;
    object-fit: contain; flex-shrink: 0;
  }
  .ex-logo-fallback {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 8px; font-weight: 800; color: #000; flex-shrink: 0;
  }
  .ex-title { font-size: 13px; font-weight: 700; color: var(--text-primary); }
  .ex-role { font-size: 8px; letter-spacing: 1px; color: var(--text-muted); margin-top: 1px; }
  .ex-badge {
    font-size: 8px; letter-spacing: 1.5px; padding: 2px 7px; border: 1px solid; font-weight: 700;
  }
  .ex-badge.buy { color: var(--success); border-color: rgba(0,201,122,0.35); }
  .ex-badge.sell { color: var(--error); border-color: rgba(224,62,62,0.35); }
  .ex-price {
    font-family: var(--font-mono); font-size: 20px; font-weight: 800;
    color: #ecebee; margin-bottom: 10px;
    padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); line-height: 1;
  }

  /* METRICS 2x2 */
  .ex-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
  .ex-m-block {}
  .ex-m-label { font-size: 8px; letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 3px; }
  .ex-m-val { font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); font-weight: 500; }
  .ex-m-rate-row { display: flex; align-items: baseline; gap: 6px; }
  .ex-m-rate { font-family: var(--font-mono); font-size: 13px; font-weight: 700; }
  .ex-m-rate.green { color: var(--success); }
  .ex-m-rate.red   { color: var(--error); }
  .ex-m-time { font-family: var(--font-mono); font-size: 10px; color: var(--warning); }
  .ex-m-transfer { font-size: 12px; color: var(--text-secondary); }

  /* SPREAD SEPARATOR */
  .spread-sep {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 10px 8px 16px;
    background: rgba(47,105,151,0.05);
    border: 1px solid rgba(47,105,151,0.18);
  }
  .ss-left { display: flex; align-items: center; gap: 8px; }
  .ss-label { font-size: 8px; color: var(--text-muted); letter-spacing: 1.5px; }
  .ss-val { font-family: var(--font-mono); font-size: 20px; font-weight: 700; }
  .ss-grade {
    font-size: 9px; font-weight: 700; letter-spacing: 2px;
    padding: 2px 7px; border: 1px solid;
  }

  .trade-btn {
    padding: 7px 16px; font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
    cursor: pointer; border: 1px solid; transition: all 0.15s;
    font-family: var(--font-sans); white-space: nowrap;
  }
  .trade-btn.default {
    color: var(--accent-bright); border-color: rgba(61,135,192,0.4);
    background: rgba(61,135,192,0.07);
  }
  .trade-btn.default:hover { background: rgba(61,135,192,0.15); }
  .trade-btn.ready {
    color: #000; border-color: var(--success);
    background: var(--success);
  }
  .trade-btn.ready:hover { background: #00e88a; border-color: #00e88a; }
  .trade-btn.exit {
    color: #fff; border-color: var(--error);
    background: var(--error);
  }
  .trade-btn.exit:hover { background: #ff4f4f; }

  /* CHART */
  .chart-tabs {
    display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .chart-tab {
    padding: 10px 13px; font-size: 10px; letter-spacing: 0.8px;
    cursor: pointer; color: var(--text-muted);
    border-bottom: 2px solid transparent; transition: all 0.15s;
    user-select: none; white-space: nowrap;
  }
  .chart-tab:hover { color: var(--text-secondary); }
  .chart-tab.active { color: var(--accent-bright); border-bottom-color: var(--accent-bright); }
  .chart-tab.locked { color: #1e3448; cursor: not-allowed; }
  .chart-tab.locked:hover { color: #1e3448; }

  .chart-area {
    flex: 1; padding: 10px 6px 4px 10px;
    display: flex; align-items: stretch; min-height: 0; position: relative;
  }
  .chart-area svg { flex: 1; }
  .chart-locked-overlay {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: rgba(7,24,40,0.85);
    font-size: 12px; color: var(--text-muted); gap: 8px;
  }
  .chart-lock-icon { font-size: 22px; }
  .chart-empty {
    flex: 1; display: flex; align-items: center; justify-content: center;
    font-size: 12px; color: var(--text-muted);
  }
  .chart-legend {
    display: flex; gap: 14px; padding: 5px 10px 6px;
    flex-shrink: 0; border-top: 1px solid #0a1e2e;
  }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 9px; color: var(--text-muted); }
  .leg-line { width: 14px; height: 2px; flex-shrink: 0; }
  .leg-dash { width: 14px; height: 0; border-top: 2px dashed; flex-shrink: 0; }

  /* EXIT CALCULATOR */
  .exit-calc {
    flex-shrink: 0; border-top: 1px solid #0a1e2e;
    padding: 10px 12px; background: #050f1a;
  }
  .exit-calc-title {
    font-size: 8px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--accent-bright); margin-bottom: 8px; font-weight: 600;
  }
  .exit-calc-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .exit-calc-label { font-size: 9px; color: #3d6680; letter-spacing: 0.5px; margin-bottom: 3px; }
  .exit-calc-input {
    width: 100%; background: #071828; border: 1px solid #0e2a42;
    color: var(--text-primary); padding: 7px 10px;
    font-family: var(--font-mono); font-size: 13px;
    outline: none; transition: border-color 0.15s; box-sizing: border-box;
  }
  .exit-calc-input:focus { border-color: var(--accent-bright); }
  .exit-calc-results { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .exit-calc-result {
    background: #071828; border: 1px solid #0e2a42; padding: 8px 10px;
    border-left: 2px solid var(--accent-bright);
  }
  .exit-calc-result-label { font-size: 8px; color: #3d6680; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2px; }
  .exit-calc-result-val { font-family: var(--font-mono); font-size: 16px; font-weight: 700; }
`

import { useState, useEffect, useRef } from 'react'
import { Star, Trash2, X } from 'lucide-react'
import { connectOrderBook } from '../ws.js'
import {
  getExchangeInfo, getSpreadColor, getSpreadGrade,
  formatPrice, formatVolume, formatAge, formatTimeRemaining, calcMaxVolume, calcVwap
} from '../utils.js'

const STRATEGY_NAMES = { ff: 'FUTURES-FUTURES', sf: 'SPOT-FUTURES' }
const TARGET_EXIT = 0.30

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

// ─── Chart ────────────────────────────────────────────────────────────────────
function Chart({ mode, history, avgLong, avgShort, entrySpread }) {
  const W = 500, H = 210
  const PL = 10, PR = 76, PT = 16, PB = 26
  const cW = W - PL - PR, cH = H - PT - PB

  const hasData = history.length >= 2
  const hasAvg = avgLong && avgShort && parseFloat(avgLong) > 0 && parseFloat(avgShort) > 0

  function smooth(pts) {
    if (pts.length < 2) return `M ${pts[0][0]} ${pts[0][1]}`
    let d = `M ${pts[0][0]} ${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
      const cx = (x0 + x1) / 2
      d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`
    }
    return d
  }

  const txFn = len => i => PL + (i / Math.max(len - 1, 1)) * cW
  const tyFn = (min, max) => v => PT + (1 - (v - min) / Math.max(max - min, 0.0001)) * cH
  const padRange = (min, max) => {
    const pad = Math.max((max - min) * 0.10, Math.abs(min) * 0.0001)
    return [min - pad, max + pad]
  }

  function YAxis({ ty, min, max, count = 4, fmt, annotations = [] }) {
    const vals = []
    for (let i = 0; i <= count; i++) vals.push(min + (max - min) * (i / count))
    const axX = W - PR
    return (
      <g>
        <line x1={axX} y1={PT} x2={axX} y2={H - PB} stroke="#0e2a42" strokeWidth="1" />
        {vals.map(v => {
          const y = ty(v)
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={axX} y2={y} stroke="#0d1e30" strokeWidth="1" />
              <line x1={axX} y1={y} x2={axX + 4} y2={y} stroke="#1a3a52" strokeWidth="1" />
              <text x={axX + 7} y={y + 3.5} fontSize="8" fill="#3d506a" textAnchor="start" fontFamily="monospace">
                {fmt ? fmt(v) : v.toFixed(v < 10 ? 2 : 0)}
              </text>
            </g>
          )
        })}
        {annotations.map((a, i) => {
          const y = ty(a.val)
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={axX} y2={y} stroke={a.color} strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
              <text x={axX + 7} y={y + 3.5} fontSize="8" fill={a.color} textAnchor="start" fontFamily="monospace" fontWeight="bold">
                {fmt ? fmt(a.val) : a.val.toFixed(2)}
              </text>
            </g>
          )
        })}
      </g>
    )
  }

  function PulseDot({ x, y, color }) {
    return (
      <g>
        <circle cx={x} cy={y} r="4" fill={color} stroke="#080c14" strokeWidth="2" />
        <circle cx={x} cy={y} r="4" fill="none" stroke={color} strokeWidth="1.5">
          <animate attributeName="r" from="4" to="12" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
    )
  }

  if (!hasData) return <div className="chart-empty">Собираем данные...</div>

  // ── entry-prices ──
  if (mode === 'entry-prices') {
    const bids = history.map(p => p.bid)
    const asks = history.map(p => p.ask)
    const [min, max] = padRange(Math.min(...bids, ...asks), Math.max(...bids, ...asks))
    const ty = tyFn(min, max)
    const tx = txFn(history.length)

    const bidPts = history.map((p, i) => [tx(i), ty(p.bid)])
    const askPts = history.map((p, i) => [tx(i), ty(p.ask)])
    const bidPath = smooth(bidPts)
    const askPath = smooth(askPts)
    const [lbx, lby] = bidPts[bidPts.length - 1]
    const [lax, lay] = askPts[askPts.length - 1]

    const range = max - min
    const dec = range < 0.0005 ? 6 : range < 0.005 ? 5 : range < 0.5 ? 4 : range < 50 ? 3 : range < 500 ? 2 : 0
    const fmt = v => v.toFixed(dec)
    const curBid = bids[bids.length - 1]
    const curAsk = asks[asks.length - 1]
    const annotations = [
      { val: curBid, color: '#00c97a' },
      { val: curAsk, color: '#e03e3e' },
      ...(hasAvg ? [
        { val: parseFloat(avgLong),  color: '#00c97a88' },
        { val: parseFloat(avgShort), color: '#e03e3e88' },
      ] : []),
    ]

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="g-bid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00c97a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00c97a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <YAxis ty={ty} min={min} max={max} fmt={fmt} annotations={annotations} />
        <path d={bidPath + ` L ${lbx},${H - PB} L ${PL},${H - PB} Z`} fill="url(#g-bid)" />
        <path d={bidPath} fill="none" stroke="#00c97a" strokeWidth="1.8" />
        <path d={askPath} fill="none" stroke="#e03e3e" strokeWidth="1.8" />
        <PulseDot x={lbx} y={lby} color="#00c97a" />
        <PulseDot x={lax} y={lay} color="#e03e3e" />
      </svg>
    )
  }

  // ── entry-spread ──
  if (mode === 'entry-spread') {
    const spreads = history.map(p => (p.ask - p.bid) / p.bid * 100)
    const YMAX = Math.max(...spreads, TARGET_EXIT + 0.2)
    const YMIN = Math.min(0, ...spreads)
    const ty = tyFn(YMIN, YMAX)
    const tx = txFn(spreads.length)

    const pts = spreads.map((v, i) => [tx(i), ty(v)])
    const path = smooth(pts)
    const tY = ty(TARGET_EXIT)
    const [lx, ly] = pts[pts.length - 1]
    const fill = path + ` L ${lx},${tY} L ${PL},${tY} Z`
    const fmt = v => v.toFixed(2) + '%'
    const curSpread = spreads[spreads.length - 1]

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="g-sp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00c97a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00c97a" stopOpacity="0.02" />
          </linearGradient>
          <filter id="glow-s"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <YAxis ty={ty} min={YMIN} max={YMAX} fmt={fmt} annotations={[{ val: curSpread, color: '#00c97a' }]} />
        <line x1={PL} y1={tY} x2={W - PR} y2={tY} stroke="#3d506a" strokeWidth="1" strokeDasharray="5,4" />
        <text x={PL + 4} y={tY - 4} fontSize="8" fill="#3d506a" fontFamily="monospace">ЦЕЛЬ {TARGET_EXIT}%</text>
        <path d={fill} fill="url(#g-sp)" />
        <path d={path} fill="none" stroke="#00c97a" strokeWidth="3" opacity="0.2" filter="url(#glow-s)" />
        <path d={path} fill="none" stroke="#00c97a" strokeWidth="1.8" />
        <PulseDot x={lx} y={ly} color="#00c97a" />
      </svg>
    )
  }

  // ── exit-prices ──
  if (mode === 'exit-prices') {
    const bids = history.map(p => p.bid)
    const asks = history.map(p => p.ask)
    const allV = [...bids, ...asks, parseFloat(avgLong), parseFloat(avgShort)]
    const [min, max] = padRange(Math.min(...allV), Math.max(...allV))
    const ty = tyFn(min, max)
    const tx = txFn(history.length)

    const bidPts = history.map((p, i) => [tx(i), ty(p.bid)])
    const askPts = history.map((p, i) => [tx(i), ty(p.ask)])
    const bidPath = smooth(bidPts)
    const askPath = smooth(askPts)
    const [lbx, lby] = bidPts[bidPts.length - 1]
    const [lax, lay] = askPts[askPts.length - 1]
    const range = max - min
    const dec = range < 0.0005 ? 6 : range < 0.005 ? 5 : range < 0.5 ? 4 : range < 50 ? 3 : range < 500 ? 2 : 0
    const fmt = v => v.toFixed(dec)
    const curBidEx = bids[bids.length - 1]
    const curAskEx = asks[asks.length - 1]

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <YAxis ty={ty} min={min} max={max} fmt={fmt} annotations={[
          { val: curBidEx, color: '#00c97a' },
          { val: curAskEx, color: '#e03e3e' },
          { val: parseFloat(avgLong),  color: '#00c97a88' },
          { val: parseFloat(avgShort), color: '#e03e3e88' },
        ]} />
        <path d={bidPath} fill="none" stroke="#00c97a" strokeWidth="1.8" />
        <path d={askPath} fill="none" stroke="#e03e3e" strokeWidth="1.8" />
        <PulseDot x={lbx} y={lby} color="#00c97a" />
        <PulseDot x={lax} y={lay} color="#e03e3e" />
      </svg>
    )
  }

  // ── exit-spread ──
  if (mode === 'exit-spread') {
    const ref = (parseFloat(avgShort) - parseFloat(avgLong)) / parseFloat(avgLong) * 100
    const spreads = history.map(p => (p.ask - p.bid) / p.bid * 100)
    const captured = spreads.map(s => Math.max(0, ref - s))
    const YMAX = Math.max(...captured, (ref - TARGET_EXIT) * 0.5, 0.05)
    const ty = tyFn(0, YMAX)
    const tx = txFn(captured.length)

    const pts = captured.map((v, i) => [tx(i), ty(v)])
    const path = smooth(pts)
    const goalY = ty(Math.max(0, ref - TARGET_EXIT))
    const [lx, ly] = pts[pts.length - 1]
    const fill = path + ` L ${lx},${ty(0)} L ${PL},${ty(0)} Z`
    const fmt = v => v.toFixed(2) + '%'
    const cur = captured[captured.length - 1]

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="g-ex" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d87c0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3d87c0" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <YAxis ty={ty} min={0} max={YMAX} fmt={fmt} annotations={[{ val: cur, color: '#3d87c0' }]} />
        <line x1={PL} y1={goalY} x2={W - PR} y2={goalY} stroke="#3d506a" strokeWidth="1" strokeDasharray="5,4" />
        <text x={PL + 4} y={goalY - 4} fontSize="8" fill="#3d506a" fontFamily="monospace">ЦЕЛЬ ЗАХВАТА</text>
        <path d={fill} fill="url(#g-ex)" />
        <path d={path} fill="none" stroke="#3d87c0" strokeWidth="1.8" />
        <PulseDot x={lx} y={ly} color="#3d87c0" />
      </svg>
    )
  }

  return null
}

// ─── Exchange Card ────────────────────────────────────────────────────────────
function ExCard({ side, opp, book, livePrice, refPrice }) {
  const ex = side === 'bid' ? opp.bid_ex : opp.ask_ex
  const info = getExchangeInfo(ex)
  const price = side === 'bid' ? opp.bid_price : opp.ask_price
  const funding = side === 'bid' ? opp.bid_funding : opp.ask_funding
  const volume = side === 'bid' ? opp.bid_volume : opp.ask_volume
  const transfer = side === 'bid' ? opp.bid_transfer : opp.ask_transfer
  const isBuy = side === 'bid'

  const sym = opp.symbol.replace(/USDT$/, '')
  const url = isBuy
    ? (opp.strategy === 'sf' ? info.spotUrl?.(sym) : info.futuresUrl?.(sym))
    : info.futuresUrl?.(sym)

  const displayPrice = livePrice ?? price

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
              <div className="ex-role">{isBuy ? 'BID EXCHANGE' : 'ASK EXCHANGE'}</div>
            </div>
          </div>
          <span className={`ex-badge ${isBuy ? 'buy' : 'sell'}`}>
            {isBuy ? 'BUY / LONG' : 'SELL / SHORT'}
          </span>
        </div>

        <div className="ex-price">${formatPrice(displayPrice)}</div>

        {/* 2×2 metrics: left col = vol + funding, right col = maxvol + transfer */}
        <div className="ex-metrics">
          {/* row1 col1 — Объём 24h */}
          <div className="ex-m-block">
            <div className="ex-m-label">Объём 24h</div>
            <div className="ex-m-val">{formatVolume(volume)}</div>
          </div>
          {/* row1 col2 — Макс. объём */}
          <div className="ex-m-block">
            <div className="ex-m-label">Макс. объём</div>
            <div className="ex-m-val">{maxVol ? '$' + formatVolume(maxVol.usd) : '—'}</div>
          </div>
          {/* row2 col1 — Funding Rate */}
          <div className="ex-m-block">
            <div className="ex-m-label">Ставка финансирования</div>
            <div className="ex-m-rate-row">
              <span className={`ex-m-rate ${fundRate >= 0 ? 'green' : 'red'}`}>
                {fundRate >= 0 ? '+' : ''}{fundRate.toFixed(4)}%
              </span>
              <span className="ex-m-time">{formatTimeRemaining(funding?.next_time)}</span>
            </div>
          </div>
          {/* row2 col2 — Transfer */}
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

// ─── Main Modal ───────────────────────────────────────────────────────────────
function DetailModal({
  opp, tradeAmount, onClose,
  isFavorite, onFavorite, onHide,
  onTrade, initialAvgLong, initialAvgShort, isActiveTrade, onRemoveTrade,
}) {
  const [chartMode, setChartMode] = useState('entry-prices')
  const [liveHistory, setLiveHistory] = useState([])
  const [bidBook, setBidBook] = useState(null)
  const [askBook, setAskBook] = useState(null)
  const [avgLong, setAvgLong] = useState(initialAvgLong || '')
  const [avgShort, setAvgShort] = useState(initialAvgShort || '')

  const latestBid = useRef(opp.bid_price)
  const latestAsk = useRef(opp.ask_price)

  const vwapBid = bidBook ? calcVwap(bidBook.asks, tradeAmount) : null
  const vwapAsk = askBook ? calcVwap(askBook.bids, tradeAmount) : null
  const liveSpread = (vwapBid && vwapAsk)
    ? (vwapAsk - vwapBid) / vwapBid * 100
    : opp.spread

  useEffect(() => {
    latestBid.current = vwapBid ?? opp.bid_price
    latestAsk.current = vwapAsk ?? opp.ask_price
  }, [vwapBid, vwapAsk, opp.bid_price, opp.ask_price])

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

  const intervalRef = useRef(null)
  const phaseTimerRef = useRef(null)

  useEffect(() => {
    const tick = () => {
      setLiveHistory(prev =>
        [...prev, { bid: latestBid.current, ask: latestAsk.current }].slice(-60)
      )
    }

    intervalRef.current = setInterval(tick, 5000)

    phaseTimerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(tick, 60000)
    }, 60000)

    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(phaseTimerRef.current)
    }
  }, [])

  const curBid = vwapBid ?? opp.bid_price
  const curAsk = vwapAsk ?? opp.ask_price
  const chartHistory = liveHistory.length > 0
    ? [...liveHistory, { bid: curBid, ask: curAsk }]
    : []

  const spreadColor = getSpreadColor(liveSpread)
  const spreadGrade = getSpreadGrade(liveSpread)
  const bidInfo = getExchangeInfo(opp.bid_ex)
  const askInfo = getExchangeInfo(opp.ask_ex)
  const sym = opp.symbol.replace(/USDT$/, '')

  const calcFilled = !!(avgLong && avgShort && parseFloat(avgLong) > 0 && parseFloat(avgShort) > 0)
  const exitLocked = !calcFilled

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

  const exitSpread = calcFilled
    ? (parseFloat(avgShort) - parseFloat(avgLong)) / parseFloat(avgLong) * 100
    : null
  const exitPnl = exitSpread !== null
    ? ((opp.spread - exitSpread) * tradeAmount / 100).toFixed(2)
    : null

  const TABS = [
    { id: 'entry-prices', label: 'ЦЕНЫ ВХОДА' },
    { id: 'entry-spread', label: 'СПРЕД ВХОДА' },
    { id: 'exit-prices',  label: 'ЦЕНЫ ВЫХОДА',  locked: exitLocked },
    { id: 'exit-spread',  label: 'СПРЕД ВЫХОДА', locked: exitLocked },
  ]

  const chartLegends = {
    'entry-prices': [
      { color: 'var(--success)', label: 'BID (Long)' },
      { color: 'var(--error)', label: 'ASK (Short)' },
    ],
    'entry-spread': [
      { color: 'var(--success)', label: 'Текущий спред' },
      { dash: true, color: '#3d506a', label: 'Цель 0.30%' },
    ],
    'exit-prices': [
      { color: 'var(--success)', label: 'BID (Long)' },
      { color: 'var(--error)', label: 'ASK (Short)' },
      { dash: true, color: 'var(--success)', label: 'Avg Long' },
      { dash: true, color: 'var(--error)', label: 'Avg Short' },
    ],
    'exit-spread': [
      { color: 'var(--accent-bright)', label: 'Захваченный профит' },
      { dash: true, color: '#3d506a', label: 'Цель захвата' },
    ],
  }

  return (
    <>
      <style>{style}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div className="dm-header">
            <div className="dm-header-left">
              <span className="dm-symbol">{opp.symbol}</span>
              <span className="dm-strategy">{STRATEGY_NAMES[opp.strategy] ?? opp.strategy.toUpperCase()}</span>
              <span className="dm-age-badge">🕐 {formatAge(opp.first_seen)}</span>
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

            {/* LEFT */}
            <div className="dm-col-l">
              <ExCard side="ask" opp={opp} book={askBook} livePrice={vwapAsk} refPrice={vwapBid} />

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

              <ExCard side="bid" opp={opp} book={bidBook} livePrice={vwapBid} refPrice={vwapAsk} />
            </div>

            {/* RIGHT */}
            <div className="dm-col-r">
              <div className="chart-tabs">
                {TABS.map(t => (
                  <div
                    key={t.id}
                    className={`chart-tab ${t.locked ? 'locked' : chartMode === t.id ? 'active' : ''}`}
                    onClick={() => !t.locked && setChartMode(t.id)}
                    title={t.locked ? 'Введи Avg Long и Avg Short в калькулятор' : undefined}
                  >
                    {t.label}{t.locked ? ' 🔒' : ''}
                  </div>
                ))}
              </div>

              <div className="chart-area">
                <Chart
                  mode={chartMode}
                  history={chartHistory}
                  avgLong={avgLong}
                  avgShort={avgShort}
                  entrySpread={opp.spread}
                />
                {(chartMode === 'exit-prices' || chartMode === 'exit-spread') && exitLocked && (
                  <div className="chart-locked-overlay">
                    <span className="chart-lock-icon">🔒</span>
                    <span>Введи Avg Long и Avg Short в калькулятор</span>
                  </div>
                )}
              </div>

              <div className="chart-legend">
                {(chartLegends[chartMode] || []).map((l, i) => (
                  <div key={i} className="legend-item">
                    {l.dash
                      ? <div className="leg-dash" style={{ borderColor: l.color }} />
                      : <div className="leg-line" style={{ background: l.color }} />
                    }
                    {l.label}
                  </div>
                ))}
              </div>

              {/* EXIT CALCULATOR */}
              <div className="exit-calc">
                <div className="exit-calc-title">Калькулятор выхода</div>
                <div className="exit-calc-inputs">
                  <div>
                    <div className="exit-calc-label">Avg Long — цена входа BID</div>
                    <input
                      className="exit-calc-input"
                      type="number"
                      placeholder={formatPrice(opp.bid_price)}
                      value={avgLong}
                      onChange={e => setAvgLong(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="exit-calc-label">Avg Short — цена входа ASK</div>
                    <input
                      className="exit-calc-input"
                      type="number"
                      placeholder={formatPrice(opp.ask_price)}
                      value={avgShort}
                      onChange={e => setAvgShort(e.target.value)}
                    />
                  </div>
                </div>
                {exitSpread !== null && (
                  <div className="exit-calc-results">
                    <div className="exit-calc-result">
                      <div className="exit-calc-result-label">Спред выхода</div>
                      <div className="exit-calc-result-val" style={{ color: getSpreadColor(exitSpread) }}>
                        {exitSpread.toFixed(2)}%
                      </div>
                    </div>
                    <div className="exit-calc-result">
                      <div className="exit-calc-result-label">P&L при ${tradeAmount.toLocaleString()}</div>
                      <div className="exit-calc-result-val"
                        style={{ color: parseFloat(exitPnl) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                        {parseFloat(exitPnl) >= 0 ? '+' : ''}${exitPnl}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

export default DetailModal

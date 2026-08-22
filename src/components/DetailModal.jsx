const style = `
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(3,8,13,0.6);
    backdrop-filter: blur(9px);
    z-index: 300;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .modal {
    background: rgba(13,32,51,0.74);
    backdrop-filter: blur(30px) saturate(160%);
    -webkit-backdrop-filter: blur(30px) saturate(160%);
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-xl);
    width: 980px; max-width: 100%;
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

  /* BODY */
  .dm-body {
    display: grid; grid-template-columns: 370px 1fr;
    flex: 1; min-height: 0; overflow: hidden;
  }
  .dm-col-l {
    border-right: 1px solid var(--glass-border);
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
    font-size: 8px; letter-spacing: 1.5px; padding: 3px 8px; border: 1px solid; border-radius: 20px; font-weight: 700;
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
  .ex-m-label { font-size: 8px; letter-spacing: 1px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 3px; }
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
    padding: 10px 12px 10px 16px;
    background: var(--glass-fill);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-md);
  }
  .ss-left { display: flex; align-items: center; gap: 8px; }
  .ss-label { font-size: 8px; color: var(--text-secondary); letter-spacing: 1.5px; }
  .ss-val { font-family: var(--font-mono); font-size: 20px; font-weight: 700; }
  .ss-grade {
    font-size: 9px; font-weight: 700; letter-spacing: 2px;
    padding: 3px 8px; border: 1px solid; border-radius: 20px;
  }

  .trade-btn {
    padding: 8px 18px; font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
    border-radius: var(--radius-sm);
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
    display: flex; border-bottom: 1px solid var(--glass-border); flex-shrink: 0;
    background: rgba(255,255,255,0.015);
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
    position: absolute; inset: 8px;
    border-radius: var(--radius-md);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: rgba(7,24,40,0.82);
    backdrop-filter: blur(6px);
    font-size: 12px; color: var(--text-muted); gap: 8px;
  }
  .chart-lock-icon { font-size: 22px; }
  .chart-empty {
    flex: 1; display: flex; align-items: center; justify-content: center;
    font-size: 12px; color: var(--text-muted);
  }
  .chart-legend {
    display: flex; gap: 14px; padding: 5px 10px 6px;
    flex-shrink: 0; border-top: 1px solid var(--glass-border);
  }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 9px; color: var(--text-muted); }
  .leg-line { width: 14px; height: 2px; flex-shrink: 0; }
  .leg-dash { width: 14px; height: 0; border-top: 2px dashed; flex-shrink: 0; }

  /* EXIT CALCULATOR */
  .exit-calc {
    flex-shrink: 0; border-top: 1px solid var(--glass-border);
    padding: 12px 14px; background: rgba(255,255,255,0.015);
  }
  .exit-calc-title {
    font-size: 8px; letter-spacing: 2px; text-transform: uppercase;
    color: var(--accent-bright); margin-bottom: 8px; font-weight: 600;
  }
  .exit-calc-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .exit-calc-label { font-size: 9px; color: var(--text-secondary); letter-spacing: 0.5px; margin-bottom: 3px; }
  .exit-calc-input {
    width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: var(--text-primary); padding: 8px 11px;
    font-family: var(--font-mono); font-size: 13px;
    outline: none; transition: border-color 0.15s, box-shadow 0.15s; box-sizing: border-box;
  }
  .exit-calc-input:focus { border-color: var(--accent-bright); box-shadow: 0 0 0 3px rgba(61,135,192,0.15); }
  .exit-calc-results { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .exit-calc-result {
    background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 9px 11px;
    border-radius: var(--radius-sm);
    border-left: 2px solid var(--accent-bright);
  }
  .exit-calc-result-label { font-size: 8px; color: #3d6680; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2px; }
  .exit-calc-result-val { font-family: var(--font-mono); font-size: 16px; font-weight: 700; }

  /* ══════════════════════════════════════════════════════════════
     МОБИЛЬНАЯ АДАПТАЦИЯ (Партия 2, MOBILE_PLAN.md)
     ══════════════════════════════════════════════════════════════
     .dm-body — жёсткая сетка "370px | 1fr". На телефоне 370px левая
     колонка ОДНА уже шире всего экрана — двухколоночную раскладку
     сохранить невозможно ни при каком ужимании пропорций, нужна
     принципиально другая структура: modal → fullscreen sheet,
     колонки → одна под другой.

     .dm-col-l/.dm-col-r теряют собственный overflow-y (на десктопе
     каждая колонка скроллится независимо — на мобиле это стало бы
     двумя вложенными скроллбарами друг под другом, неудобно). Вместо
     этого скроллится вся .dm-body целиком, единым потоком.

     .chart-area{flex:1} на десктопе тянется на всю высоту строки
     грида — при grid-template-columns:1fr колонки становятся двумя
     авто-высокими строками, и .dm-col-r больше не имеет фиксированной
     высоты, относительно которой можно "flex:1". Без явного min-height
     график схлопнулся бы почти до нуля — задаём минимальную высоту.
  */
  @media (max-width: 768px) {
    .modal-overlay { padding: 0; align-items: stretch; }

    .modal {
      width: 100%;
      max-width: 100%;
      height: 100%;
      max-height: 100dvh;
      border-radius: 0;
      /* 30px blur ощутимо просаживает FPS на мобильном GPU — как и в ProfileModal.jsx */
      backdrop-filter: blur(16px) saturate(160%);
      -webkit-backdrop-filter: blur(16px) saturate(160%);
    }

    .dm-header {
      padding: 12px 14px;
      padding-top: calc(12px + env(safe-area-inset-top));
    }
    .dm-btn { width: 40px; height: 40px; }

    .dm-body {
      grid-template-columns: 1fr;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: env(safe-area-inset-bottom);
    }
    .dm-col-l {
      border-right: none;
      border-bottom: 1px solid var(--glass-border);
      overflow-y: visible;
    }
    .dm-col-r {
      overflow: visible;
    }

    /* 4 таба заголовками не влезают в ширину телефона — превращаем
       в горизонтально скроллящуюся полосу вместо переноса/обрезки */
    .chart-tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .chart-tabs::-webkit-scrollbar { display: none; }
    .chart-tab { padding: 12px 13px; }

    .chart-area { min-height: 220px; }

    .exit-calc-inputs { grid-template-columns: 1fr; }
  }

  @media (max-width: 480px) {
    .dm-symbol { font-size: 16px; }
    .dm-strategy { font-size: 9px; padding: 3px 9px; }
    /* Возраст возможности — второстепенная деталь при таком дефиците места */
    .dm-age-badge { display: none; }
  }
`

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Star, Trash2, X } from 'lucide-react'
import { connectOrderBook } from '../ws.js'
import {
  getExchangeInfo, getSpreadColor, getSpreadGrade,
  formatPrice, formatVolume, formatAge, formatTimeRemaining, calcMaxVolume, calcVwap
} from '../utils.js'

// Библиотека графиков весит заметно больше остального кода модалки,
// а модалка открывается не сразу — грузим по требованию. В сборке под
// неё выделен отдельный чанк 'lwc' (vite.config.prod.js), иначе она
// уехала бы в 'vendor' и приезжала бы на первую отрисовку сайта.
const TvChart = lazy(() => import('./TvChart.jsx'))

const STRATEGY_NAMES = { ff: 'FUTURES-FUTURES', sf: 'SPOT-FUTURES' }

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
  tradeError,
}) {
  const [chartMode, setChartMode] = useState('entry-prices')
  const [liveHistory, setLiveHistory] = useState([])
  const [bidBook, setBidBook] = useState(null)
  const [askBook, setAskBook] = useState(null)
  const [avgLong, setAvgLong] = useState(initialAvgLong || '')
  const [avgShort, setAvgShort] = useState(initialAvgShort || '')

  const latestBid = useRef(opp.bid_price)
  const latestAsk = useRef(opp.ask_price)
  const latestBidExit = useRef(opp.bid_price)
  const latestAskExit = useRef(opp.ask_price)

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
    latestBid.current     = vwapBid     ?? opp.bid_price
    latestAsk.current     = vwapAsk     ?? opp.ask_price
    latestBidExit.current = vwapBidExit ?? opp.bid_price
    latestAskExit.current = vwapAskExit ?? opp.ask_price
  }, [vwapBid, vwapAsk, vwapBidExit, vwapAskExit, opp.bid_price, opp.ask_price])

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
      setLiveHistory(prev => {
        // Библиотека графиков требует строго возрастающее и уникальное
        // время точки. Интервал реже секунды, но тики могут сойтись в
        // одну секунду при перезапуске таймера — сдвигаем на секунду
        // вперёд, иначе точка не добавится, а перезапишет предыдущую.
        const prevT = prev.length ? prev[prev.length - 1].t : 0
        let t = Math.floor(Date.now() / 1000)
        if (t <= prevT) t = prevT + 1

        return [...prev, {
          t,
          bid:     latestBid.current,
          ask:     latestAsk.current,
          bidExit: latestBidExit.current,
          askExit: latestAskExit.current,
        }].slice(-60)
      })
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

  const curBid     = vwapBid     ?? opp.bid_price
  const curAsk     = vwapAsk     ?? opp.ask_price
  const curBidExit = vwapBidExit ?? opp.bid_price
  const curAskExit = vwapAskExit ?? opp.ask_price
  // Хвостовая точка — текущие котировки между тиками таймера. Её время
  // привязано к последней сохранённой точке, а не к Date.now(): иначе
  // на каждом обновлении стакана она вставала бы на новое место шкалы
  // и график обрастал бы лишними точками вместо одной живой.
  const chartHistory = liveHistory.length > 0
    ? [...liveHistory, {
        t: liveHistory[liveHistory.length - 1].t + 1,
        bid: curBid, ask: curAsk, bidExit: curBidExit, askExit: curAskExit,
      }]
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
    ? (parseFloat(avgShort) - parseFloat(avgLong)) / parseFloat(avgShort) * 100
    : null
  const exitPnl = exitSpread !== null
    ? (exitSpread * tradeAmount / 100).toFixed(2)
    : null

  const TABS = [
    { id: 'entry-prices', label: 'ЦЕНЫ ВХОДА' },
    { id: 'entry-spread', label: 'СПРЕД ВХОДА' },
    { id: 'exit-prices',  label: 'ЦЕНЫ ВЫХОДА',  locked: exitLocked },
    { id: 'exit-spread',  label: 'СПРЕД ВЫХОДА', locked: exitLocked },
  ]

  const chartLegends = {
    'entry-prices': [
      { color: 'var(--error)',   label: 'BID (SELL)' },
      { color: 'var(--success)', label: 'ASK (BUY)' },
    ],
    // Пунктир цели 0.30% убран из графика в п.16.11 — в легенде
    // оставалась подпись к несуществующей линии.
    'entry-spread': [
      { color: 'var(--success)', label: 'Текущий спред' },
    ],
    'exit-prices': [
      { color: 'var(--error)',   label: 'BID (SELL) — верхняя линия' },
      { color: 'var(--success)', label: 'ASK (BUY) — нижняя линия' },
    ],
    'exit-spread': [
      { color: 'var(--accent-bright)', label: 'Захваченный профит (> 0 = выходить)' },
      { dash: true, color: 'var(--chart-label)', label: 'Уровень входа (0%)' },
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
                  padding: '5px 10px',
                  marginTop: 6,
                  lineHeight: 1.4,
                }}>
                  {tradeError}
                </div>
              )}

              <ExCard side="ask" opp={opp} book={askBook} livePrice={vwapAsk} refPrice={vwapBid} />
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
                <Suspense fallback={<div className="chart-empty">Загружаем график...</div>}>
                  <TvChart
                    mode={chartMode}
                    history={chartHistory}
                    avgLong={avgLong}
                    avgShort={avgShort}
                  />
                </Suspense>
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
                    <div className="exit-calc-label">Avg Short — цена входа BID (SELL)</div>
                    <input
                      className="exit-calc-input"
                      type="number"
                      placeholder={formatPrice(opp.bid_price)}
                      value={avgShort}
                      onChange={e => setAvgShort(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="exit-calc-label">Avg Long — цена входа ASK (BUY)</div>
                    <input
                      className="exit-calc-input"
                      type="number"
                      placeholder={formatPrice(opp.ask_price)}
                      value={avgLong}
                      onChange={e => setAvgLong(e.target.value)}
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

export default DetailModalconst style = `
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(3,8,13,0.6);
    backdrop-filter: blur(9px);
    z-index: 300;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .modal {
    background: rgba(13,32,51,0.74);
    backdrop-filter: blur(30px) saturate(160%);
    -webkit-backdrop-filter: blur(30px) saturate(160%);
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-xl);
    width: 1280px; max-width: 100%;
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
    flex: 1; min-height: 0; overflow-y: auto;
    padding: 14px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .dm-body::-webkit-scrollbar { width: 5px; }
  .dm-body::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 3px; }

  .dm-top {
    display: grid; grid-template-columns: 1fr 300px 1fr;
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
  .ex-inner { padding: 11px 12px 12px 16px; }
  .ex-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
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
    font-family: var(--font-mono); font-size: 20px; font-weight: 800;
    color: #ecebee; margin-bottom: 10px;
    padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); line-height: 1;
  }
  .ex-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
  .ex-m-label { font-size: 8px; letter-spacing: 1px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 3px; }
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
    padding: 10px 12px 10px 16px;
    background: var(--glass-fill);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-md);
  }
  .ss-left { display: flex; align-items: center; gap: 8px; }
  .ss-label { font-size: 8px; color: var(--text-secondary); letter-spacing: 1.5px; }
  .ss-val { font-family: var(--font-mono); font-size: 20px; font-weight: 700; }
  .ss-grade { font-size: 9px; font-weight: 700; letter-spacing: 2px; padding: 3px 8px; border: 1px solid; border-radius: 20px; }

  .trade-btn {
    padding: 8px 18px; font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
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

  /* ── СТАКАН-ЛЕСТНИЦА ── */
  .ladder { display: grid; grid-template-columns: 1fr 78px 1fr; font-family: var(--font-mono); font-size: 11px; }
  .lad-hd {
    padding: 5px 8px; font-size: 8.5px; letter-spacing: 1.1px; color: var(--text-muted);
    text-transform: uppercase; border-bottom: 1px solid var(--glass-border); margin-bottom: 4px;
  }
  .lad-hd.r { text-align: right; }
  .lad-hd.c { text-align: center; }
  .lad-row { display: flex; align-items: center; gap: 6px; padding: 3px 8px; position: relative; height: 22px; }
  .lad-row.left { justify-content: flex-end; }
  .lad-bar { position: absolute; top: 2px; bottom: 2px; border-radius: 3px; opacity: 0.5; }
  .lad-row.left .lad-bar { right: 0; background: linear-gradient(270deg, rgba(224,62,62,0.55), rgba(224,62,62,0.05)); }
  .lad-row.right .lad-bar { left: 0; background: linear-gradient(90deg, rgba(0,201,122,0.55), rgba(0,201,122,0.05)); }
  .lad-p { position: relative; font-weight: 700; color: var(--text-primary); }
  .lad-q { position: relative; color: var(--text-secondary); font-size: 9.5px; }
  .lad-row.zone .lad-p { color: var(--warning); }
  .lad-mid {
    display: flex; align-items: center; justify-content: center;
    font-size: 8.5px; color: var(--text-muted);
    border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border);
  }
  .lad-zone-band {
    grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 9px;
    margin: 5px 0; padding: 7px; border-radius: var(--radius-sm);
    background: linear-gradient(90deg, rgba(224,62,62,0.1), rgba(240,165,0,0.14), rgba(0,201,122,0.1));
    border: 1px dashed rgba(240,165,0,0.4);
    font-size: 9.5px; letter-spacing: 0.8px; color: var(--warning); font-weight: 700;
  }
  .lad-foot {
    display: flex; gap: 16px; padding: 9px 12px; margin-top: 8px;
    border-top: 1px solid var(--glass-border);
    font-family: var(--font-mono); font-size: 9.5px; color: var(--text-muted); flex-wrap: wrap;
  }
  .lad-foot b { color: var(--text-primary); font-size: 11px; }

  /* ── КРИВАЯ ИСПОЛНЕНИЯ ── */
  .curve-legend {
    display: flex; gap: 13px; font-family: var(--font-mono); font-size: 8.5px;
    color: var(--text-muted); margin-top: 8px; flex-wrap: wrap;
  }
  .curve-legend i { display: inline-block; width: 13px; height: 2px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
  .curve-read {
    margin-top: 9px; padding: 9px 11px; border-radius: var(--radius-sm);
    background: rgba(61,135,192,0.07); border: 1px solid rgba(61,135,192,0.25);
    font-size: 11px; line-height: 1.55; color: var(--text-secondary);
  }
  .curve-read b { color: var(--accent-bright); font-family: var(--font-mono); }

  /* ── ВОДОПАД ── */
  .wf-row { display: grid; grid-template-columns: 1fr 62px 74px; align-items: center; gap: 8px; font-size: 10.5px; margin-bottom: 5px; }
  .wf-l { color: var(--text-secondary); }
  .wf-v { font-family: var(--font-mono); font-size: 10.5px; font-weight: 700; text-align: right; }
  .wf-track { height: 7px; border-radius: 4px; background: rgba(255,255,255,0.05); overflow: hidden; }
  .wf-fill { height: 100%; display: block; border-radius: 4px; }
  .wf-row.total { padding-top: 7px; border-top: 1px solid var(--glass-border); margin-top: 8px; }
  .wf-row.total .wf-l { color: var(--text-primary); font-weight: 700; font-size: 11px; }
  .wf-row.total .wf-v { font-size: 13.5px; }

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
    .modal-overlay { padding: 0; align-items: stretch; }
    .modal {
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
    .ladder { grid-template-columns: 1fr 58px 1fr; font-size: 10px; }
    .lad-row { height: 24px; }
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

// ─── Стакан-лестница ──────────────────────────────────────────────────────────
// Показывает уровни обеих бирж, выровненные по цене, и подсвечивает зону
// пересечения — где bid одной биржи выше ask другой. Именно в этой зоне
// физически лежат деньги, доступные для арбитража.
function OrderBookLadder({ bidBook, askBook, bidEx, askEx, depth = 6 }) {
  const bidInfo = getExchangeInfo(bidEx)
  const askInfo = getExchangeInfo(askEx)

  const data = useMemo(() => {
    const bids = (bidBook?.bids ?? []).slice(0, depth)
      .map(([p, q]) => ({ p: parseFloat(p), q: parseFloat(q) }))
      .filter(l => l.p > 0 && l.q > 0)
    const asks = (askBook?.asks ?? []).slice(0, depth)
      .map(([p, q]) => ({ p: parseFloat(p), q: parseFloat(q) }))
      .filter(l => l.p > 0 && l.q > 0)

    if (!bids.length || !asks.length) return null

    const bestAsk = asks[0].p
    const bestBid = bids[0].p

    // Уровень попадает в зону пересечения, если по нему реально можно
    // закрыть сделку: bid выше лучшего ask, ask ниже лучшего bid.
    const bidRows = bids.map(l => ({ ...l, usd: l.p * l.q, zone: l.p > bestAsk }))
    const askRows = asks.map(l => ({ ...l, usd: l.p * l.q, zone: l.p < bestBid }))

    const maxUsd = Math.max(
      ...bidRows.map(r => r.usd),
      ...askRows.map(r => r.usd),
      1,
    )

    const bidZoneUsd = bidRows.filter(r => r.zone).reduce((s, r) => s + r.usd, 0)
    const askZoneUsd = askRows.filter(r => r.zone).reduce((s, r) => s + r.usd, 0)
    // Реально доступный объём — минимум из двух сторон: продать можно
    // столько же, сколько получится купить.
    const overlapUsd = Math.min(bidZoneUsd, askZoneUsd)

    // Самый крупный уровень на стороне покупки — «стенка», за которой
    // цена исполнения резко ухудшается.
    const wall = askRows.reduce((best, r) => (r.usd > (best?.usd ?? 0) ? r : best), null)

    return {
      bidRows, askRows, maxUsd, overlapUsd, wall,
      zoneLevels: bidRows.filter(r => r.zone).length + askRows.filter(r => r.zone).length,
    }
  }, [bidBook, askBook, depth])

  if (!data) {
    return (
      <div className="tool">
        <div className="tool-h"><span className="tool-t">Стакан · зона пересечения</span></div>
        <div className="tool-empty">Ждём данные стакана обеих бирж…</div>
      </div>
    )
  }

  const { bidRows, askRows, maxUsd, overlapUsd, wall, zoneLevels } = data
  const rowsCount = Math.max(bidRows.length, askRows.length)

  return (
    <div className="tool">
      <div className="tool-h">
        <span className="tool-t">Стакан · зона пересечения</span>
        <span className="tool-sub">{bidInfo.name} ↔ {askInfo.name}</span>
      </div>
      <div className="tool-b">
        <div className="ladder">
          <div className="lad-hd r">{bidInfo.name} · продаём в bid</div>
          <div className="lad-hd c">цена</div>
          <div className="lad-hd">{askInfo.name} · покупаем из ask</div>

          {/* Верхняя половина — уровни продажи */}
          {Array.from({ length: rowsCount }).map((_, i) => {
            const r = bidRows[i]
            if (!r) return null
            return (
              <div key={`b${i}`} style={{ display: 'contents' }}>
                <div className={`lad-row left ${r.zone ? 'zone' : ''}`}>
                  <span className="lad-bar" style={{ width: `${Math.max(4, r.usd / maxUsd * 100)}%` }} />
                  <span className="lad-q">${formatVolume(r.usd)}</span>
                  <span className="lad-p">{formatPrice(r.p)}</span>
                </div>
                <div className="lad-mid">—</div>
                <div />
              </div>
            )
          })}

          <div className="lad-zone-band">
            ◆ ЗОНА ПЕРЕСЕЧЕНИЯ · доступно ~${formatVolume(overlapUsd)} ◆
          </div>

          {/* Нижняя половина — уровни покупки */}
          {Array.from({ length: rowsCount }).map((_, i) => {
            const r = askRows[i]
            if (!r) return null
            return (
              <div key={`a${i}`} style={{ display: 'contents' }}>
                <div />
                <div className="lad-mid">—</div>
                <div className={`lad-row right ${r.zone ? 'zone' : ''}`}>
                  <span className="lad-bar" style={{ width: `${Math.max(4, r.usd / maxUsd * 100)}%` }} />
                  <span className="lad-p">{formatPrice(r.p)}</span>
                  <span className="lad-q">${formatVolume(r.usd)}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="lad-foot">
          <span>в зоне <b>${formatVolume(overlapUsd)}</b></span>
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

  const { points, userNet, breakEvenUsd, maxUsd } = data

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

        <div className="curve-read">
          {userNet !== null
            ? <>На <b>${formatVolume(tradeAmount)}</b> получишь <b>{userNet.toFixed(2)}%</b> чистыми. </>
            : <>Стакана не хватает на объём ${formatVolume(tradeAmount)}. </>}
          {breakEvenUsd
            ? <>Предел до безубытка — <b>${formatVolume(breakEvenUsd)}</b>.</>
            : <>Спред остаётся прибыльным на всём доступном стакане.</>}
        </div>
      </div>
    </div>
  )
}

// ─── Водопад: из чего складывается чистый спред ──────────────────────────────
// Грязный спред красив, но до кармана доходит меньше. Здесь видно
// каждый слой потерь, чтобы решение принималось по честной цифре.
function SpreadWaterfall({ grossSpread, slipIn, slipOut, feeBid, feeAsk, fundingCost, tradeAmount }) {
  const net = grossSpread - slipIn - slipOut - feeBid - feeAsk - fundingCost
  const pnl = net * tradeAmount / 100

  const rows = [
    { l: 'Грязный спред',          v: grossSpread,   sign: '+', color: 'var(--success)' },
    { l: 'Проскальзывание вход',   v: slipIn,        sign: '−', color: 'var(--error)' },
    { l: 'Проскальзывание выход',  v: slipOut,       sign: '−', color: 'var(--error)' },
    { l: 'Комиссия SHORT',         v: feeBid,        sign: '−', color: 'var(--error)' },
    { l: 'Комиссия LONG',          v: feeAsk,        sign: '−', color: 'var(--error)' },
    { l: 'Фандинг за 8ч',          v: fundingCost,   sign: '−', color: 'var(--error)' },
  ]

  const scale = Math.max(grossSpread, 0.01)

  return (
    <div className="tool">
      <div className="tool-h">
        <span className="tool-t">Что останется</span>
        <span className="tool-sub">на ${formatVolume(tradeAmount)}</span>
      </div>
      <div className="tool-b">
        {rows.map((r, i) => (
          <div key={i} className="wf-row">
            <span className="wf-l">{r.l}</span>
            <span className="wf-v" style={{ color: r.color }}>
              {r.sign}{Math.abs(r.v).toFixed(2)}%
            </span>
            <span className="wf-track">
              <i className="wf-fill" style={{
                width: `${Math.min(100, Math.abs(r.v) / scale * 100)}%`,
                background: r.color,
              }} />
            </span>
          </div>
        ))}
        <div className="wf-row total">
          <span className="wf-l">
            Чистыми · {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
          </span>
          <span className="wf-v" style={{ color: net >= 0 ? 'var(--success)' : 'var(--error)' }}>
            {net >= 0 ? '+' : ''}{net.toFixed(2)}%
          </span>
          <span className="wf-track">
            <i className="wf-fill" style={{
              width: `${Math.max(0, Math.min(100, net / scale * 100))}%`,
              background: net >= 0
                ? 'linear-gradient(90deg, var(--accent), var(--success))'
                : 'var(--error)',
            }} />
          </span>
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
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>

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

              {/* ЛЕВО — кривая исполнения + водопад */}
              <div className="dm-side dm-side-left">
                <ExecutionCurve
                  bidBook={bidBook}
                  askBook={askBook}
                  tradeAmount={tradeAmount}
                  feeTotal={feeTotal + fundingCost}
                />
                <SpreadWaterfall
                  grossSpread={grossSpread}
                  slipIn={slipIn}
                  slipOut={slipOut}
                  feeBid={feeBid * 2}
                  feeAsk={feeAsk * 2}
                  fundingCost={fundingCost}
                  tradeAmount={tradeAmount}
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
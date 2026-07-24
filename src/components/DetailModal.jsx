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

export default DetailModal
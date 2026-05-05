import { useState, useEffect, useRef, useMemo } from "react"

const PANEL_LABELS = [
  'AXIOMA — SCANNER VIEW',
  'AXIOMA — FILTER DRAWER',
  'AXIOMA — TRADE ENTRY',
  'AXIOMA — PROFIT LOCKED',
]

const style = `
  .hp-wrap {
    flex: 1;
    overflow-y: auto;
    position: relative;
    z-index: 1;
  }

  .hp-bg-glow {
    position: fixed;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 0;
  }
  .hp-bg-glow::before {
    content: '';
    position: absolute;
    width: 700px; height: 700px;
    background: radial-gradient(circle, rgba(47,105,151,0.13) 0%, transparent 70%);
    top: -250px; left: 15%;
    animation: hp-float1 9s ease-in-out infinite;
  }
  .hp-bg-glow::after {
    content: '';
    position: absolute;
    width: 450px; height: 450px;
    background: radial-gradient(circle, rgba(0,201,122,0.07) 0%, transparent 70%);
    bottom: 60px; right: 8%;
    animation: hp-float2 11s ease-in-out infinite;
  }
  @keyframes hp-float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(28px)} }
  @keyframes hp-float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }

  /* ════ BLOCK 1: HERO ════ */
  .hp-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 52px 48px 44px;
    border-bottom: 1px solid var(--border);
    position: relative;
  }

  .hp-h1 {
    font-size: 46px;
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -1.5px;
    color: var(--text-primary);
    margin-bottom: 18px;
    max-width: 640px;
  }
  .hp-h1-grad {
    background: linear-gradient(135deg, var(--accent-bright) 0%, #7dd3fc 50%, var(--success) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hp-sub {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.8;
    max-width: 490px;
    margin-bottom: 34px;
  }

  .hp-actions {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 40px;
  }
  .hp-btn-primary {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 13px 30px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-bright) 100%);
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 24px rgba(47,105,151,0.38);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .hp-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(47,105,151,0.5);
  }
  .hp-btn-secondary {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1px;
    padding: 12px 24px;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.15s;
  }
  .hp-btn-secondary:hover {
    color: var(--text-primary);
    border-color: var(--accent);
  }

  /* Exchange favicons */
  .hp-ex-logos {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
  }
  .hp-favicon-wrap {
    width: 36px; height: 36px;
    border: 1px solid var(--border);
    background: var(--bg-card);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s, transform 0.2s;
    position: relative;
    cursor: pointer;
    text-decoration: none;
  }
  .hp-favicon-wrap:hover {
    border-color: var(--accent-bright);
    transform: translateY(-3px);
    background: var(--bg-hover);
  }
  .hp-favicon-wrap img {
    width: 20px; height: 20px;
    display: block;
  }
  .hp-favicon-fallback {
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 800;
    position: absolute;
  }

  /* ════ BLOCK 2: HOW IT WORKS ════ */
  .hp-howto {
    background: var(--bg-secondary);
    border-top: 1px solid var(--border);
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 440px;
  }

  .hp-timeline-col {
    padding: 40px 44px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
  }
  .hp-section-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 2px;
    color: var(--accent-bright);
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }
  .hp-section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .hp-howto-title {
    font-size: 20px;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 28px;
    letter-spacing: -0.3px;
    line-height: 1.25;
  }
  .hp-howto-title span { color: var(--accent-bright); }

  .hp-timeline { display: flex; flex-direction: column; flex: 1; }
  .hp-tl-step {
    display: grid;
    grid-template-columns: 48px 1fr;
    position: relative;
    cursor: pointer;
  }
  .hp-tl-step:not(:last-child) .hp-tl-left::after {
    content: '';
    position: absolute;
    left: 15px; top: 34px;
    height: calc(100% - 4px);
    width: 1px;
    background: var(--border);
  }
  .hp-tl-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 2px;
    position: relative;
  }
  .hp-tl-circle {
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-muted);
    z-index: 1;
    flex-shrink: 0;
    transition: all 0.3s;
  }
  .hp-tl-step.active .hp-tl-circle {
    border-color: var(--accent-bright);
    background: rgba(61,135,192,0.15);
    color: var(--accent-bright);
    box-shadow: 0 0 14px rgba(61,135,192,0.25);
  }
  .hp-tl-step.done .hp-tl-circle {
    border-color: var(--success);
    background: rgba(0,201,122,0.12);
    color: var(--success);
  }
  .hp-tl-right { padding: 4px 0 24px 16px; }
  .hp-tl-step:last-child .hp-tl-right { padding-bottom: 0; }
  .hp-tl-title {
    font-size: 13px; font-weight: 700;
    color: var(--text-muted); margin-bottom: 4px;
    transition: color 0.2s;
  }
  .hp-tl-step.active .hp-tl-title,
  .hp-tl-step.done .hp-tl-title { color: var(--text-primary); }
  .hp-tl-desc {
    font-size: 11px; color: var(--text-muted);
    line-height: 1.6; max-width: 280px;
    transition: color 0.2s;
  }
  .hp-tl-step.active .hp-tl-desc,
  .hp-tl-step.done .hp-tl-desc { color: var(--text-secondary); }
  .hp-tl-tags {
    display: flex; gap: 6px; margin-top: 8px;
    flex-wrap: wrap; opacity: 0; transition: opacity 0.3s;
  }
  .hp-tl-step.active .hp-tl-tags,
  .hp-tl-step.done .hp-tl-tags { opacity: 1; }
  .hp-tl-tag {
    font-family: var(--font-mono); font-size: 8px;
    letter-spacing: 1px; padding: 2px 7px;
    border: 1px solid var(--border); color: var(--text-muted);
  }
  .hp-tl-tag.blue { border-color: rgba(61,135,192,0.3); color: var(--accent-bright); }
  .hp-tl-tag.green { border-color: rgba(0,201,122,0.3); color: var(--success); }
  .hp-tl-tag.red { border-color: rgba(224,62,62,0.3); color: var(--error); }

  /* Right visual panel */
  .hp-panel-col {
    background: var(--bg-card);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  .hp-panel-topbar {
    display: flex; align-items: center; gap: 7px;
    padding: 10px 16px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .hp-panel-dot { width: 8px; height: 8px; border-radius: 50%; }
  .hp-panel-title {
    font-family: var(--font-mono); font-size: 9px;
    color: var(--text-muted); letter-spacing: 1px; margin-left: 6px;
  }
  .hp-panel-stage {
    flex: 1; display: flex;
    align-items: center; justify-content: center;
    padding: 20px 24px;
  }

  .hp-vis {
    display: none; width: 100%;
    flex-direction: column; align-items: center; gap: 14px;
    animation: hp-fadein 0.35s ease;
  }
  .hp-vis.show { display: flex; }
  @keyframes hp-fadein {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes hp-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  /* ── VIS 0: Scanner ── */
  .hp-scan-grid { width: 100%; display: flex; flex-direction: column; gap: 5px; }
  .hp-scan-head {
    display: grid;
    grid-template-columns: 1fr 1fr 76px 56px;
    gap: 8px; padding: 6px 10px;
    background: var(--bg-secondary); border: 1px solid var(--border);
  }
  .hp-scan-th {
    font-family: var(--font-mono); font-size: 8px;
    color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase;
  }
  .hp-scan-row {
    display: grid;
    grid-template-columns: 1fr 1fr 76px 56px;
    gap: 8px; padding: 9px 10px;
    background: var(--bg-secondary); border: 1px solid var(--border);
    align-items: center;
  }
  .hp-scan-row.hl { border-color: var(--accent); background: rgba(47,105,151,0.08); }
  .hp-scan-sym { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--text-primary); }
  .hp-scan-sub { font-size: 9px; color: var(--text-muted); margin-top: 2px; font-family: var(--font-mono); }
  .hp-scan-exes { display: flex; align-items: center; gap: 5px; }
  .hp-scan-arr { font-size: 9px; color: var(--text-muted); }
  .hp-scan-spread { font-family: var(--font-mono); font-size: 12px; font-weight: 700; }
  .hp-scan-profit { font-family: var(--font-mono); font-size: 11px; color: var(--success); }
  .hp-scan-pulse {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--success); animation: hp-pulse 1.2s infinite; margin-left: auto;
  }

  /* ── VIS 1: Filters ── */
  .hp-filter-mock {
    width: 100%; max-width: 420px;
    background: var(--bg-secondary); border: 1px solid var(--border);
  }
  .hp-filter-head {
    padding: 16px 20px; border-bottom: 1px solid var(--border);
    font-size: 13px; font-weight: 700; letter-spacing: 1px;
    display: flex; align-items: center; gap: 10px; color: var(--text-primary);
  }
  .hp-filter-sec { padding: 16px 20px; border-bottom: 1px solid var(--border); }
  .hp-filter-sec:last-child { border-bottom: none; }
  .hp-filter-lbl {
    font-family: var(--font-mono); font-size: 9px; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;
  }
  .hp-fex-row { display: flex; gap: 7px; flex-wrap: wrap; }
  .hp-fex {
    width: 32px; height: 32px; border: 1px solid var(--border);
    background: var(--bg-card); display: flex; align-items: center; justify-content: center;
  }
  .hp-fex img { width: 18px; height: 18px; }
  .hp-fex.sel { border-color: var(--accent-bright); background: rgba(61,135,192,0.12); }
  .hp-fex.sel { border-color: var(--accent-bright); background: rgba(61,135,192,0.12); }
  .hp-slider-row { display: flex; align-items: center; gap: 10px; }
  .hp-slider { flex: 1; height: 3px; background: var(--border); border-radius: 2px; }
  .hp-slider-fill { height: 100%; background: var(--accent-bright); border-radius: 2px; width: 30%; }
  .hp-slider-val { font-family: var(--font-mono); font-size: 12px; color: var(--accent-bright); }
  .hp-toggle-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .hp-toggle-row:last-child { margin-bottom: 0; }
  .hp-toggle {
    width: 36px; height: 20px; border-radius: 10px;
    display: flex; align-items: center; padding: 3px;
    background: rgba(0,201,122,0.2); border: 1px solid rgba(0,201,122,0.3); flex-shrink: 0;
  }
  .hp-toggle .knob { width: 14px; height: 14px; border-radius: 50%; background: var(--success); margin-left: auto; }
  .hp-toggle-txt { font-size: 13px; color: var(--text-secondary); }

  /* ── VIS 2: Trade entry ── */
  .hp-trade-mock {
    width: 100%; max-width: 420px;
    background: var(--bg-secondary); border: 1px solid var(--border);
  }
  .hp-trade-head {
    padding: 16px 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .hp-trade-sym { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--text-primary); }
  .hp-trade-badge {
    font-family: var(--font-mono); font-size: 14px; font-weight: 700;
    padding: 5px 14px; background: rgba(0,201,122,0.12);
    border: 1px solid rgba(0,201,122,0.25); color: var(--success);
  }
  .hp-trade-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
  .hp-trade-sides { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .hp-trade-side {
    padding: 16px 14px; border: 1px solid;
    display: flex; flex-direction: column; gap: 8px;
  }
  .hp-trade-side.long { border-color: rgba(0,201,122,0.3); background: rgba(0,201,122,0.05); }
  .hp-trade-side.short { border-color: rgba(224,62,62,0.3); background: rgba(224,62,62,0.05); }
  .hp-side-lbl { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 2px; }
  .hp-side-ex { display: flex; align-items: center; gap: 7px; }
  .hp-side-ex img { width: 18px; height: 18px; }
  .hp-side-ex span { font-size: 13px; color: var(--text-secondary); }
  .hp-side-price { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--text-primary); }
  .hp-trade-profit {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 14px; background: rgba(0,201,122,0.05);
    border: 1px solid rgba(0,201,122,0.15);
  }
  .hp-trade-profit-lbl { font-size: 12px; color: var(--text-secondary); }
  .hp-trade-profit-val { font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--success); }

  /* ── VIS 3: Spread convergence chart ── */
  .hp-chart-wrap {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .hp-chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .hp-chart-title {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1px;
    color: var(--text-muted);
    text-transform: uppercase;
  }
  .hp-chart-badge {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    padding: 3px 8px;
    background: rgba(0,201,122,0.1);
    border: 1px solid rgba(0,201,122,0.25);
    color: var(--success);
    animation: hp-pulse 1.5s infinite;
  }
  .hp-chart-svg { width: 100%; display: block; }
  .hp-chart-legend {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .hp-legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 9px;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }
  .hp-legend-line { width: 14px; height: 2px; }
  .hp-legend-dash { width: 14px; height: 0; border-top: 2px dashed; }
  .hp-chart-result {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px;
    background: rgba(0,201,122,0.06);
    border: 1px solid rgba(0,201,122,0.2);
  }
  .hp-chart-result-lbl { font-size: 10px; color: var(--text-secondary); }
  .hp-chart-result-val {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 700;
    color: var(--success);
  }

  /* nav dots */
  .hp-panel-nav {
    display: flex; justify-content: center;
    gap: 8px; padding: 11px 0;
    border-top: 1px solid var(--border);
    background: var(--bg-secondary);
  }
  .hp-nav-dot {
    width: 24px; height: 3px; border-radius: 2px;
    background: var(--border); cursor: pointer;
    transition: background 0.2s, width 0.2s;
  }
  .hp-nav-dot.active { background: var(--accent-bright); width: 32px; }
`

const EXCHANGES_LIST = [
  { domain: 'binance.com', fallback: 'BN', color: '#F3BA2F', title: 'Binance', url: 'https://www.binance.com' },
  { domain: 'bybit.com',   fallback: 'BB', color: '#F7A600', title: 'Bybit',   url: 'https://www.bybit.com' },
  { domain: 'okx.com',     fallback: 'OK', color: '#dddddd', title: 'OKX',     url: 'https://www.okx.com' },
  { domain: 'gate.io',     fallback: 'GT', color: '#2354E6', title: 'Gate',    url: 'https://www.gate.io' },
  { domain: 'kucoin.com',  fallback: 'KC', color: '#00A550', title: 'KuCoin',  url: 'https://www.kucoin.com' },
  { domain: 'mexc.com',    fallback: 'MX', color: '#00B897', title: 'MEXC',    url: 'https://www.mexc.com' },
  { domain: 'bitget.com',  fallback: 'BG', color: '#00F0FF', title: 'Bitget',  url: 'https://www.bitget.com' },
  { domain: 'bingx.com',   fallback: 'BX', color: '#1DA2B4', title: 'BingX',   url: 'https://www.bingx.com' },
]

const STEPS = [
  {
    title: 'Сканер находит сигнал',
    desc: 'Система мгновенно получает свежие арбитражные возможности со всех 8 бирж и показывает только лучшие — отсортированные по размеру спреда.',
    tags: [{ label: 'LIVE DATA', cls: 'blue' }, { label: '8 БИРЖ', cls: 'blue' }],
  },
  {
    title: 'Настраиваешь фильтры',
    desc: 'Выбираешь нужные биржи, минимальный спред и стратегию. Все настройки запоминаются — при следующем входе всё уже готово.',
    tags: [{ label: 'БИРЖИ', cls: 'blue' }, { label: 'СТРАТЕГИИ', cls: 'blue' }],
  },
  {
    title: 'Открываешь позиции',
    desc: 'В детальной карточке видишь спред, цены и объём. Открываешь LONG на дешёвой бирже и SHORT на дорогой — одновременно.',
    tags: [{ label: 'LONG', cls: 'green' }, { label: 'SHORT', cls: 'red' }],
  },
  {
    title: 'Фиксируешь прибыль',
    desc: 'Цены сходятся, спред падает к нулю — момент выхода. Закрываешь обе позиции и забираешь разницу.',
    tags: [{ label: 'PROFIT', cls: 'green' }, { label: 'P&L TRACKER', cls: 'green' }],
  },
]

// ─── Favicon с fallback ───────────────────────────────────────────────────────
function ExFavicon({ domain, fallback, color, url, size = 20, wrapSize = 36 }) {
  const [err, setErr] = useState(false)
  const handleClick = () => { if (url) window.open(url, '_blank') }
  return (
    <div
      className="hp-favicon-wrap"
      style={{ width: wrapSize, height: wrapSize }}
      onClick={handleClick}
      title={fallback}
    >
      {err ? (
        <span className="hp-favicon-fallback" style={{ color, fontSize: 8 }}>{fallback}</span>
      ) : (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          width={size} height={size}
          alt={fallback}
          onError={() => setErr(true)}
        />
      )}
    </div>
  )
}

function InlineFavicon({ domain, fallback, color, size = 14 }) {
  const [err, setErr] = useState(false)
  if (err) return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, fontWeight: 800, color }}>{fallback}</span>
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      width={size} height={size}
      alt={fallback}
      onError={() => setErr(true)}
      style={{ borderRadius: 2, display: 'block' }}
    />
  )
}

// ─── SVG-график схождения спреда ──────────────────────────────────────────────
function SpreadConvergenceChart() {
  // Генерируем историю: спред начинается ~3.4%, затем плавно сходится к 0%
  const points = useMemo(() => {
    const N = 60
    const result = []
    let spread = 3.42
    for (let i = 0; i < N; i++) {
      // Экспоненциальное схождение с небольшим шумом
      const progress = i / (N - 1)
      const target = 3.42 * Math.pow(1 - progress, 1.6)
      const noise = (Math.random() - 0.5) * 0.12 * (1 - progress * 0.7)
      spread = Math.max(0, target + noise)
      result.push(spread)
    }
    // Последние несколько точек явно к нулю
    result[N - 3] = 0.18
    result[N - 2] = 0.06
    result[N - 1] = 0.0
    return result
  }, [])

  const W = 460, H = 160
  const PL = 8, PR = 52, PT = 12, PB = 22
  const cW = W - PL - PR
  const cH = H - PT - PB

  const YMAX = Math.max(...points, 0.5) * 1.1
  const YMIN = -0.05

  const ty = v => PT + (1 - (v - YMIN) / (YMAX - YMIN)) * cH
  const tx = i => PL + (i / (points.length - 1)) * cW

  // Smooth bezier path
  const pts = points.map((v, i) => [tx(i), ty(v)])
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
    const cx = (x0 + x1) / 2
    d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`
  }

  // Fill под кривой (до нуля)
  const zeroY = ty(0)
  const fillPath = `${d} L ${pts[pts.length-1][0]},${zeroY} L ${PL},${zeroY} Z`

  // Y axis grid values
  const gridVals = [0, 1, 2, 3]
  const axX = W - PR

  // Точки входа и выхода
  const entryX = tx(0)
  const entryY = ty(points[0])
  const exitX = tx(points.length - 1)
  const exitY = ty(0)

  // Зона прибыли (заливка между entry-spread и exit-spread)
  // Середина: зона захваченной прибыли
  const midIdx = Math.floor(points.length * 0.55)
  const midX = tx(midIdx)
  const midY = ty(points[midIdx])

  return (
    <div className="hp-chart-wrap">
      <div className="hp-chart-header">
        <div className="hp-chart-title">Спред — история сделки</div>
      </div>

      <svg
        className="hp-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="hp-g-spread" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00c97a" stopOpacity="0.35" />
            <stop offset="85%" stopColor="#00c97a" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="hp-g-profit" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3d87c0" stopOpacity="0" />
            <stop offset="50%" stopColor="#3d87c0" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#00c97a" stopOpacity="0.08" />
          </linearGradient>
          <filter id="hp-glow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines + Y axis */}
        <line x1={axX} y1={PT} x2={axX} y2={H - PB} stroke="#0e2a42" strokeWidth="1" />
        {gridVals.map(v => {
          const y = ty(v)
          return (
            <g key={v}>
              <line x1={PL} y1={y} x2={axX} y2={y} stroke="#0d1e30" strokeWidth="1" />
              <line x1={axX} y1={y} x2={axX + 4} y2={y} stroke="#1a3a52" strokeWidth="1" />
              <text x={axX + 7} y={y + 3.5} fontSize="8" fill="#3d506a" fontFamily="monospace">
                {v.toFixed(1)}%
              </text>
            </g>
          )
        })}

        {/* Entry spread value on Y axis */}
        <line
        x1={PL} y1={ty(3.42)} x2={axX} y2={ty(3.42)}
        stroke="#3d87c0" strokeWidth="1" strokeDasharray="3,3" opacity="0.4"
        />
        <rect x={axX + 4} y={ty(3.42) - 7} width={44} height={13} fill="#0a1828" stroke="rgba(61,135,192,0.4)" strokeWidth="1" rx="1" />
        <text x={axX + 26} y={ty(3.42) + 3.5} fontSize="8" fill="#3d87c0" fontFamily="monospace" fontWeight="bold" textAnchor="middle">+3.42%</text>

        {/* Zero line highlighted */}
        <line
          x1={PL} y1={zeroY} x2={axX} y2={zeroY}
          stroke="rgba(0,201,122,0.25)" strokeWidth="1.5" strokeDasharray="4,3"
        />
        <text x={axX + 7} y={zeroY + 3.5} fontSize="8" fill="#00c97a" fontFamily="monospace" fontWeight="bold">
          0.0%
        </text>

        {/* Fill */}
        <path d={fillPath} fill="url(#hp-g-spread)" />

        {/* Profit zone background */}
        <rect
          x={PL} y={PT} width={cW} height={cH}
          fill="url(#hp-g-profit)" opacity="0.6"
        />

        {/* Glow line */}
        <path d={d} fill="none" stroke="#00c97a" strokeWidth="3" opacity="0.18" filter="url(#hp-glow)" />

        {/* Main spread line */}
        <path d={d} fill="none" stroke="#00c97a" strokeWidth="2" />

        {/* Entry marker */}
        <line x1={entryX} y1={PT} x2={entryX} y2={H - PB} stroke="#3d87c0" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
        <circle cx={entryX} cy={entryY} r="4" fill="#3d87c0" stroke="#060c18" strokeWidth="2" />
        <rect x={entryX - 1} y={PT - 2} width={44} height={13} fill="#0a1a25" stroke="#1a3a52" strokeWidth="1" rx="1" />
        <text x={entryX + 2} y={PT + 7} fontSize="8" fill="#3d87c0" fontFamily="monospace" fontWeight="bold">ВХОД</text>

        {/* Time labels */}
        {[
          { label: '−45 мин', idx: 0 },
          { label: '−30 мин', idx: Math.floor(points.length * 0.33) },
          { label: '−15 мин', idx: Math.floor(points.length * 0.66) },
          { label: 'СЕЙЧАС', idx: points.length - 1 },
        ].map(({ label, idx }) => (
          <text
            key={label}
            x={tx(idx)}
            y={H - PB + 14}
            fontSize="7.5"
            fill={idx === points.length - 1 ? '#00c97a' : '#3d506a'}
            fontFamily="monospace"
            textAnchor="middle"
            fontWeight={idx === points.length - 1 ? 'bold' : 'normal'}
          >
            {label}
          </text>
        ))}

        {/* Exit pulsing dot */}
        <circle cx={exitX} cy={exitY} r="5" fill="#00c97a" stroke="#060c18" strokeWidth="2" />
        <circle cx={exitX} cy={exitY} r="5" fill="none" stroke="#00c97a" strokeWidth="1.5">
          <animate attributeName="r" from="5" to="14" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.7" to="0" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Exit label badge */}
        <rect x={exitX - 55} y={exitY - 16} width={52} height={14} fill="#0a2a18" stroke="rgba(0,201,122,0.4)" strokeWidth="1" rx="1" />
        <text x={exitX - 29} y={exitY - 6} fontSize="8" fill="#00c97a" fontFamily="monospace" fontWeight="bold" textAnchor="middle">ВЫХОД</text>

      </svg>

      <div className="hp-chart-legend">
        <div className="hp-legend-item">
          <div className="hp-legend-line" style={{ background: '#00c97a' }} />
          Спред сделки
        </div>
        <div className="hp-legend-item">
          <div className="hp-legend-dash" style={{ borderColor: 'rgba(0,201,122,0.4)' }} />
          Спред = 0%
        </div>
        <div className="hp-legend-item">
          <div className="hp-legend-line" style={{ background: '#3d87c0' }} />
          Точка входа
        </div>
      </div>

      <div className="hp-chart-result">
        <div className="hp-chart-result-lbl">Спред схлопнулся → прибыль зафиксирована</div>
        <div className="hp-chart-result-val">+$3.42 ✓</div>
      </div>
    </div>
  )
}

export default function HomePage({ onOpenScanner }) {
  const [step, setStep] = useState(0)
  const timerRef = useRef(null)

  const goToStep = (n) => {
    setStep(n)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setStep(prev => (prev + 1) % 4)
    }, 4000)
  }

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setStep(prev => (prev + 1) % 4)
    }, 4000)
    return () => clearInterval(timerRef.current)
  }, [])

  return (
    <>
      <style>{style}</style>
      <div className="hp-bg-glow" />

      <div className="hp-wrap">

        {/* ══ BLOCK 1: HERO ══ */}
        <div className="hp-hero">
          <div className="hp-h1">
            Находи спреды.<br />
            Торгуй <span className="hp-h1-grad">без риска</span>.
          </div>

          <div className="hp-sub">
            AXIOMA мгновенно получает свежие арбитражные возможности с 8 крупнейших бирж и показывает их в реальном времени. Рыночно-нейтральная стратегия — твой заработок не зависит от направления рынка.
          </div>

          <div className="hp-actions">
            <button className="hp-btn-primary" onClick={onOpenScanner}>
              ОТКРЫТЬ СКАНЕР
            </button>
            <button
              className="hp-btn-secondary"
              onClick={() => document.querySelector('.hp-howto')?.scrollIntoView({ behavior: 'smooth' })}
            >
              КАК ЭТО РАБОТАЕТ ↓
            </button>
          </div>

          <div className="hp-ex-logos">
            {EXCHANGES_LIST.map(ex => (
              <ExFavicon key={ex.domain} {...ex} />
            ))}
          </div>
        </div>

        {/* ══ BLOCK 2: HOW IT WORKS ══ */}
        <div className="hp-howto">

          {/* Left: timeline */}
          <div className="hp-timeline-col">
            <div className="hp-section-label">// как это работает</div>
            <div className="hp-howto-title">
              4 шага от сигнала<br />до <span>прибыли</span>
            </div>

            <div className="hp-timeline">
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`hp-tl-step ${step === i ? 'active' : i < step ? 'done' : ''}`}
                  onClick={() => goToStep(i)}
                >
                  <div className="hp-tl-left">
                    <div className="hp-tl-circle">
                      {i < step ? '✓' : `0${i + 1}`}
                    </div>
                  </div>
                  <div className="hp-tl-right">
                    <div className="hp-tl-title">{s.title}</div>
                    <div className="hp-tl-desc">{s.desc}</div>
                    <div className="hp-tl-tags">
                      {s.tags.map((t, j) => (
                        <div key={j} className={`hp-tl-tag ${t.cls}`}>{t.label}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: visual panel */}
          <div className="hp-panel-col">
            <div className="hp-panel-topbar">
              <div className="hp-panel-dot" style={{ background: '#e03e3e' }} />
              <div className="hp-panel-dot" style={{ background: '#f0a500' }} />
              <div className="hp-panel-dot" style={{ background: '#00c97a' }} />
              <div className="hp-panel-title">{PANEL_LABELS[step]}</div>
            </div>

            <div className="hp-panel-stage">

              {/* VIS 0 — Scanner */}
              <div className={`hp-vis ${step === 0 ? 'show' : ''}`}>
                <div className="hp-scan-grid">
                  <div className="hp-scan-head">
                    <div className="hp-scan-th">Пара</div>
                    <div className="hp-scan-th">Биржи</div>
                    <div className="hp-scan-th">Спред</div>
                    <div className="hp-scan-th">+$100</div>
                  </div>
                  {[
                    { sym: 'BTC/USDT', type: 'Futures', d1: 'binance.com', d2: 'bybit.com', f1: 'BN', f2: 'BB', c1: '#F3BA2F', c2: '#F7A600', spread: '+3.42%', spreadColor: 'var(--success)', profit: '$3.42', hl: true },
                    { sym: 'ETH/USDT', type: 'Spot',    d1: 'mexc.com', d2: 'bitget.com', f1: 'MX', f2: 'BG', c1: '#00B897', c2: '#00F0FF', spread: '+2.18%', spreadColor: 'var(--accent-bright)', profit: '$2.18', hl: false },
                    { sym: 'SOL/USDT', type: 'Futures', d1: 'bingx.com', d2: 'gate.io', f1: 'BX', f2: 'GT', c1: '#1DA2B4', c2: '#2354E6', spread: '+1.55%', spreadColor: 'var(--warning)', profit: '$1.55', hl: false },
                    { sym: 'BNB/USDT', type: 'Futures', d1: 'kucoin.com', d2: 'okx.com', f1: 'KC', f2: 'OK', c1: '#00A550', c2: '#ddd', spread: '+1.12%', spreadColor: 'var(--warning)', profit: '$1.12', hl: false },
                  ].map((row, i) => (
                    <div key={i} className={`hp-scan-row ${row.hl ? 'hl' : ''}`}>
                      <div>
                        <div className="hp-scan-sym">{row.sym}</div>
                        <div className="hp-scan-sub">{row.type}</div>
                      </div>
                      <div className="hp-scan-exes">
                        <InlineFavicon domain={row.d1} fallback={row.f1} color={row.c1} />
                        <span className="hp-scan-arr">→</span>
                        <InlineFavicon domain={row.d2} fallback={row.f2} color={row.c2} />
                      </div>
                      <div className="hp-scan-spread" style={{ color: row.spreadColor }}>{row.spread}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div className="hp-scan-profit">{row.profit}</div>
                        {row.hl && <div className="hp-scan-pulse" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VIS 1 — Filters */}
              <div className={`hp-vis ${step === 1 ? 'show' : ''}`}>
                <div className="hp-filter-mock">
                  <div className="hp-filter-head">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    ФИЛЬТРЫ
                  </div>
                  <div className="hp-filter-sec">
                    <div className="hp-filter-lbl">Биржи</div>
                    <div className="hp-fex-row">
                      {EXCHANGES_LIST.map((ex, i) => (
                        <div key={i} className={`hp-fex ${i !== 4 && i !== 6 ? 'sel' : ''}`}>
                          <InlineFavicon domain={ex.domain} fallback={ex.fallback} color={ex.color} size={13} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="hp-filter-sec">
                    <div className="hp-filter-lbl">Мин. спред</div>
                    <div className="hp-slider-row">
                      <div className="hp-slider"><div className="hp-slider-fill" /></div>
                      <div className="hp-slider-val">1.0%</div>
                    </div>
                  </div>
                  <div className="hp-filter-sec">
                    <div className="hp-filter-lbl">Стратегия</div>
                    <div className="hp-toggle-row">
                      <div className="hp-toggle"><div className="knob" /></div>
                      <div className="hp-toggle-txt">Futures-Futures</div>
                    </div>
                    <div className="hp-toggle-row">
                      <div className="hp-toggle"><div className="knob" /></div>
                      <div className="hp-toggle-txt">Spot-Futures</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* VIS 2 — Trade entry */}
              <div className={`hp-vis ${step === 2 ? 'show' : ''}`}>
                <div className="hp-trade-mock">
                  <div className="hp-trade-head">
                    <div className="hp-trade-sym">BTC/USDT</div>
                    <div className="hp-trade-badge">+3.42%</div>
                  </div>
                  <div className="hp-trade-body">
                    <div className="hp-trade-sides">
                        <div className="hp-trade-side short">
                            <div className="hp-side-lbl">▼ SHORT</div>
                            <div className="hp-side-ex">
                            <InlineFavicon domain="bybit.com" fallback="BB" color="#F7A600" size={18} />
                            <span>Bybit</span>
                            </div>
                            <div className="hp-side-price">$69,291</div>
                        </div>
                        <div className="hp-trade-side long">
                            <div className="hp-side-lbl">▲ LONG</div>
                            <div className="hp-side-ex">
                            <InlineFavicon domain="binance.com" fallback="BN" color="#F3BA2F" size={18} />
                            <span>Binance</span>
                            </div>
                            <div className="hp-side-price">$67,000</div>
                        </div>
                    </div>
                    <div className="hp-trade-profit">
                      <div className="hp-trade-profit-lbl">Прибыль при входе $100</div>
                      <div className="hp-trade-profit-val">+$3.42</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* VIS 3 — Spread convergence chart */}
              <div className={`hp-vis ${step === 3 ? 'show' : ''}`}>
                <SpreadConvergenceChart />
              </div>

            </div>

            {/* Nav dots */}
            <div className="hp-panel-nav">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`hp-nav-dot ${step === i ? 'active' : ''}`}
                  onClick={() => goToStep(i)}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
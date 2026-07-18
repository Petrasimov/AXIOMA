/**
 * BubbleMap.jsx — пузырьковая карта «Топ роста и падения»
 *
 * Размер пузыря = СИЛА ИЗМЕНЕНИЯ (|pct|), согласовано с Петром.
 * Один пузырь = одна монета, с биржи, где движение сильнее всего.
 * При наведении — тултип: детали монеты + СПИСОК ДРУГИХ БИРЖ по этой монете.
 *
 * Упаковка: greedy-раскладка без пересечений. Пузыри, которым не хватило места,
 * отбрасываются (они всё равно есть в таблице ниже).
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { getExchangeInfo, formatVolume, formatPrice } from '../../utils.js'
import { coinDivergence } from '../../tickers.js'
import { openTerminal } from '../../exchangeLinks.js'

const style = `
  .bm-box {
    position: relative;
    height: 460px;
    overflow: hidden;
  }

  .bm-bub {
    position: absolute;
    border-radius: 50%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    cursor: pointer;
    transition: transform .25s cubic-bezier(.22,1,.36,1), filter .2s;
    animation: bm-in .55s cubic-bezier(.22,1,.36,1) backwards;
  }
  @keyframes bm-in { from { opacity:0; transform:scale(.35); } to { opacity:1; transform:scale(1); } }
  .bm-bub:hover { transform: scale(1.09); z-index: 20; filter: brightness(1.15); }

  .bm-bub.up {
    background: radial-gradient(circle at 35% 30%, rgba(0,231,143,0.92), rgba(0,150,90,0.78));
    box-shadow: 0 6px 26px rgba(0,201,122,0.3), inset 0 2px 10px rgba(255,255,255,0.22);
  }
  .bm-bub.down {
    background: radial-gradient(circle at 35% 30%, rgba(255,92,92,0.92), rgba(168,34,34,0.78));
    box-shadow: 0 6px 26px rgba(224,62,62,0.3), inset 0 2px 10px rgba(255,255,255,0.16);
  }

  /* Монета с большим расхождением между биржами — потенциальный арбитраж */
  .bm-bub.diverge { box-shadow: 0 6px 26px rgba(0,0,0,0.4), 0 0 0 2px var(--warning), inset 0 2px 10px rgba(255,255,255,0.2); }

  .bm-sym { font-weight: 800; color: #fff; line-height: 1; text-shadow: 0 1px 4px rgba(0,0,0,0.45); }
  .bm-pct { font-family: var(--font-mono); font-weight: 700; color: rgba(255,255,255,0.93); margin-top: 3px; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }
  .bm-ex-tag {
    position: absolute; top: -8px;
    font-size: 8px; font-family: var(--font-mono); font-weight: 700;
    padding: 2px 7px; border-radius: 10px;
    background: rgba(6,12,18,0.94); border: 1px solid rgba(255,255,255,0.2);
    color: rgba(255,255,255,0.8); white-space: nowrap;
  }
  .bm-diverge-mark {
    position: absolute; bottom: -6px;
    font-size: 8px; font-family: var(--font-mono); font-weight: 700;
    padding: 2px 6px; border-radius: 10px;
    background: rgba(240,165,0,0.9); color: #1a1200; white-space: nowrap;
  }

  /* ─── Тултип ─── */
  .bm-tip {
    position: fixed; z-index: 500;
    min-width: 230px; max-width: 300px;
    padding: 14px 16px;
    border-radius: var(--radius-md);
    background: rgba(13,32,51,0.97);
    backdrop-filter: blur(22px) saturate(150%);
    border: 1px solid var(--glass-border-hover);
    box-shadow: 0 16px 48px rgba(0,0,0,0.65);
    pointer-events: none;
    opacity: 0; transition: opacity .14s;
  }
  .bm-tip.show { opacity: 1; }

  .bm-tip-sym { font-size: 16px; font-weight: 800; margin-bottom: 2px; }
  .bm-tip-ex { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 12px; }
  .bm-tip-row { display: flex; justify-content: space-between; gap: 12px; font-size: 11.5px; padding: 3.5px 0; }
  .bm-tip-row > span:first-child { color: var(--text-muted); }
  .bm-tip-row > span:last-child { font-family: var(--font-mono); font-weight: 700; white-space: nowrap; }

  .bm-tip-others {
    margin-top: 12px; padding-top: 10px;
    border-top: 1px solid var(--glass-border);
  }
  .bm-tip-others-lbl {
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 1px;
    color: var(--text-muted); text-transform: uppercase; margin-bottom: 7px;
  }
  .bm-tip-other {
    display: flex; justify-content: space-between; align-items: center;
    gap: 10px; font-size: 11px; padding: 3px 0;
  }
  .bm-tip-other-ex { color: var(--text-secondary); }
  .bm-tip-other-pct { font-family: var(--font-mono); font-weight: 700; }
  .bm-tip-diverge {
    margin-top: 9px; padding: 7px 9px; border-radius: var(--radius-sm);
    background: rgba(240,165,0,0.1); border: 1px solid rgba(240,165,0,0.28);
    font-size: 10px; color: var(--warning); line-height: 1.45;
  }
  .bm-tip-hint {
    margin-top: 10px; font-size: 10px; color: var(--accent-bright);
    font-family: var(--font-mono); text-align: center;
  }

  /* Явная кнопка внутри тултипа — основной путь для тач-экранов.
     Раньше был просто текст-подсказка «клик → терминал», но на тач-экране
     первый тап по пузырю ТОЛЬКО открывает тултип (см. JS), открыть биржу
     нужно отдельным осознанным действием — кнопка вместо текста. */
  .bm-tip-open-btn {
    display: block;
    width: 100%;
    margin-top: 10px;
    padding: 9px 10px;
    border-radius: var(--radius-sm);
    background: rgba(93,163,214,0.1);
    border: 1px solid var(--glass-border-hover);
    color: var(--accent-bright);
    font-family: var(--font-mono); font-size: 10px; font-weight: 700;
    letter-spacing: 0.3px;
    cursor: pointer; text-align: center;
    transition: background .15s;
  }
  .bm-tip-open-btn:hover { background: rgba(93,163,214,0.18); }

  /* Невидимый оверлей — закрыть тултип тапом мимо. Только на мобиле:
     на десктопе тултип и так закрывается по mouseleave, доп. слой,
     ловящий клики по всему экрану, там не нужен и может помешать. */
  .bm-tip-overlay {
    display: none;
    position: fixed; inset: 0;
    z-index: 499; /* на 1 меньше .bm-tip (500) — тултип поверх оверлея */
    background: transparent;
  }

  .bm-empty {
    height: 100%; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 10px;
    color: var(--text-muted); font-size: 13px;
  }

  /* ══════════════════════════════════════════════════════════════
     МОБИЛЬНАЯ АДАПТАЦИЯ (Партия 3, MOBILE_PLAN.md)
     ══════════════════════════════════════════════════════════════
     На тач-экранах :hover/mouseenter не срабатывает — тултип
     переведён на тап (логика в JS, см. showTip/handleBubbleClick).
     Здесь только сопутствующие стили: тултип становится interactive
     (pointer-events:auto — иначе кнопка внутри нетапабельна),
     появляется оверлей для закрытия тапом мимо, карта чуть ниже
     (460px на телефоне — четверть экрана впустую).
  */
  @media (max-width: 1024px) {
    .bm-box { height: 360px; }
    .bm-tip { pointer-events: auto; }
    .bm-tip-overlay { display: block; }
  }
`

// Порог, с которого расхождение ЦЕН между биржами считаем заметным (%).
// Это уже потенциальная маржа арбитража до комиссий, поэтому порог низкий.
const DIVERGE_THRESHOLD = 2

// Стабильный ключ монеты — сравнивать объекты по ссылке ненадёжно
// (массив coins может пересобираться), а по этому ключу уже верстается
// React key у пузырей и строк таблицы.
function coinKey(coin) {
    return `${coin.symbol}_${coin.exchange}`
}

function BubbleMap({ coins }) {
    const boxRef = useRef(null)
    const [size, setSize] = useState({ w: 0, h: 0 })
    const [tip, setTip] = useState(null)   // { coin, x, y }

    // следим за размером контейнера (адаптивная упаковка)
    useEffect(() => {
        const el = boxRef.current
        if (!el) return
        const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // Раскладка пузырей — пересчитывается при смене данных или размера
    const bubbles = useMemo(() => {
        const { w, h } = size
        if (!w || !h || !coins?.length) return []

        // Берём топ-40 по силе движения — больше не влезет и станет кашей
        const items = coins.slice(0, 40)
        const maxPct = Math.max(...items.map(c => Math.abs(c.pct)), 1)

        const placed = []

        for (const coin of items) {
            // РАЗМЕР = СИЛА ИЗМЕНЕНИЯ (согласовано)
            // sqrt сглаживает: иначе монета с +340% раздавит все остальные
            const strength = Math.abs(coin.pct) / maxPct
            const r = 20 + Math.sqrt(strength) * 52

            // greedy: ищем свободное место
            let x = null, y = null
            for (let attempt = 0; attempt < 500; attempt++) {
                const cx = r + Math.random() * (w - 2 * r)
                const cy = r + Math.random() * (h - 2 * r)
                if (cx - r < 0 || cy - r < 0) continue
                const collides = placed.some(p =>
                    Math.hypot(p.x - cx, p.y - cy) < p.r + r + 5
                )
                if (!collides) { x = cx; y = cy; break }
            }
            if (x === null) continue  // не влез — пропускаем (он есть в таблице)

            placed.push({ coin, x, y, r, div: coinDivergence(coin) })
        }

        return placed
    }, [coins, size])

    function showTip(e, coin) {
        setTip({ coin, x: e.clientX, y: e.clientY })
    }
    function moveTip(e) {
        setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)
    }
    function hideTip() { setTip(null) }

    // Тач-экраны: mouseenter не срабатывает, поэтому к моменту клика
    // тултип ещё не показан — первый тап только открывает его. На
    // десктопе tip уже выставлен через onMouseEnter к моменту клика,
    // так что условие сразу true и клик ведёт на биржу как раньше —
    // поведение десктопа не меняется ни на шаг.
    function handleBubbleClick(e, coin) {
        const alreadyShowing = tip && coinKey(tip.coin) === coinKey(coin)
        if (alreadyShowing) {
            openTerminal(coin.exchange, coin.symbol, coin.market)
        } else {
            showTip(e, coin)
        }
    }

    if (!coins?.length) {
        return (
            <>
                <style>{style}</style>
                <div className="bm-box">
                    <div className="bm-empty">
                        <span style={{ fontSize: 28 }}>📊</span>
                        Нет данных для отображения
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <style>{style}</style>
            <div className="bm-box" ref={boxRef}>
                {bubbles.map(({ coin, x, y, r, div }, i) => {
                    const up = coin.pct > 0
                    const exInfo = getExchangeInfo(coin.exchange)
                    const isDiverge = div >= DIVERGE_THRESHOLD
                    const fsSym = Math.max(9, r * 0.31)
                    const fsPct = Math.max(8, r * 0.21)

                    return (
                        <div
                            key={`${coin.symbol}_${coin.exchange}`}
                            className={`bm-bub ${up ? 'up' : 'down'} ${isDiverge ? 'diverge' : ''}`}
                            style={{
                                left: x - r, top: y - r,
                                width: r * 2, height: r * 2,
                                animationDelay: `${i * 20}ms`,
                            }}
                            onMouseEnter={e => showTip(e, coin)}
                            onMouseMove={moveTip}
                            onMouseLeave={hideTip}
                            onClick={e => handleBubbleClick(e, coin)}
                        >
                            <span className="bm-ex-tag">{exInfo.name}</span>
                            <span className="bm-sym" style={{ fontSize: fsSym }}>{coin.symbol}</span>
                            <span className="bm-pct" style={{ fontSize: fsPct }}>
                                {up ? '+' : ''}{coin.pct.toFixed(1)}%
                            </span>
                            {isDiverge && r > 34 && (
                                <span className="bm-diverge-mark">Δ {div.toFixed(1)}%</span>
                            )}
                        </div>
                    )
                })}
            </div>

            {tip && createPortal(
                <>
                    {/* Закрыть тултип тапом мимо — активен только на мобиле (см. CSS) */}
                    <div className="bm-tip-overlay" onClick={hideTip} />
                    <div
                        className="bm-tip show"
                        style={{
                        // Тултип рендерится в document.body (портал), поэтому position:fixed
                        // считается от окна, а не от панели с overflow/backdrop-filter —
                        // иначе его обрезало и уводило в угол. У краёв экрана — переворот.
                        left: (tip.x + 18 + 300 > window.innerWidth)
                            ? Math.max(8, tip.x - 18 - 300) : tip.x + 18,
                        top: (tip.y + 18 + 340 > window.innerHeight)
                            ? Math.max(8, tip.y - 18 - 340) : tip.y + 18,
                    }}
                >
                    <div
                        className="bm-tip-sym"
                        style={{ color: tip.coin.pct > 0 ? 'var(--success)' : 'var(--error)' }}
                    >
                        {tip.coin.symbol}/USDT
                    </div>
                    <div className="bm-tip-ex">
                        {getExchangeInfo(tip.coin.exchange).name} · {tip.coin.market === 'futures' ? 'Фьючерсы' : 'Спот'}
                    </div>

                    <div className="bm-tip-row">
                        <span>Изменение 24ч</span>
                        <span style={{ color: tip.coin.pct > 0 ? 'var(--success)' : 'var(--error)' }}>
                            {tip.coin.pct > 0 ? '+' : ''}{tip.coin.pct.toFixed(2)}%
                        </span>
                    </div>
                    <div className="bm-tip-row">
                        <span>Цена</span>
                        <span>${formatPrice(tip.coin.price)}</span>
                    </div>
                    <div className="bm-tip-row">
                        <span>Объём 24ч</span>
                        <span>${formatVolume(tip.coin.volume)}</span>
                    </div>
                    {tip.coin.high > 0 && (
                        <div className="bm-tip-row">
                            <span>Макс / Мин</span>
                            <span>{formatPrice(tip.coin.high)} / {formatPrice(tip.coin.low)}</span>
                        </div>
                    )}

                    {/* СПИСОК ДРУГИХ БИРЖ ПО ЭТОЙ МОНЕТЕ (требование Петра) */}
                    {tip.coin.others?.length > 0 && (
                        <div className="bm-tip-others">
                            <div className="bm-tip-others-lbl">
                                Эта монета на других биржах
                            </div>
                            {tip.coin.others.slice(0, 6).map(o => (
                                <div key={o.exchange} className="bm-tip-other">
                                    <span className="bm-tip-other-ex">{getExchangeInfo(o.exchange).name}</span>
                                    <span
                                        className="bm-tip-other-pct"
                                        style={{ color: o.pct > 0 ? 'var(--success)' : 'var(--error)' }}
                                    >
                                        {o.pct > 0 ? '+' : ''}{o.pct.toFixed(2)}%
                                    </span>
                                </div>
                            ))}
                            {tip.coin.others.length > 6 && (
                                <div className="bm-tip-other" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                                    …и ещё {tip.coin.others.length - 6}
                                </div>
                            )}

                            {coinDivergence(tip.coin) >= DIVERGE_THRESHOLD && (
                                <div className="bm-tip-diverge">
                                    ⚡ Цены между биржами расходятся на {coinDivergence(tip.coin).toFixed(2)}% —
                                    возможен арбитраж по этой монете
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        className="bm-tip-open-btn"
                        onClick={e => {
                            e.stopPropagation()
                            openTerminal(tip.coin.exchange, tip.coin.symbol, tip.coin.market)
                        }}
                    >
                        Открыть терминал биржи →
                    </button>
                    </div>
                </>,
                document.body
            )}
        </>
    )
}

export default BubbleMap
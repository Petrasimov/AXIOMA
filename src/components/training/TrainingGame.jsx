/**
 * TrainingGame.jsx — мини-игры уроков
 *
 * kind:
 *   find-spread — среди 4 пар цен выбрать пару с максимальным спредом (на скорость)
 *   build-trade — расставить LONG/SHORT на правильные биржи
 */

import { useState } from 'react'

const style = `
  .tg-wrap {
    margin: 4px 0;
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-lg);
    background: var(--glass-fill);
    backdrop-filter: blur(16px) saturate(140%);
    box-shadow: var(--shadow-glass);
    padding: 24px;
  }
  .tg-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .tg-title { font-size: 13px; font-weight: 800; letter-spacing: 0.5px; }
  .tg-score { font-family: var(--font-mono); font-size: 12px; color: var(--accent-bright); }

  /* find-spread */
  .tg-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .tg-card {
    padding: 14px 16px; border-radius: var(--radius-md);
    border: 1px solid var(--glass-border); background: rgba(255,255,255,0.02);
    cursor: pointer; transition: all 0.15s; text-align: left;
  }
  .tg-card:hover:not(:disabled) { border-color: var(--glass-border-hover); background: rgba(93,163,214,0.06); }
  .tg-card:disabled { cursor: default; }
  .tg-card.correct { border-color: rgba(0,201,122,0.6); background: rgba(0,201,122,0.12); }
  .tg-card.wrong { border-color: rgba(224,62,62,0.6); background: rgba(224,62,62,0.1); }
  .tg-card-sym { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
  .tg-card-prices { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 11px; }
  .tg-card-ex { color: var(--text-muted); }
  .tg-card-reveal { margin-top: 8px; font-family: var(--font-mono); font-size: 12px; font-weight: 700; }

  .tg-msg { margin-top: 16px; padding: 12px 16px; border-radius: var(--radius-md); font-size: 12.5px; line-height: 1.5; }
  .tg-msg.win { background: rgba(0,201,122,0.08); border: 1px solid rgba(0,201,122,0.25); color: var(--success); }
  .tg-msg.lose { background: rgba(240,165,0,0.08); border: 1px solid rgba(240,165,0,0.25); color: var(--warning); }
  .tg-btn {
    margin-top: 14px; font-family: var(--font-mono); font-size: 11px; font-weight: 700;
    letter-spacing: 0.5px; padding: 9px 20px; border-radius: var(--radius-sm);
    background: var(--glass-fill-hover); border: 1px solid var(--glass-border-hover);
    color: var(--text-primary); cursor: pointer;
  }
  .tg-btn:hover { background: rgba(93,163,214,0.15); }

  /* build-trade */
  .tg-bt-exchanges { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .tg-bt-ex {
    padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--glass-border);
    background: rgba(255,255,255,0.02); text-align: center;
  }
  .tg-bt-ex-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
  .tg-bt-ex-price { font-family: var(--font-mono); font-size: 15px; font-weight: 800; margin-bottom: 4px; }
  .tg-bt-ex-tag { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
  .tg-bt-slots { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .tg-bt-slot {
    padding: 14px; border-radius: var(--radius-md); border: 1px dashed var(--glass-border);
    text-align: center; min-height: 70px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  }
  .tg-bt-choices { display: flex; gap: 10px; justify-content: center; }
  .tg-bt-chip {
    padding: 8px 18px; border-radius: 20px; font-family: var(--font-mono); font-size: 12px; font-weight: 800;
    letter-spacing: 1px; cursor: pointer; border: 1px solid; transition: all 0.15s;
  }
  .tg-bt-chip.long { color: var(--success); border-color: rgba(0,201,122,0.4); background: rgba(0,201,122,0.08); }
  .tg-bt-chip.short { color: var(--error); border-color: rgba(224,62,62,0.4); background: rgba(224,62,62,0.08); }
  .tg-bt-chip.placed { opacity: 0.3; pointer-events: none; }
  .tg-bt-slot-badge { font-family: var(--font-mono); font-size: 13px; font-weight: 800; letter-spacing: 1px; }

  /* ══════════════════════════════════════════════════════════════
     МОБИЛЬНАЯ АДАПТАЦИЯ (Партия 5, MOBILE_PLAN.md)
     ══════════════════════════════════════════════════════════════
     Обе игры уже построены на тапах, а не на drag-and-drop:
     find-spread — обычный клик по карточке; build-trade — выбрать
     LONG/SHORT тапом по чипу, затем тапом поставить в слот. Ничего
     в JS не переделывалось — только отступы и, на самых узких
     экранах, дополнительная подстраховка сетки карточек.
  */
  @media (max-width: 480px) {
    .tg-wrap { padding: 18px 16px; }
    .tg-cards { grid-template-columns: 1fr; }
  }
`

// ─── find-spread ────────────────────────────────────────────────────────────
const ROUNDS = [
    [
        { sym: 'WIF',  exA: 'Bybit', pA: 2.418, exB: 'BingX', pB: 2.342 },
        { sym: 'JTO',  exA: 'OKX',   pA: 3.112, exB: 'KuCoin', pB: 3.081 },
        { sym: 'INJ',  exA: 'Binance', pA: 24.87, exB: 'Gate', pB: 24.62 },
        { sym: 'TIA',  exA: 'Bitget', pA: 6.214, exB: 'MEXC', pB: 6.189 },
    ],
]

function pctSpread(p) {
    const hi = Math.max(p.pA, p.pB), lo = Math.min(p.pA, p.pB)
    return ((hi - lo) / lo) * 100
}

function FindSpreadGame() {
    const round = ROUNDS[0]
    const spreads = round.map(pctSpread)
    const bestIdx = spreads.indexOf(Math.max(...spreads))
    const [picked, setPicked] = useState(null)
    const answered = picked !== null
    const win = picked === bestIdx

    return (
        <div className="tg-wrap">
            <div className="tg-head">
                <span className="tg-title">🎯 Найди максимальный спред</span>
                {answered && <span className="tg-score">{win ? '✓ верно' : '✕ мимо'}</span>}
            </div>
            <div className="tg-cards">
                {round.map((p, i) => {
                    let cls = 'tg-card'
                    if (answered) {
                        if (i === bestIdx) cls += ' correct'
                        else if (i === picked) cls += ' wrong'
                    }
                    return (
                        <button key={i} className={cls} disabled={answered} onClick={() => setPicked(i)}>
                            <div className="tg-card-sym">{p.sym}/USDT</div>
                            <div className="tg-card-prices">
                                <span className="tg-card-ex">{p.exA} ${p.pA}</span>
                                <span className="tg-card-ex">{p.exB} ${p.pB}</span>
                            </div>
                            {answered && (
                                <div className="tg-card-reveal" style={{ color: i === bestIdx ? 'var(--success)' : 'var(--text-muted)' }}>
                                    спред {spreads[i].toFixed(2)}%
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
            {answered && (
                <div className={`tg-msg ${win ? 'win' : 'lose'}`}>
                    {win
                        ? `Отлично! ${round[bestIdx].sym} даёт самый крупный спред ${spreads[bestIdx].toFixed(2)}% — именно такие возможности ловит сканер в первую очередь.`
                        : `Не в этот раз. Максимальный спред у ${round[bestIdx].sym} — ${spreads[bestIdx].toFixed(2)}%. Смотри на процентную разницу, а не на абсолютные цены.`}
                </div>
            )}
            {answered && <button className="tg-btn" onClick={() => setPicked(null)}>↻ Ещё раз</button>}
        </div>
    )
}

// ─── build-trade ──────────────────────────────────────────────────────────
function BuildTradeGame() {
    // Дорогая = MEXC ($2.418) → SHORT; дешёвая = Bitget ($2.375) → LONG
    const [slots, setSlots] = useState({ mexc: null, bitget: null })
    const [placing, setPlacing] = useState(null) // 'LONG' | 'SHORT'

    const placeIn = (ex) => {
        if (!placing) return
        setSlots(prev => ({ ...prev, [ex]: placing }))
        setPlacing(null)
    }

    const bothPlaced = slots.mexc && slots.bitget
    const correct = slots.mexc === 'SHORT' && slots.bitget === 'LONG'
    const longUsed = slots.mexc === 'LONG' || slots.bitget === 'LONG'
    const shortUsed = slots.mexc === 'SHORT' || slots.bitget === 'SHORT'

    const reset = () => { setSlots({ mexc: null, bitget: null }); setPlacing(null) }

    return (
        <div className="tg-wrap">
            <div className="tg-head">
                <span className="tg-title">🔧 Собери арбитражную сделку</span>
                {bothPlaced && <span className="tg-score">{correct ? '✓ верно' : '✕ ошибка'}</span>}
            </div>

            <div className="tg-bt-exchanges">
                <div className="tg-bt-ex">
                    <div className="tg-bt-ex-name">MEXC</div>
                    <div className="tg-bt-ex-price" style={{ color: 'var(--error)' }}>$2.418</div>
                    <div className="tg-bt-ex-tag">дороже</div>
                </div>
                <div className="tg-bt-ex">
                    <div className="tg-bt-ex-name">Bitget</div>
                    <div className="tg-bt-ex-price" style={{ color: 'var(--success)' }}>$2.375</div>
                    <div className="tg-bt-ex-tag">дешевле</div>
                </div>
            </div>

            <div className="tg-bt-slots">
                {['mexc', 'bitget'].map(ex => (
                    <button
                        key={ex}
                        className="tg-bt-slot"
                        style={slots[ex] ? {
                            borderStyle: 'solid',
                            borderColor: slots[ex] === 'LONG' ? 'rgba(0,201,122,0.5)' : 'rgba(224,62,62,0.5)',
                            background: slots[ex] === 'LONG' ? 'rgba(0,201,122,0.08)' : 'rgba(224,62,62,0.08)',
                        } : {}}
                        onClick={() => placeIn(ex)}
                    >
                        {slots[ex]
                            ? <span className="tg-bt-slot-badge" style={{ color: slots[ex] === 'LONG' ? 'var(--success)' : 'var(--error)' }}>{slots[ex]}</span>
                            : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{placing ? 'нажми сюда →' : 'слот пуст'}</span>}
                    </button>
                ))}
            </div>

            {!bothPlaced && (
                <div className="tg-bt-choices">
                    <button className={`tg-bt-chip long ${longUsed ? 'placed' : ''}`} onClick={() => setPlacing('LONG')}>
                        LONG {placing === 'LONG' ? '●' : ''}
                    </button>
                    <button className={`tg-bt-chip short ${shortUsed ? 'placed' : ''}`} onClick={() => setPlacing('SHORT')}>
                        SHORT {placing === 'SHORT' ? '●' : ''}
                    </button>
                </div>
            )}

            {bothPlaced && (
                <>
                    <div className={`tg-msg ${correct ? 'win' : 'lose'}`}>
                        {correct
                            ? 'Идеально! SHORT на дорогой MEXC (ждём снижения), LONG на дешёвой Bitget (ждём роста). Спред схлопнется — прибыль твоя.'
                            : 'Ноги перепутаны. Правило: дорогая биржа → SHORT, дешёвая → LONG. Иначе вместо хеджа получишь двойной риск.'}
                    </div>
                    <button className="tg-btn" onClick={reset}>↻ Заново</button>
                </>
            )}
        </div>
    )
}

const GAMES = {
    'find-spread': FindSpreadGame,
    'build-trade': BuildTradeGame,
}

function TrainingGame({ kind }) {
    const Game = GAMES[kind]
    if (!Game) return null
    return (
        <>
            <style>{style}</style>
            <Game />
        </>
    )
}

export default TrainingGame
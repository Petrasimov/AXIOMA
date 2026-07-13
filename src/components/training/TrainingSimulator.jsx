/**
 * TrainingSimulator.jsx — интерактивные симуляторы уроков
 *
 * kind:
 *   leverage          — плечо усиливает прибыль и убыток
 *   ff-profit         — спред × сумма → прибыль (с учётом комиссий)
 *   funding-direction — знак ставки → куда LONG/SHORT
 *   position-size     — распределение капитала между сделками
 */

import { useState } from 'react'

const style = `
  .ts-wrap {
    margin: 4px 0;
    border: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-lg);
    background: var(--glass-fill);
    backdrop-filter: blur(16px) saturate(140%);
    box-shadow: var(--shadow-glass);
    padding: 24px;
  }
  .ts-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .ts-label { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
  .ts-val { font-family: var(--font-mono); font-size: 20px; font-weight: 800; transition: color 0.15s; }
  .ts-slider {
    width: 100%; -webkit-appearance: none; height: 5px; border-radius: 3px;
    background: rgba(255,255,255,0.08); outline: none; margin-bottom: 8px; cursor: pointer;
  }
  .ts-slider.grad { background: linear-gradient(90deg, var(--error), var(--text-muted) 50%, var(--success)); }
  .ts-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
    background: #fff; box-shadow: 0 0 0 4px rgba(61,135,192,0.35), 0 2px 8px rgba(0,0,0,0.4); cursor: pointer;
  }
  .ts-marks { display: flex; justify-content: space-between; font-size: 9px; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 22px; }
  .ts-result {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 18px; border-radius: var(--radius-md); margin-top: 4px;
    background: linear-gradient(135deg, rgba(0,231,143,0.14), rgba(0,168,102,0.05));
    border: 1px solid rgba(0,201,122,0.3);
  }
  .ts-result.danger { background: linear-gradient(135deg, rgba(224,62,62,0.14), rgba(180,40,40,0.05)); border-color: rgba(224,62,62,0.3); }
  .ts-result-lbl { font-size: 12px; color: var(--text-secondary); }
  .ts-result-val { font-family: var(--font-mono); font-size: 22px; font-weight: 900; }
  .ts-diagram { display: grid; grid-template-columns: 1fr 44px 1fr; gap: 10px; align-items: center; margin: 20px 0; }
  .ts-side { padding: 16px 14px; border-radius: var(--radius-md); border: 1px solid; transition: all 0.25s; text-align: center; }
  .ts-side.short { border-color: rgba(224,62,62,0.35); background: rgba(224,62,62,0.06); }
  .ts-side.long  { border-color: rgba(0,201,122,0.35); background: rgba(0,201,122,0.06); }
  .ts-side-badge { font-family: var(--font-mono); font-size: 11px; font-weight: 800; letter-spacing: 2px; margin-bottom: 6px; }
  .ts-side-ex { font-size: 13px; font-weight: 700; }
  .ts-side-mkt { font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-top: 2px; }
  .ts-arrow { text-align: center; color: var(--text-muted); font-size: 16px; }
  .ts-bars { display: flex; gap: 8px; align-items: flex-end; height: 90px; margin: 18px 0 8px; }
  .ts-bar { flex: 1; border-radius: 6px 6px 0 0; transition: height 0.2s, background 0.2s; display: flex; align-items: flex-start; justify-content: center; }
  .ts-bar-lbl { font-family: var(--font-mono); font-size: 9px; color: var(--text-primary); padding-top: 4px; }
  .ts-note { font-size: 11px; color: var(--text-muted); line-height: 1.5; margin-top: 12px; font-style: italic; }
`

function LeverageSim() {
    const [lev, setLev] = useState(10)
    const move = 2 // цена двинулась на 2%
    const base = 100
    const profit = (base * move / 100 * lev).toFixed(0)
    const liqDist = (100 / lev).toFixed(1)
    return (
        <div className="ts-wrap">
            <div className="ts-row">
                <span className="ts-label">Плечо</span>
                <span className="ts-val" style={{ color: lev > 25 ? 'var(--error)' : lev > 10 ? 'var(--warning)' : 'var(--accent-bright)' }}>x{lev}</span>
            </div>
            <input type="range" className="ts-slider" min="1" max="100" value={lev} onChange={e => setLev(+e.target.value)} />
            <div className="ts-marks"><span>x1</span><span>x50</span><span>x100</span></div>
            <div className="ts-result">
                <span className="ts-result-lbl">Прибыль с $100 при движении цены +2%</span>
                <span className="ts-result-val" style={{ color: 'var(--success)' }}>+${profit}</span>
            </div>
            <div className="ts-result danger" style={{ marginTop: 10 }}>
                <span className="ts-result-lbl">Ликвидация при движении против позиции на</span>
                <span className="ts-result-val" style={{ color: 'var(--error)' }}>−{liqDist}%</span>
            </div>
            <div className="ts-note">Плечо масштабирует и прибыль, и риск. Чем выше плечо, тем меньшее движение против тебя приводит к потере залога.</div>
        </div>
    )
}

function FfProfitSim() {
    const [spread, setSpread] = useState(18) // /10 = %
    const [amount, setAmount] = useState(1000)
    const fee = 0.6 // суммарные комиссии %
    const spreadPct = spread / 10
    const gross = amount * spreadPct / 100
    const net = amount * (spreadPct - fee) / 100
    const profitable = spreadPct > fee
    return (
        <div className="ts-wrap">
            <div className="ts-row">
                <span className="ts-label">Спред</span>
                <span className="ts-val" style={{ color: profitable ? 'var(--success)' : 'var(--error)' }}>{spreadPct.toFixed(1)}%</span>
            </div>
            <input type="range" className="ts-slider" min="1" max="50" value={spread} onChange={e => setSpread(+e.target.value)} />
            <div className="ts-marks"><span>0.1%</span><span>2.5%</span><span>5%</span></div>
            <div className="ts-row">
                <span className="ts-label">Сумма сделки</span>
                <span className="ts-val" style={{ color: 'var(--text-primary)' }}>${amount}</span>
            </div>
            <input type="range" className="ts-slider" min="100" max="5000" step="100" value={amount} onChange={e => setAmount(+e.target.value)} />
            <div className="ts-marks"><span>$100</span><span>$2500</span><span>$5000</span></div>
            <div className={`ts-result ${profitable ? '' : 'danger'}`}>
                <span className="ts-result-lbl">Чистая прибыль (спред − комиссии {fee}%)</span>
                <span className="ts-result-val" style={{ color: profitable ? 'var(--success)' : 'var(--error)' }}>
                    {net >= 0 ? '+' : '−'}${Math.abs(net).toFixed(2)}
                </span>
            </div>
            <div className="ts-note">
                {profitable
                    ? `Валовая прибыль $${gross.toFixed(2)}, после комиссий остаётся $${net.toFixed(2)}.`
                    : `Спред меньше комиссий — сделка убыточна ещё до входа. Такую пропускают.`}
            </div>
        </div>
    )
}

function FundingDirectionSim() {
    const [rate, setRate] = useState(4) // /100 = %
    const pct = rate / 100
    const positive = pct >= 0
    const payout = (1000 * Math.abs(pct) / 100).toFixed(2)
    return (
        <div className="ts-wrap">
            <div className="ts-row">
                <span className="ts-label">Ставка финансирования</span>
                <span className="ts-val" style={{ color: positive ? 'var(--success)' : 'var(--error)' }}>{positive ? '+' : ''}{pct.toFixed(3)}%</span>
            </div>
            <input type="range" className="ts-slider grad" min="-10" max="10" value={rate} onChange={e => setRate(+e.target.value)} />
            <div className="ts-marks"><span>−0.10%</span><span>0%</span><span>+0.10%</span></div>
            <div className="ts-diagram">
                {/* Нога, которая ПОЛУЧАЕТ фандинг */}
                <div className={`ts-side ${positive ? 'short' : 'long'}`}>
                    <div className="ts-side-badge" style={{ color: positive ? 'var(--error)' : 'var(--success)' }}>{positive ? 'SHORT' : 'LONG'}</div>
                    <div className="ts-side-ex">Фьючерс · биржа А</div>
                    <div className="ts-side-mkt">получаем ставку</div>
                </div>
                <div className="ts-arrow">⇄</div>
                {/* ХЕДЖ-нога.
                    При отрицательной ставке хедж обязан быть на ДРУГОЙ бирже:
                    LONG и SHORT на одной бирже взаимно погасят фандинг (получил по одной —
                    заплатил по другой), в сумме ноль, а с комиссиями минус.
                    Прибыль = РАЗНИЦА ставок между биржами. */}
                <div className={`ts-side ${positive ? 'long' : 'short'}`}>
                    <div className="ts-side-badge" style={{ color: positive ? 'var(--success)' : 'var(--error)' }}>{positive ? 'LONG' : 'SHORT'}</div>
                    <div className="ts-side-ex">{positive ? 'Спот' : 'Фьючерс · биржа Б'}</div>
                    <div className="ts-side-mkt">хедж цены</div>
                </div>
            </div>
            <div className="ts-result">
                <span className="ts-result-lbl">Выплата за 8ч при позиции $1000</span>
                <span className="ts-result-val" style={{ color: 'var(--success)' }}>+${payout}</span>
            </div>
            <div className="ts-note">
                {positive
                    ? 'Ставка положительная: SHORT на фьючерсе (получаем выплату) + LONG на споте как хедж. Спот фандинга не имеет — взаимного погашения нет.'
                    : 'Ставка отрицательная: LONG на фьючерсе биржи А (получаем выплату) + SHORT на фьючерсе биржи Б, где ставка выше. На одной бирже обе ноги фандинг бы взаимно погасили — прибыль возникает только из разницы ставок между биржами.'}
            </div>
        </div>
    )
}

function PositionSizeSim() {
    const [trades, setTrades] = useState(3)
    const capital = 3000
    const perTrade = (capital / trades).toFixed(0)
    const colors = ['#3d87c0', '#00c97a', '#f0a500', '#a78bfa', '#e879a6']
    return (
        <div className="ts-wrap">
            <div className="ts-row">
                <span className="ts-label">Разбить $3000 на сделок</span>
                <span className="ts-val" style={{ color: 'var(--accent-bright)' }}>{trades}</span>
            </div>
            <input type="range" className="ts-slider" min="1" max="5" value={trades} onChange={e => setTrades(+e.target.value)} />
            <div className="ts-marks"><span>1</span><span>3</span><span>5</span></div>
            <div className="ts-bars">
                {Array.from({ length: trades }).map((_, i) => (
                    <div key={i} className="ts-bar" style={{ height: '100%', background: `${colors[i]}33`, border: `1px solid ${colors[i]}` }}>
                        <span className="ts-bar-lbl">${perTrade}</span>
                    </div>
                ))}
            </div>
            <div className="ts-note">
                {trades === 1
                    ? 'Весь капитал в одной сделке — максимальный операционный риск: сбой на одной бирже бьёт по всему депозиту.'
                    : `Капитал распределён на ${trades} независимых сделок по $${perTrade}. Сбой на одной бирже затрагивает только ${(100 / trades).toFixed(0)}% средств.`}
            </div>
        </div>
    )
}

const SIMS = {
    leverage: LeverageSim,
    'ff-profit': FfProfitSim,
    'funding-direction': FundingDirectionSim,
    'position-size': PositionSizeSim,
}

function TrainingSimulator({ kind }) {
    const Sim = SIMS[kind]
    if (!Sim) return null
    return (
        <>
            <style>{style}</style>
            <Sim />
        </>
    )
}

export default TrainingSimulator
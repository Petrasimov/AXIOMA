import { calcProfit } from '../utils.js'
import { aLog } from '../api.js'

const style = `
    .stats-row {
        flex-shrink: 0;
        width: 100%;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 12px 16px;
    }

    .stat-label {
        font-size: 10px;
        color: var(--text-muted);
        letter-spacing: 1.5px;
        text-transform: uppercase;
    }

    .stat-value {
        font-size: 20px;
        font-weight: 700;
        font-family: var(--font-mono);
        color: var(--text-primary);
    }

    .stat-sub {
        font-size: 11px;
        color: var(--text-secondary);
        font-family: var(--font-mono);
    }


    @keyframes stat-appear {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .stat-card {
        background: var(--glass-fill);
        backdrop-filter: blur(16px) saturate(140%);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-glass);
        padding: 13px 18px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        opacity: 0;
        animation: stat-appear 0.4s ease both;
        transition: border-color 0.18s ease, background 0.18s ease;
    }

    .stat-card:hover {
        border-color: var(--glass-border-hover);
        background: var(--glass-fill-hover);
    }

    @keyframes dot-bounce {
        0%, 80%, 100% { opacity: 0.2; }
        40% { opacity: 1; }
    }

    .stat-dots { display: flex; gap: 5px; align-items: center; height: 28px; }
    .stat-dot {
        width: 6px; height: 6px;
        background: var(--text-muted);
        border-radius: 50%;
        animation: dot-bounce 1.2s ease-in-out infinite;
    }
    .stat-dot:nth-child(2) { animation-delay: 0.2s; }
    .stat-dot:nth-child(3) { animation-delay: 0.4s; }

    /* ══════════════════════════════════════════════════════════════
       МОБИЛЬНАЯ АДАПТАЦИЯ (Партия 2, MOBILE_PLAN.md)
       ══════════════════════════════════════════════════════════════
       4 карточки в один ряд на телефоне были бы нечитаемо узкими —
       складываем в сетку 2×2. Полностью в 1 колонку не уводим:
       4 карточки одна под другой заняли бы слишком много вертикали
       над и без того тесным списком возможностей.
    */
    @media (max-width: 1024px) {
        .stats-row { grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 10px 12px; }
        .stat-card { padding: 11px 14px; }
        .stat-value { font-size: 18px; }
    }
`



function StatsRow({ opportunities, tradeAmount, isLoading }) {
    const hasData = opportunities.length > 0

    // Лог старта расчётов статистики — входящие данные
    aLog('group', `[STATS] StatsRow рендер | opportunities=${opportunities.length} tradeAmount=$${tradeAmount} isLoading=${isLoading}`)

    const bestSpread = hasData
        ? Math.max(...opportunities.map(o => o.spread))
        : 0

    // Лог лучшего спреда — значение и символ-лидер
    const bestOpp = hasData ? opportunities.find(o => o.spread === bestSpread) : null
    aLog('log', `[STATS] bestSpread=${bestSpread.toFixed(4)}%${bestOpp ? ` (${bestOpp.symbol} | ${bestOpp.bid_ex}→${bestOpp.ask_ex})` : ''}`)

    const avgProfit = hasData
        ? opportunities.reduce((sum, o) => sum + parseFloat(calcProfit(o.spread, tradeAmount)), 0) / opportunities.length
        : 0

    // Лог средней прибыли — сумма и среднее при текущем tradeAmount
    const totalProfit = hasData
        ? opportunities.reduce((sum, o) => sum + parseFloat(calcProfit(o.spread, tradeAmount)), 0)
        : 0
    aLog('log', `[STATS] avgProfit=$${avgProfit.toFixed(2)} | totalProfit=$${totalProfit.toFixed(2)} | при tradeAmount=$${tradeAmount}`)

    const exchangeCount = opportunities.reduce((acc, o) => {
        acc[o.bid_ex] = (acc[o.bid_ex] || 0) + 1
        acc[o.ask_ex] = (acc[o.ask_ex] || 0) + 1
        return acc
    }, {})

    const topExchange = Object.entries(exchangeCount)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    // Лог топ-биржи — название и количество пар, полный рейтинг бирж
    const exchangeRanking = Object.entries(exchangeCount).sort((a, b) => b[1] - a[1]).map(([ex, cnt]) => `${ex}:${cnt}`).join(' ')
    aLog('log', `[STATS] topExchange=${topExchange} | рейтинг бирж: ${exchangeRanking || '—'}`)
    aLog('groupEnd')

    return (
        <>
            <style>{style}</style>
            <div className='stats-row' key={isLoading}>

                <div className='stat-card' style={{ animationDelay: '0s' }}>
                    <div className='stat-label'>Возможностей</div>
                    {isLoading ? <div className='stat-dots'><div className='stat-dot'/><div className='stat-dot'/><div className='stat-dot'/></div>
                    : <div className='stat-value'>{opportunities.length}</div>}
                    <div className='stat-sub'>после фильтрации</div>
                </div>

                <div className='stat-card' style={{ animationDelay: '0.1s' }}>
                    <div className='stat-label'>Лучший спред</div>
                    {isLoading ? <div className='stat-dots'><div className='stat-dot'/><div className='stat-dot'/><div className='stat-dot'/></div>
                    : <div className='stat-value' style={{ color: 'var(--success)'}}>{bestSpread.toFixed(2)}%</div>}
                    <div className='stat-sub'>максимум</div>
                </div>

                <div className='stat-card' style={{ animationDelay: '0.2s' }}>
                    <div className='stat-label'>Средняя прибыль</div>
                    {isLoading ? <div className='stat-dots'><div className='stat-dot'/><div className='stat-dot'/><div className='stat-dot'/></div>
                    : <div className='stat-value'>${avgProfit.toFixed(0)}</div>}
                    <div className='stat-sub'>при ${tradeAmount.toLocaleString()}</div>
                </div>

                <div className='stat-card' style={{ animationDelay: '0.3s' }}>
                    <div className='stat-label'>Топ биржа</div>
                    {isLoading ? <div className='stat-dots'><div className='stat-dot'/><div className='stat-dot'/><div className='stat-dot'/></div>
                    : <div className='stat-value' style={{ fontSize: '16px', textTransform: 'uppercase'}}>{topExchange}</div>}
                    <div className='stat-sub'>больше всего пар</div>
                </div>

            </div>
        </>
    )

}

export default StatsRow
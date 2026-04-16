import { calcProfit } from '../utils.js'

const style = `
    .stats-row {
        flex-shrink: 0;
        width: 100%;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1px;
        background: var(--border);
        border-bottom: 1px solid var(--border);
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
        background: var(--bg-secondary);
        padding: 12px 20px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        opacity: 0;
        animation: stat-appear 0.4s ease both;
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

`



function StatsRow({ opportunities, tradeAmount, isLoading }) {
    const bestSpread = Math.max(...opportunities.map(o => o.spread))

    const avgProfit = opportunities.reduce((sum, o) => {
        return sum + parseFloat(calcProfit(o.spread, tradeAmount))
    }, 0) / opportunities.length

    const exchangeCount = opportunities.reduce((acc, o) => {
        acc[o.bid_ex] = (acc[o.bid_ex] || 0) + 1
        acc[o.ask_ex] = (acc[o.ask_ex] || 0) + 1
        return acc
    }, {})

    const topExchange = Object.entries(exchangeCount)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

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
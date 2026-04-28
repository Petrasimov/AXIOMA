import { getExchangeInfo, getSpreadColor, formatPrice } from '../utils.js'
import { X } from 'lucide-react'
import { useState } from 'react'

const style = `
  .atb {
    display: flex;
    gap: 8px;
    padding: 8px 16px;
    background: #060f18;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    flex-shrink: 0;
  }

  .atb::-webkit-scrollbar { height: 3px; }
  .atb::-webkit-scrollbar-thumb { background: var(--border); }

  .atb-label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    text-transform: uppercase;
    align-self: center;
    flex-shrink: 0;
    padding-right: 4px;
    border-right: 1px solid var(--border);
    margin-right: 4px;
  }

  .atb-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    background: #0d1e2d;
    border: 1px solid var(--border);
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 0.15s;
  }

  .atb-card:hover { border-color: var(--accent-bright); }

  .atb-symbol {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .atb-exchanges {
    font-size: 9px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .atb-spreads {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .atb-spread-row {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 9px;
  }

  .atb-spread-label {
    color: var(--text-muted);
    font-size: 8px;
  }

  .atb-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    transition: color 0.15s;
    flex-shrink: 0;
  }

  .atb-close:hover { color: var(--error); }

  .atb-divider {
    width: 1px;
    height: 24px;
    background: var(--border);
    flex-shrink: 0;
  }
`

function ExLogo({ info }) {
  const [err, setErr] = useState(false)
  if (err || !info.logo) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14,
        background: info.color + '22', border: `1px solid ${info.color}55`,
        fontSize: 7, fontWeight: 700, color: info.color, flexShrink: 0,
      }}>
        {info.short}
      </span>
    )
  }
  return (
    <img
      src={info.logo}
      alt={info.name}
      width={14} height={14}
      style={{ flexShrink: 0, objectFit: 'contain' }}
      onError={() => setErr(true)}
    />
  )
}


function ActiveTradesBar({ trades, liveData, onSelect, onRemove }) {
    const list = Array.isArray(trades) ? trades : []
    if (list.length === 0) return null


    return (
        <>
            <style>{style}</style>
            <div className="atb">
            <span className="atb-label">Позиции</span>

            {list.map(trade => {
                const sym = trade.opp.symbol.replace(/USDT$/, '')
                const bidInfo = getExchangeInfo(trade.opp.bid_ex)
                const askInfo = getExchangeInfo(trade.opp.ask_ex)

                return (
                <div key={trade.id} className="atb-card" onClick={() => onSelect(trade)}>
                    <div>
                    <div className="atb-symbol">{sym}/USDT</div>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.8px', marginTop: 2 }}>
                        {trade.opp.strategy === 'ff' ? 'FUTURES · FUTURES' : 'SPOT · FUTURES'}
                    </div>
                    </div>

                    <div className="atb-divider" />

                    <div className="atb-exchanges">
                        <ExLogo info={bidInfo} />
                        <span style={{ color: 'var(--border)' }}>→</span>
                        <ExLogo info={askInfo} />
                    </div>


                    <button
                    className="atb-close"
                    onClick={e => { e.stopPropagation(); onRemove(trade.id) }}
                    title="Закрыть позицию"
                    >
                    <X size={12} />
                    </button>
                </div>
                )
            })}
            </div>
        </>
    )

}

export default ActiveTradesBar

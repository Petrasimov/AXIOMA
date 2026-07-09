/**
 * FundingActiveBar.jsx
 *
 * Панель активных funding-позиций — аналог ActiveTradesBar.jsx, но
 * полностью изолирована: принимает fundingTrades, не пересекается
 * с activeTrades/activeCoins futures-сканера ни в данных, ни в UI.
 *
 * Лимит: максимум 5 позиций (показывается в лейбле N/5).
 * Клик на карточку → onSelect(trade) → родитель открывает FundingDetailModal
 * с восстановленными ценами входа.
 */

import { X } from 'lucide-react'
import { useState } from 'react'

const style = `
  .fab {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(10,26,37,0.6);
    backdrop-filter: blur(16px) saturate(140%);
    border-bottom: 1px solid var(--glass-border);
    overflow-x: auto;
    flex-shrink: 0;
    align-items: center;
  }

  .fab::-webkit-scrollbar { height: 3px; }
  .fab::-webkit-scrollbar-thumb { background: var(--border); }

  .fab-label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--text-muted);
    text-transform: uppercase;
    align-self: center;
    flex-shrink: 0;
    padding-right: 8px;
    border-right: 1px solid var(--glass-border);
    margin-right: 4px;
    white-space: nowrap;
  }

  .fab-limit {
    color: var(--accent-bright);
    font-family: var(--font-mono);
  }

  .fab-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    background: var(--glass-fill);
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color 0.15s, background 0.15s;
  }

  .fab-card:hover {
    border-color: var(--glass-border-hover);
    background: var(--glass-fill-hover);
  }

  .fab-symbol {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .fab-symbol span {
    color: var(--text-muted);
    font-weight: 400;
    font-size: 10px;
  }

  .fab-strategy {
    font-size: 8px;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .fab-exchanges {
    font-size: 9px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .fab-ex-badge {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .fab-funding-rate {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    color: var(--success);
    flex-shrink: 0;
  }

  .fab-divider {
    width: 1px;
    height: 24px;
    background: var(--glass-border);
    flex-shrink: 0;
  }

  .fab-close {
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

  .fab-close:hover { color: var(--error); }
`

function splitSymbol(symbol) {
  if (!symbol) return { base: '', suffix: '' }
  const match = symbol.match(/^(.*?)[-_]?USDTM?$/i)
  if (!match || !match[1]) return { base: symbol, suffix: '' }
  return { base: match[1], suffix: 'USDT' }
}

function FundingActiveBar({ trades, onSelect, onRemove }) {
  const list = Array.isArray(trades) ? trades : []
  if (list.length === 0) return null

  return (
    <>
      <style>{style}</style>
      <div className="fab">
        <span className="fab-label">
          Позиции&nbsp;
          <span className="fab-limit">{list.length}/5</span>
        </span>

        {list.map(trade => {
          const { base, suffix } = splitSymbol(trade.opp.symbol)
          const askEx = trade.selectedSpotEx || trade.opp.exchange_ask || '—'
          const isFF = trade.opp.strategy === 'ff'

          // Показываем funding rate если есть
          const rate = isFF
            ? trade.opp.spread
            : trade.opp.spread

          return (
            <div
              key={trade.id}
              className="fab-card"
              onClick={() => onSelect(trade)}
            >
              <div>
                <div className="fab-symbol">
                  {base}<span>/{suffix}</span>
                </div>
                <div className="fab-strategy">
                  {isFF ? 'FUTURES · FUTURES' : 'SPOT · FUTURES'}
                </div>
              </div>

              <div className="fab-divider" />

              <div className="fab-exchanges">
                <span className="fab-ex-badge">{trade.opp.exchange_bid}</span>
                <span style={{ color: 'var(--border)' }}>→</span>
                <span className="fab-ex-badge">{askEx}</span>
              </div>

              <div className="fab-divider" />

              <div className="fab-funding-rate">
                +{rate?.toFixed(4)}%
              </div>

              <button
                className="fab-close"
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

export default FundingActiveBar
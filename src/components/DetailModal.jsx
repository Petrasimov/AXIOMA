const style = `
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .modal-title {
    font-size: 16px;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--text-primary);
  }

  .modal-strategy {
    font-size: 10px;
    padding: 3px 8px;
    border: 1px solid currentColor;
    letter-spacing: 1px;
    margin-left: 10px;
  }

  .modal-close {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 16px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .modal-close:hover {
    border-color: var(--error);
    color: var(--error);
  }

  .modal-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .modal-tab {
    padding: 12px 20px;
    font-size: 12px;
    cursor: pointer;
    color: var(--text-secondary);
    letter-spacing: 1px;
    border-bottom: 2px solid transparent;
    transition: all 0.15s ease;
    user-select: none;
  }

  .modal-tab.active {
    color: var(--accent-bright);
    border-bottom-color: var(--accent-bright);
  }

  .modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-key {
    color: var(--text-muted);
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  .detail-val {
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-weight: 500;
  }

  .exchange-panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .exchange-panel-title {
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .exchange-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .exchange-name img {
    width: 18px;
    height: 18px;
  }

  .panels-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .calc-input {
    width: 100%;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 10px 12px;
    font-size: 14px;
    font-family: var(--font-mono);
    outline: none;
    transition: border-color 0.15s ease;
  }

  .calc-input:focus {
    border-color: var(--accent);
  }

  .calc-result {
    background: var(--bg-card);
    border: 1px solid var(--border);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .calc-result-label {
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .calc-result-value {
    font-size: 24px;
    font-weight: 700;
    font-family: var(--font-mono);
  }
`

import { useState, useEffect } from 'react'
import { getExchangeInfo, getSpreadColor, calcProfit, formatPrice, formatVolume, formatAge, formatTimeRemaining } from '../utils.js'

function DetailModal({ opp, tradeAmount, onClose }) {
  const [tab, setTab] = useState('entry')
  const [exitBid, setExitBid] = useState('')
  const [exitAsk, setExitAsk] = useState('')

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const bidEx = getExchangeInfo(opp.bid_ex)
  const askEx = getExchangeInfo(opp.ask_ex)
  const spreadColor = getSpreadColor(opp.spread)

  const exitSpread = exitBid && exitAsk
    ? ((parseFloat(exitAsk) - parseFloat(exitBid)) / parseFloat(exitBid) * 100)
    : null

  const exitProfit = exitSpread !== null
    ? ((opp.spread - exitSpread) * tradeAmount / 100).toFixed(2)
    : null

  return (
    <>
      <style>{style}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>

          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="modal-title">{opp.symbol}</span>
              <span
                className="modal-strategy"
                style={{ color: opp.strategy === 'ff' ? 'var(--accent-bright)' : 'var(--warning)' }}
              >
                {opp.strategy.toUpperCase()}
              </span>
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="modal-tabs">
            <div
              className={`modal-tab ${tab === 'entry' ? 'active' : ''}`}
              onClick={() => setTab('entry')}
            >
              ВХОД
            </div>
            <div
              className={`modal-tab ${tab === 'exit' ? 'active' : ''}`}
              onClick={() => setTab('exit')}
            >
              КАЛЬКУЛЯТОР ВЫХОДА
            </div>
          </div>

          <div className="modal-body">
            {tab === 'entry' ? (
              <>
                <div className="panels-grid">
                  <div className="exchange-panel">
                    <div className="exchange-panel-title">Покупка (BID)</div>
                    <div className="exchange-name">
                      <img src={bidEx.logo} alt={bidEx.name} />
                      {bidEx.name}
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Цена</span>
                      <span className="detail-val">${formatPrice(opp.bid_price)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Фандинг</span>
                      <span className="detail-val" style={{ color: opp.bid_funding?.rate >= 0 ? 'var(--success)' : 'var(--error)' }}>
                        {opp.bid_funding?.rate?.toFixed(4) ?? '—'}%
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Объём</span>
                      <span className="detail-val">{formatVolume(opp.bid_volume)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Депозит</span>
                      <span className="detail-val" style={{ color: opp.bid_transfer.deposit ? 'var(--success)' : 'var(--error)' }}>
                        {opp.bid_transfer.deposit ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>

                  <div className="exchange-panel">
                    <div className="exchange-panel-title">Продажа (ASK)</div>
                    <div className="exchange-name">
                      <img src={askEx.logo} alt={askEx.name} />
                      {askEx.name}
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Цена</span>
                      <span className="detail-val">${formatPrice(opp.ask_price)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Фандинг</span>
                      <span className="detail-val" style={{ color: opp.ask_funding?.rate >= 0 ? 'var(--success)' : 'var(--error)' }}>
                        {opp.ask_funding?.rate?.toFixed(4) ?? '—'}%
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Объём</span>
                      <span className="detail-val">{formatVolume(opp.ask_volume)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Вывод</span>
                      <span className="detail-val" style={{ color: opp.ask_transfer.withdraw ? 'var(--success)' : 'var(--error)' }}>
                        {opp.ask_transfer.withdraw ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="detail-row">
                    <span className="detail-key">Спред входа</span>
                    <span className="detail-val" style={{ color: spreadColor, fontWeight: 700 }}>
                      {opp.spread.toFixed(2)}%
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Макс. объём входа</span>
                    <span className="detail-val">${formatVolume(opp.max_volume_entry)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Возраст</span>
                    <span className="detail-val">{formatAge(opp.first_seen)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Следующий фандинг</span>
                    <span className="detail-val">{formatTimeRemaining(opp.bid_funding?.next_time)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-key">Прибыль при ${tradeAmount.toLocaleString()}</span>
                    <span className="detail-val" style={{ color: 'var(--success)', fontSize: '16px' }}>
                      +${calcProfit(opp.spread, tradeAmount)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Введи цены закрытия позиций для расчёта итогового P&L
                </div>

                <div className="panels-grid">
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Цена закрытия BID ({bidEx.name})
                    </div>
                    <input
                      className="calc-input"
                      type="number"
                      placeholder={formatPrice(opp.bid_price)}
                      value={exitBid}
                      onChange={e => setExitBid(e.target.value)}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Цена закрытия ASK ({askEx.name})
                    </div>
                    <input
                      className="calc-input"
                      type="number"
                      placeholder={formatPrice(opp.ask_price)}
                      value={exitAsk}
                      onChange={e => setExitAsk(e.target.value)}
                    />
                  </div>
                </div>

                {exitSpread !== null && (
                  <div className="calc-result">
                    <div className="calc-result-label">Спред выхода</div>
                    <div className="calc-result-value" style={{ color: getSpreadColor(exitSpread) }}>
                      {exitSpread.toFixed(2)}%
                    </div>
                  </div>
                )}

                {exitProfit !== null && (
                  <div className="calc-result">
                    <div className="calc-result-label">Итоговый P&L при ${tradeAmount.toLocaleString()}</div>
                    <div className="calc-result-value" style={{ color: parseFloat(exitProfit) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                      {parseFloat(exitProfit) >= 0 ? '+' : ''}${exitProfit}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </>
  )
}

export default DetailModal

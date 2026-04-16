import { EXCHANGES } from "../constants.js"

const style = `
  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 200;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }

  .drawer-overlay.open {
    opacity: 1;
    pointer-events: all;
  }

  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 320px;
    height: 100%;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
    z-index: 201;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.25s ease;
    overflow-y: auto;
  }

  .drawer.open {
    transform: translateX(0);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .drawer-title {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 1px;
    color: var(--text-primary);
  }

  .drawer-close {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 16px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .drawer-close:hover {
    border-color: var(--error);
    color: var(--error);
  }

  .drawer-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .filter-label {
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .filter-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filter-toggle {
    padding: 5px 12px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: var(--font-sans);
    letter-spacing: 0.5px;
  }

  .filter-toggle.active {
    border-color: var(--accent-bright);
    color: var(--accent-bright);
    background: var(--bg-hover);
  }

  .filter-input {
    width: 100%;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 8px 12px;
    font-size: 13px;
    font-family: var(--font-mono);
    outline: none;
    transition: border-color 0.15s ease;
  }

  .filter-input:focus {
    border-color: var(--accent);
  }

  .drawer-footer {
    padding: 20px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
    margin-top: auto;
  }

  .reset-btn {
    width: 100%;
    padding: 10px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: var(--font-sans);
    letter-spacing: 1px;
  }

  .reset-btn:hover {
    border-color: var(--error);
    color: var(--error);
  }

  .filter-slider-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .filter-slider {
    flex: 1;
    accent-color: var(--accent-bright);
    cursor: pointer;
  }

  .filter-slider-value {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent-bright);
    min-width: 36px;
    text-align: right;
  }

  .filter-input-small {
    width: 60px;
    padding: 4px 8px;
    flex-shrink: 0;
  }

  .filter-slider-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .filter-slider {
    width: 100%;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    height: 4px;
    background: var(--border);
    outline: none;
  }

  .filter-slider::-webkit-slider-runnable-track {
    height: 4px;
    background: linear-gradient(
      to right,
      var(--accent-bright) 0%,
      var(--accent-bright) calc(var(--val, 0) * 1%),
      var(--border) calc(var(--val, 0) * 1%)
    );
  }

  .filter-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: var(--accent-bright);
    border-radius: 0;
    cursor: pointer;
    margin-top: -4px;
  }

  .filter-slider-marks {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.5px;
    padding-left: 70px;
  }

  .filter-toggle:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }


`

function FilterDrawer({ open, onClose, filters, onFilters, defaultFilters }) {
    const toggleStrategy = (key) => {
        onFilters(f => ({ ...f, strategy: { ...f.strategy, [key]: !f.strategy[key] } }))
    }

    const toggleExchange = (ex) => {
        onFilters(f => ({
            ...f,
            exchanges: f.exchanges.includes(ex)
                ? f.exchanges.filter(e => e !== ex)
                : [...f.exchanges, ex]
        }))
    }

    const toggleTransfer = (key) => {
      onFilters(f => ({ ...f, transfer: {...f.transfer, [key]: !f.transfer[key] } }))
    }

    const toggleFunding = (key) => {
      onFilters(f => {
        const next = {...f.funding, [key]: !f.funding[key] }
        if (!next.positive && !next.negative) return f 
        return {...f, funding: next}
      })
    }

    return (
        <>
          <style>{style}</style>

          <div
            className={`drawer-overlay ${open ? 'open' : ''}`}
            onClick={onClose}
          />

          <div className={`drawer ${open ? 'open' : ''}`}>

            <div className="drawer-header">
              <span className="drawer-title">ФИЛЬТРЫ</span>
              <button className="drawer-close" onClick={onClose}>✕</button>
            </div>

            <div className="drawer-body">

              <div className="filter-section">
                <div className="filter-label">Биржи</div>
                        
                  <div className="filter-row">
                    {Object.entries(EXCHANGES).map(([id, ex]) => (
                      <button
                        key={id}
                        className={`filter-toggle ${filters.exchanges.includes(id) ? 'active' : ''}`}
                        onClick={() => toggleExchange(id)}
                      >
                        {ex.name}
                      </button>
                    ))}
                  </div>
              </div>

              <div className="filter-section">
                <div className="filter-label">Минимальный спред %</div>
                <div className="filter-slider-row">
                  <input
                    className="filter-input filter-input-small"
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={filters.minSpread}
                    onChange={e => onFilters(f => ({ ...f, minSpread: parseFloat(e.target.value) || 0 }))}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>%</span>
                  <div className="filter-slider-wrap">
                    <input
                      className="filter-slider"
                      type="range"
                      min="0"
                      max="20"
                      step="0.1"
                      value={filters.minSpread}
                      style={{ '--val': (filters.minSpread / 20) * 100 }}
                      onChange={e => onFilters(f => ({ ...f, minSpread: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="filter-slider-marks">
                  <span>0%</span>
                  <span>20%</span>
                </div>
              </div>


              <div className="filter-section">
                <div className="filter-label">Сумма сделки $</div>
                        
                  <input
                    className="filter-input"
                    type="number"
                    min="0"
                    value={filters.tradeAmount}
                    onChange={e => onFilters(f => ({ ...f, tradeAmount: parseFloat(e.target.value) || 100 }))}
                  />
              </div>

              <div className="filter-section">
                <div className="filter-label">Стратегия</div>
                <div className="filter-row">
                  <button
                    className={`filter-toggle ${filters.strategy.ff ? 'active' : ''}`}
                    onClick={() => toggleStrategy('ff')}
                  >
                    Futures-Futures
                  </button>
                  <button
                    className={`filter-toggle ${filters.strategy.sf ? 'active' : ''}`}
                    onClick={() => toggleStrategy('sf')}
                  >
                    Spot-Futures
                  </button>
                </div>
              </div>

              <div className="filter-section">
                <div className="filter-label">Ставка финансирования</div>
                  <div className="filter-row">
                    <button
                      className={`filter-toggle ${filters.funding.positive ? 'active' : ''}`}
                      onClick={() => toggleFunding('positive')}
                      disabled={filters.onlyPositiveFunding}
                    >
                      Положительная
                    </button>
                    <button
                      className={`filter-toggle ${filters.funding.negative ? 'active' : ''}`}
                      onClick={() => toggleFunding('negative')}
                      disabled={filters.onlyPositiveFunding}
                    >
                      Отрицательная
                    </button>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color:'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={filters.onlyPositiveFunding}
                      onChange={e => onFilters(f => ({ ...f, onlyPositiveFunding: e.target.checked }))}
                    />
                    Только положительный funding spread
                  </label>
              </div>

              <div className="filter-section">
                <div className="filter-label">Переводы</div>
                  <div className="filter-row">

                    <button
                      className={`filter-toggle ${filters.transfer.deposit ? 'active' : ''}`}
                      onClick={() => toggleTransfer('deposit')}
                    >
                      Депозит
                    </button>

                    <button
                      className={`filter-toggle ${filters.transfer.withdraw ? 'active' : ''}`}
                      onClick={() => toggleTransfer('withdraw')}
                    >
                      Вывод
                    </button>

                  </div>
              </div>

            </div>

            <div className="drawer-footer">
              <button className="reset-btn" onClick={() => onFilters(defaultFilters)}>
                СБРОСИТЬ ФИЛЬТРЫ
              </button>
            </div>

          </div>
          
        </>
    )
}

export default FilterDrawer
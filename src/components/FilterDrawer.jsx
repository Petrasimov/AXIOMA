import { EXCHANGES } from "../constants.js"
import { aLog } from "../api.js"

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

  .drawer.mode-funding {
    width: 420px;
  }

  .drawer.mode-funding .drawer-body {
    padding: 28px;
    gap: 32px;
  }

  .drawer.mode-funding .filter-label {
    font-size: 12px;
    letter-spacing: 1.8px;
  }

  .drawer.mode-funding .filter-toggle {
    padding: 8px 16px;
    font-size: 13px;
  }

  .drawer.mode-funding .filter-input {
    padding: 11px 14px;
    font-size: 15px;
  }

  .drawer.mode-funding .filter-input-small {
    width: 76px;
    padding: 7px 10px;
    font-size: 14px;
  }

  .drawer.mode-funding .filter-slider-value {
    font-size: 14px;
    min-width: 44px;
  }

  .drawer.mode-funding .drawer-title {
    font-size: 16px;
  }

  .drawer.mode-funding .reset-btn,
  .drawer.mode-funding .filter-save {
    padding: 13px;
    font-size: 13px;
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
    transition: border-color 0.15s, color 0.15s;
    font-family: var(--font-sans);
    letter-spacing: 1px;
  }

  .reset-btn:hover {
    border-color: var(--error);
    color: var(--error);
  }

  /* ─── Кнопка Telegram уведомлений ─── */
  .notif-btn {
    width: 100%;
    padding: 10px;
    background: transparent;
    font-size: 12px;
    cursor: pointer;
    font-family: var(--font-sans);
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .notif-btn.off {
    border: 1px solid var(--border);
    color: var(--text-secondary);
  }

  .notif-btn.off:hover {
    border-color: var(--success);
    color: var(--success);
  }

  .notif-btn.on {
    border: 1px solid var(--success);
    color: var(--success);
    background: #001810;
  }

  .notif-btn.on:hover {
    background: #002418;
  }

  .drawer.mode-funding .notif-btn {
    padding: 13px;
    font-size: 13px;
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

  .filter-save {
    width: 100%;
    padding: 10px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .filter-save:hover {
    border-color: var(--success);
    color: var(--success);
  }

  .filter-save:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .filter-save.saving {
    border-color: var(--accent);
    color: var(--accent);
    opacity: 0.7;
    cursor: wait;
  }

  .filter-save.saved {
    border-color: var(--success);
    color: var(--success);
  }

  .filter-save.error {
    border-color: var(--error);
    color: var(--error);
  }

`

function FilterDrawer({ open, onClose, filters, onFilters, defaultFilters, onSaveSettings, canSave, saveStatus, mode = 'futures', activeNotifications, onToggleNotifications }) {
    const toggleStrategy = (key) => {
        // Лог переключения стратегии — ключ и новое значение
        const newVal = !filters.strategy[key]
        aLog('log', `[FILTER] toggleStrategy: ${key} → ${newVal}`)
        onFilters(f => ({ ...f, strategy: { ...f.strategy, [key]: !f.strategy[key] } }))
    }

    const toggleExchange = (ex) => {
        const isRemoving = filters.exchanges.includes(ex)
        // Лог переключения биржи — вкл/выкл и итоговый список
        const nextExchanges = isRemoving
            ? filters.exchanges.filter(e => e !== ex)
            : [...filters.exchanges, ex]
        aLog('log', `[FILTER] toggleExchange: ${ex} → ${isRemoving ? 'ВЫКЛ' : 'ВКЛ'} | активных бирж: [${nextExchanges.join(',')}]`)
        onFilters(f => ({
            ...f,
            exchanges: f.exchanges.includes(ex)
                ? f.exchanges.filter(e => e !== ex)
                : [...f.exchanges, ex]
        }))
    }

    const toggleTransfer = (key) => {
        // Лог переключения трансфера — ключ и новое значение
        const newVal = !filters.transfer[key]
        aLog('log', `[FILTER] toggleTransfer: ${key} → ${newVal}`)
        onFilters(f => ({ ...f, transfer: {...f.transfer, [key]: !f.transfer[key] } }))
    }

    const toggleFunding = (key) => {
      onFilters(f => {
        const next = {...f.funding, [key]: !f.funding[key] }
        if (!next.positive && !next.negative) return f
        // Лог переключения funding — ключ и новое значение
        aLog('log', `[FILTER] toggleFunding: ${key} → ${next[key]} | positive=${next.positive} negative=${next.negative}`)
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

          <div className={`drawer ${open ? 'open' : ''} ${mode === 'funding' ? 'mode-funding' : ''}`}>

            <div className="drawer-header">
              <span className="drawer-title">{mode === 'funding' ? 'ФИЛЬТРЫ · FUNDING' : 'ФИЛЬТРЫ'}</span>
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
                    max={mode === 'funding' ? "2" : "20"}
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
                      max={mode === 'funding' ? "2" : "20"}
                      step="0.1"
                      value={filters.minSpread}
                      style={{ '--val': (filters.minSpread / (mode === 'funding' ? 2 : 20)) * 100 }}
                      onChange={e => onFilters(f => ({ ...f, minSpread: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="filter-slider-marks">
                  <span>0%</span>
                  <span>{mode === 'funding' ? '2%' : '20%'}</span>
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

              {mode === 'futures' && (
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
              )}

              {mode === 'futures' && (
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
                        onChange={e => {
                          // Лог переключения onlyPositiveFunding — новое значение
                          aLog('log', `[FILTER] onlyPositiveFunding → ${e.target.checked}`)
                          onFilters(f => ({ ...f, onlyPositiveFunding: e.target.checked }))
                        }}
                      />
                      Только положительный funding spread
                    </label>
                </div>
              )}

              {mode === 'futures' && (
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
              )}

            </div>

            

            <div className="drawer-footer">
              {onToggleNotifications && (
                <button
                  className={`notif-btn ${activeNotifications ? 'on' : 'off'}`}
                  onClick={onToggleNotifications}
                  title={activeNotifications ? 'Выключить Telegram уведомления' : 'Включить Telegram уведомления'}
                >
                  {activeNotifications ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      <circle cx="18" cy="5" r="4" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                  )}
                  {activeNotifications ? 'ВЫКЛЮЧИТЬ УВЕДОМЛЕНИЯ' : 'ВКЛЮЧИТЬ УВЕДОМЛЕНИЯ'}
                </button>
              )}
              <button
                  className={`filter-save${saveStatus ? ' ' + saveStatus : ''}`}
                  onClick={() => {
                    // Лог нажатия кнопки Сохранить — полный snapshot текущих фильтров
                    aLog('log', `[FILTER] Нажата кнопка СОХРАНИТЬ | exchanges=[${filters.exchanges.join(',')}] minSpread=${filters.minSpread} tradeAmount=${filters.tradeAmount}`)
                    aLog('log', `[FILTER] strategy=ff:${filters.strategy?.ff},sf:${filters.strategy?.sf} | funding=pos:${filters.funding?.positive},neg:${filters.funding?.negative} | transfer=dep:${filters.transfer?.deposit},wd:${filters.transfer?.withdraw}`)
                    onSaveSettings()
                  }}
                  disabled={!canSave || saveStatus === 'saving'}
              >
                  {saveStatus === 'saving' && '⏳ СОХРАНЕНИЕ...'}
                  {saveStatus === 'saved'  && '✓ СОХРАНЕНО'}
                  {saveStatus === 'error'  && '✕ ОШИБКА СОХРАНЕНИЯ'}
                  {!saveStatus             && 'СОХРАНИТЬ НАСТРОЙКИ'}
              </button>

              <button className="reset-btn" 
                  onClick={() => {
                    // Лог нажатия кнопки Сбросить — сброс к дефолтным фильтрам
                    aLog('warn', `[FILTER] Нажата кнопка СБРОСИТЬ — возврат к defaultFilters`)
                    onFilters(defaultFilters)
                  }}
              >
                СБРОСИТЬ ФИЛЬТРЫ
              </button>
            </div>

          </div>
          
        </>
    )
}

export default FilterDrawer
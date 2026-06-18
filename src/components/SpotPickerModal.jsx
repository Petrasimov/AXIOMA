/**
 * SpotPickerModal.jsx
 *
 * Промежуточная модалка — показывается только для SF-возможностей
 * у которых несколько доступных спот-бирж (extra_asks непустой).
 * Пользователь выбирает с какой спот-биржей хочет смотреть стакан.
 * После выбора — родитель открывает FundingDetailModal.
 */

import { useState } from 'react'
import { X } from 'lucide-react'

const style = `
  .spm-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(4px);
    z-index: 310;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }

  .spm-modal {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    width: 380px;
    box-shadow: 0 32px 96px rgba(0,0,0,0.7);
    display: flex; flex-direction: column;
    animation: spm-appear 0.15s ease;
  }

  @keyframes spm-appear {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .spm-header {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 18px;
    background: #071828;
    border-bottom: 1px solid #0e2a42;
  }

  .spm-sym {
    font-family: var(--font-mono);
    font-size: 16px; font-weight: 800;
    color: #fff;
  }

  .spm-sym span {
    color: rgba(255,255,255,0.4);
    font-weight: 400; font-size: 12px;
  }

  .spm-spacer { flex: 1; }

  .spm-close {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.65);
    cursor: pointer; width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .spm-close:hover {
    background: rgba(224,62,62,0.2);
    border-color: var(--error); color: var(--error);
  }

  .spm-title {
    padding: 14px 18px 8px;
    font-size: 10px; font-weight: 700;
    letter-spacing: 1.5px; color: var(--text-muted);
    text-transform: uppercase;
  }

  .spm-list {
    padding: 0 12px 14px;
    display: flex; flex-direction: column; gap: 6px;
  }

  .spm-row {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .spm-row:hover {
    border-color: var(--accent-bright);
    background: var(--bg-hover);
  }

  .spm-ex-logo {
    width: 22px; height: 22px; border-radius: 50%;
    object-fit: contain; flex-shrink: 0;
  }
  .spm-ex-fallback {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 8px; font-weight: 800; color: #000; flex-shrink: 0;
  }

  .spm-ex-name {
    font-size: 14px; font-weight: 700;
    color: var(--text-primary);
    flex: 1;
  }

  .spm-ex-tag {
    font-size: 8px; font-weight: 700;
    letter-spacing: 1px; color: var(--text-muted);
  }

  .spm-arrow {
    font-size: 14px; color: var(--accent-bright);
    transition: transform 0.15s;
  }
  .spm-row:hover .spm-arrow { transform: translateX(3px); }
`

function ExLogo({ info }) {
  const [err, setErr] = useState(false)
  if (!err && info.logo) {
    return (
      <img
        className="spm-ex-logo"
        src={info.logo}
        alt={info.name}
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div className="spm-ex-fallback" style={{ background: info.color }}>
      {info.short}
    </div>
  )
}

// Маппинг названий бирж funding-API → getExchangeInfo id
const FUNDING_EX_MAP = {
  'Binance': 'binance', 'BingX': 'bingx', 'Bitget': 'bitget',
  'Bybit': 'bybit', 'Gate.io': 'gate', 'KuCoin': 'kucoin',
  'MEXC': 'mexc', 'OKX': 'okx',
}

function SpotPickerModal({ opp, allSpotExchanges, onSelect, onClose }) {
  // allSpotExchanges — массив строк вида ["BingX","KuCoin","MEXC"]
  // (exchange_ask + extra_asks, уже разобранные родителем)

  const sym = opp.symbol.replace(/[-_]?USDTM?$/i, '')

  return (
    <>
      <style>{style}</style>
      <div className="spm-overlay" onClick={onClose}>
        <div className="spm-modal" onClick={e => e.stopPropagation()}>

          <div className="spm-header">
            <div className="spm-sym">
              {sym}<span>/USDT</span>
            </div>
            <div className="spm-spacer" />
            <button className="spm-close" onClick={onClose}>
              <X size={13} />
            </button>
          </div>

          <div className="spm-title">Выберите спотовую биржу</div>

          <div className="spm-list">
            {allSpotExchanges.map(ex => {
              const wsId = FUNDING_EX_MAP[ex] ?? ex.toLowerCase()
              // Получаем иконку через getExchangeInfo если доступна,
              // иначе рисуем заглушку с первыми буквами
              const info = {
                name: ex,
                short: ex.slice(0, 2).toUpperCase(),
                color: '#2F6997',
                logo: '',
              }

              return (
                <div
                  key={ex}
                  className="spm-row"
                  onClick={() => onSelect(ex)}
                >
                  <ExLogo info={info} />
                  <div className="spm-ex-name">{ex}</div>
                  <div className="spm-ex-tag">SPOT</div>
                  <div className="spm-arrow">→</div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </>
  )
}

export default SpotPickerModal
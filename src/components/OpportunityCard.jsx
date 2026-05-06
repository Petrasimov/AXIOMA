import { getExchangeInfo, getSpreadColor, calcProfit, formatVolume, formatPrice, formatAge, formatTimeRemaining, getAgeIcon, getTransferIcon } from "../utils"
import { Star, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { EXCHANGES } from "../constants"

const style = `
  .opp-card {
    background: #0d1e2d;
    border: 1px solid var(--border);
    overflow: hidden;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
    opacity: 0;
    animation: card-appear 0.3s ease both;
    min-height: 420px;
  }

  .opp-card:hover {
    border-color: var(--accent-bright);
    box-shadow: 0 0 0 1px rgba(47,105,151,0.2), 0 8px 32px rgba(0,0,0,0.55);
  }

  .card-top-bar {
    height: 2px;
    background: var(--spread-color, var(--accent));
    box-shadow: 0 0 14px var(--spread-color, var(--accent));
    flex-shrink: 0;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px 11px;
    flex-shrink: 0;
  }

  .card-symbol {
    font-size: 17px;
    font-weight: 900;
    font-family: var(--font-mono);
    color: var(--text-primary);
    letter-spacing: 0.3px;
    line-height: 1;
  }

  .card-strategy-label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 1.2px;
    color: var(--text-secondary);
    padding: 2px 6px;
    border: 1px solid var(--border);
  }

  .card-age {
    margin-left: auto;
    font-size: 10px;
    color: var(--text-secondary);
    font-family: var(--font-mono);
    display: flex;
    align-items: center;
    gap: 3px;
  }

  /* ─── ТЕЛО — растягивается между хедером и футером ─── */
  .card-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* card-panels растягивается — flex:1 чтобы заполнить всё тело */
  .card-panels {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 10px 10px;
    min-height: 0;
  }

  /* Каждая side-панель тоже растягивается */
  .card-side {
    flex: 1;
    border: 1px solid var(--border);
    padding: 10px 11px 9px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    min-height: 0;
  }

  .card-side::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
  }

  .buy-side {
    background: #030f09;
    border-color: rgba(0,201,122,0.18);
  }

  .buy-side:hover {
    border-color: rgba(0,201,122,0.4);
    box-shadow: inset 0 0 60px rgba(0,201,122,0.08);
  }

  .buy-side::before {
    background: var(--success);
    box-shadow: 0 0 10px var(--success);
  }

  .sell-side {
    background: #0f0404;
    border-color: rgba(224,62,62,0.18);
  }

  .sell-side:hover {
    border-color: rgba(224,62,62,0.4);
    box-shadow: inset 0 0 60px rgba(224,62,62,0.08);
  }

  .sell-side::before {
    background: var(--error);
    box-shadow: 0 0 10px var(--error);
  }

  .side-label {
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 7px;
  }

  .buy-side .side-label { color: var(--success); }
  .sell-side .side-label { color: var(--error); }

  .side-exchange {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 5px;
  }

  .side-exchange-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .side-exchange-type {
    font-size: 9px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .side-price {
    font-size: 18px;
    font-weight: 800;
    font-family: var(--font-mono);
    color: #ECEBEE;
    margin-bottom: 8px;
    line-height: 1;
    padding-bottom: 7px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .side-price span {
    font-size: 10px;
    font-weight: 400;
    color: var(--text-secondary);
    margin-left: 4px;
  }

  .side-rows {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .side-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .side-row-label {
    font-size: 10px;
    color: #2e4556;
    flex-shrink: 0;
    min-width: 64px;
  }

  .side-row-value {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-secondary);
    font-weight: 500;
    text-align: right;
  }

  .side-row-value.green { color: var(--success); }
  .side-row-value.red   { color: var(--error); }
  .side-row-value.muted { color: #2e4556; }

  /* ─── Панель вариантов ─── */
  .card-variants {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
    overflow-y: auto;
    padding: 8px 10px;
    min-height: 0;
  }

  .card-variants::-webkit-scrollbar { width: 3px; }
  .card-variants::-webkit-scrollbar-track { background: transparent; }
  .card-variants::-webkit-scrollbar-thumb { background: var(--border); }

  /* ─── Зона переключения ─── */
  .card-toggle {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 7px 14px;
    margin: 0 10px 6px;
    border: 1px solid var(--border);
    background: rgba(47,105,151,0.06);
    cursor: pointer;
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.8px;
    transition: all 0.15s ease;
    user-select: none;
  }

  .card-toggle:hover {
    border-color: var(--accent);
    color: var(--accent-bright);
    background: rgba(47,105,151,0.12);
  }

  /* ─── Кнопка варианта ─── */
  .variant-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.15s ease;
    width: 100%;
    text-align: left;
    flex-shrink: 0;
  }

  .variant-btn:hover {
    border-color: var(--accent-bright);
    background: var(--bg-hover);
  }

  /* Порядок: продажа → покупка → стратегия → спред → прибыль */
  .vb-sell {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .vb-buy {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .vb-arrow {
    font-size: 11px;
    color: var(--text-muted);
    margin: 0 3px;
    flex-shrink: 0;
  }

  .vb-ex-name {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .vb-market {
    font-size: 8px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .vb-strategy {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--text-muted);
    border: 1px solid var(--border);
    padding: 2px 6px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .vb-spread {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .vb-profit {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--success);
    flex-shrink: 0;
  }

  /* ─── Футер ─── */
  .card-footer {
    padding: 10px 14px 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .footer-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .footer-stat-label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--text-secondary);
  }

  .footer-stat-value {
    font-size: 14px;
    font-weight: 900;
    font-family: var(--font-mono);
    line-height: 1;
  }

  .footer-divider {
    width: 1px;
    height: 32px;
    background: var(--border);
    flex-shrink: 0;
  }

  .footer-profit {
    margin-left: auto;
  }

  .profit-badge {
    display: flex;
    align-items: center;
    padding: 5px 12px;
    font-size: 13px;
    font-weight: 800;
    font-family: var(--font-mono);
    background: rgba(0,201,122,0.18);
    border: 1px solid rgba(0,201,122,0.4);
    color: var(--success);
    white-space: nowrap;
  }

  .card-icon-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    transition: color 0.15s ease;
    flex-shrink: 0;
  }

  .card-icon-btn:hover { color: var(--accent-bright); }
  .card-icon-btn.favorite { color: #f0a500; }
  .card-icon-trash:hover { color: var(--error); }

  @keyframes card-appear {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .opp-card { animation: card-appear 0.3s ease forwards; }
`

function ExLogo({ info }) {
  const [err, setErr] = useState(false)
  if (err || !info.logo) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16,
        background: info.color + '22', border: `1px solid ${info.color}55`,
        fontSize: 8, fontWeight: 700, color: info.color, flexShrink: 0,
      }}>
        {info.short}
      </span>
    )
  }
  return (
    <img
      src={info.logo}
      alt={info.name}
      width={16} height={16}
      style={{ flexShrink: 0, objectFit: 'contain' }}
      onError={() => setErr(true)}
    />
  )
}

function TransferDots({ dep, wdr }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>D:</span>
      <span style={{ fontSize: 10 }}>{getTransferIcon(dep).icon}</span>
      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>W:</span>
      <span style={{ fontSize: 10 }}>{getTransferIcon(wdr).icon}</span>
    </span>
  )
}

// Порядок: биржа продажи → биржа покупки → стратегия → спред → прибыль
function VariantBtn({ variant, tradeAmount, onSelect }) {
  const bidInfo = getExchangeInfo(variant.bid_ex)
  const askInfo = getExchangeInfo(variant.ask_ex)
  const spreadColor = getSpreadColor(variant.spread)
  const stratLabel = variant.strategy === 'sf' ? 'SPOT · FUTURES' : 'FUTURES · FUTURES'

  return (
    <button
      className="variant-btn"
      onClick={e => { e.stopPropagation(); onSelect(variant) }}
    >
      {/* Биржа продажи (ASK) — только лого */}
      <ExLogo info={askInfo} />

      <span className="vb-arrow">→</span>

      {/* Биржа покупки (BID) — только лого */}
      <ExLogo info={bidInfo} />

      {/* Стратегия по центру */}
      <span className="vb-strategy" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
        {stratLabel}
      </span>

      {/* Спред */}
      <span className="vb-spread" style={{ color: spreadColor }}>
        {variant.spread.toFixed(2)}%
      </span>
    </button>
  )
}

function OpportunityCard({ opp, tradeAmount, onSelect, isFavorite, onFavorite, onHide, index }) {
  const [expanded, setExpanded] = useState(false)

  const bidInfo = getExchangeInfo(opp.bid_ex)
  const askInfo = getExchangeInfo(opp.ask_ex)
  const spreadColor = getSpreadColor(opp.spread)

  const bidRate    = opp.bid_funding?.rate ?? null
  const askRate    = opp.ask_funding?.rate ?? null
  const bidNextTime = opp.bid_funding?.next_time
  const askNextTime = opp.ask_funding?.next_time

  const fundingSpread = opp.strategy === 'sf'
    ? (askRate ?? 0)
    : (askRate ?? 0) - (bidRate ?? 0)

  const profit   = calcProfit(opp.spread, tradeAmount)
  const sym      = opp.symbol.replace(/USDT$/, '')
  const bidType = opp.bid_market === 'spot' ? 'SPOT' : 'FUTURES'
  const askType = opp.ask_market === 'spot' ? 'SPOT' : 'FUTURES'
  const stratLabel = opp.strategy === 'sf' ? 'SPOT · FUTURES' : 'FUTURES · FUTURES'
  const hasVariants = opp.variants?.length > 0

  const bidUrl = opp.bid_market === 'spot'
    ? (EXCHANGES[opp.bid_ex]?.spotUrl?.(sym) ?? '#')
    : (EXCHANGES[opp.bid_ex]?.futuresUrl?.(sym) ?? '#')
  const askUrl = opp.ask_market === 'spot'
    ? (EXCHANGES[opp.ask_ex]?.spotUrl?.(sym) ?? '#')
    : (EXCHANGES[opp.ask_ex]?.futuresUrl?.(sym) ?? '#')
    
  function FundingRow({ rate, nextTime, isSpot }) {
    if (isSpot) return (
      <div className="side-row">
        <span className="side-row-label">Funding</span>
        <span className="side-row-value muted">— spot</span>
      </div>
    )
    if (rate === null) return (
      <div className="side-row">
        <span className="side-row-label">Funding</span>
        <span className="side-row-value muted">N/A</span>
      </div>
    )
    const remaining = formatTimeRemaining(nextTime)
    return (
      <div className="side-row">
        <span className="side-row-label">Funding</span>
        <span className={`side-row-value ${rate >= 0 ? 'green' : 'red'}`}>
          {rate >= 0 ? '+' : ''}{rate.toFixed(4)}%
          {remaining !== '—' && (
            <span style={{ color: 'var(--text-secondary)', fontSize: 10, marginLeft: 4 }}>
              · {remaining}
            </span>
          )}
        </span>
      </div>
    )
  }

  const variantCount = opp.variants?.length ?? 0
  const variantLabel = variantCount === 1 ? 'вариант'
    : variantCount < 5 ? 'варианта' : 'вариантов'

  return (
    <>
      <style>{style}</style>
      <div
        className="opp-card"
        style={{
          '--spread-color': spreadColor,
          animationDelay: `${index * 0.08}s`
        }}
        onClick={() => onSelect(opp)}
      >
        <div className="card-top-bar" />

        {/* ХЕДЕР */}
        <div className="card-header">
          <span className="card-symbol">
            {sym}
            <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 12 }}>/USDT</span>
          </span>
          <span className="card-strategy-label">{stratLabel}</span>
          <span className="card-age">{getAgeIcon(opp.first_seen)} {formatAge(opp.first_seen)}</span>
          <button
            className={`card-icon-btn ${isFavorite ? 'favorite' : ''}`}
            onClick={e => { e.stopPropagation(); onFavorite(opp.id) }}
          >
            <Star size={13} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            className="card-icon-btn card-icon-trash"
            onClick={e => { e.stopPropagation(); onHide(opp.id) }}
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* ТЕЛО — растягивается */}
        <div className="card-body">

          {/* ПАНЕЛЬ A — красная + зелёная
              flex:1 → занимает всё тело когда expanded=false
              display:none → скрыта когда expanded=true (данные кэшируются) */}
          <div
            className="card-panels"
            style={{ display: expanded ? 'none' : 'flex' }}
          >
            {/* SELL */}
            <div className="card-side sell-side" onClick={e => {
              e.stopPropagation()
              window.open(askUrl, '_blank', 'noopener')
            }}>
              <div className="side-label">Sell</div>
              <div className="side-exchange">
                <ExLogo info={askInfo} />
                <span className="side-exchange-name">{askInfo.name}</span>
                <span className="side-exchange-type">{askType}</span>
              </div>
              <div className="side-price">
                {formatPrice(opp.ask_price)}<span>USDT</span>
              </div>
              <div className="side-rows">
                <div className="side-row">
                  <span className="side-row-label">Bid vol</span>
                  <span className="side-row-value">
                    {opp.ask_volume != null && opp.ask_volume > 0 ? formatVolume(opp.ask_volume) : 'N/A'}
                  </span>
                </div>
                <div className="side-row">
                  <span className="side-row-label">Max size</span>
                  <span className="side-row-value" style={{ color: '#5bb8f5' }}>
                    {opp.ask_max_size != null && opp.ask_max_size > 0
                      ? '~' + formatVolume(opp.ask_max_size) + ' $'
                      : 'N/A'}
                  </span>
                </div>
                <FundingRow rate={bidRate} nextTime={bidNextTime} isSpot={opp.bid_market === 'spot'} />
                <div className="side-row">
                  <span className="side-row-label">Networks</span>
                  <TransferDots dep={opp.ask_transfer?.deposit} wdr={opp.ask_transfer?.withdraw} />
                </div>
              </div>
            </div>

            {/* BUY */}
            <div className="card-side buy-side" onClick={e => {
              e.stopPropagation()
              window.open(bidUrl, '_blank', 'noopener')
            }}>
              <div className="side-label">Buy</div>
              <div className="side-exchange">
                <ExLogo info={bidInfo} />
                <span className="side-exchange-name">{bidInfo.name}</span>
                <span className="side-exchange-type">{bidType}</span>
              </div>
              <div className="side-price">
                {formatPrice(opp.bid_price)}<span>USDT</span>
              </div>
              <div className="side-rows">
                <div className="side-row">
                  <span className="side-row-label">Ask vol</span>
                  <span className="side-row-value">
                    {opp.bid_volume != null && opp.bid_volume > 0 ? formatVolume(opp.bid_volume) : 'N/A'}
                  </span>
                </div>
                <div className="side-row">
                  <span className="side-row-label">Max size</span>
                  <span className="side-row-value" style={{ color: '#5bb8f5' }}>
                    {opp.bid_max_size != null && opp.bid_max_size > 0
                      ? '~' + formatVolume(opp.bid_max_size) + ' $'
                      : 'N/A'}
                  </span>
                </div>
                <FundingRow
                  rate={bidRate}
                  nextTime={bidNextTime}
                  isSpot={opp.strategy === 'sf'}
                />
                <div className="side-row">
                  <span className="side-row-label">Networks</span>
                  <TransferDots dep={opp.bid_transfer?.deposit} wdr={opp.bid_transfer?.withdraw} />
                </div>
              </div>
            </div>
          </div>

          {/* ПАНЕЛЬ B — варианты
              flex:1 → занимает то же место что панель A
              display:none → скрыта когда !expanded */}
          <div
            className="card-variants"
            style={{ display: expanded ? 'flex' : 'none' }}
          >
            {opp.variants?.map(variant => (
              <VariantBtn
                key={variant.id}
                variant={variant}
                tradeAmount={tradeAmount}
                onSelect={onSelect}
              />
            ))}
          </div>

        </div>
        {/* конец card-body */}

        {/* ЗОНА ПЕРЕКЛЮЧЕНИЯ — только если есть варианты */}
        {hasVariants && (
          <div
            className="card-toggle"
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          >
            {expanded
              ? <><ChevronUp size={12} /> закрыть варианты</>
              : <><ChevronDown size={12} /> ещё {variantCount} {variantLabel}</>
            }
          </div>
        )}

        {/* ФУТЕР — всегда виден */}
        <div className="card-footer">
          <div className="footer-stat">
            <span className="footer-stat-label">Price Spread</span>
            <span className="footer-stat-value" style={{ color: spreadColor }}>
              {opp.spread.toFixed(2)}%
            </span>
          </div>
          <div className="footer-divider" />
          <div className="footer-stat">
            <span className="footer-stat-label">Funding Spread</span>
            <span className="footer-stat-value" style={{ color: fundingSpread >= 0 ? 'var(--success)' : 'var(--error)' }}>
              {fundingSpread >= 0 ? '+' : ''}{fundingSpread.toFixed(4)}%
            </span>
          </div>
          <div className="footer-profit">
            <div className="profit-badge">+${profit}</div>
          </div>
        </div>

      </div>
    </>
  )
}

export default OpportunityCard
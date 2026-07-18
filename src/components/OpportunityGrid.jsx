import { useState, useEffect } from "react"
import OpportunityCard from "./OpportunityCard.jsx"
import { getExchangeInfo, getSpreadColor, calcProfit, formatVolume, formatAge, formatPrice, formatTimeRemaining, getAgeIcon } from "../utils"

// Порог мобильного режима — тот же, что у Sidebar.jsx (Партия 1) и
// остальных файлов Партии 2.
const MOBILE_BREAKPOINT = 1024

// Продуктовое решение: на мобиле доступен только режим карточек.
// Кнопка переключения в Header.jsx уже скрыта на этой ширине, но это
// не единственная защита — viewMode='table' может прийти из localStorage
// с прошлой десктопной сессии (человек открыл сайт на телефоне после
// того, как переключал вид на компьютере). Поэтому здесь отдельная,
// не зависящая от Header, проверка реальной ширины экрана.
function useIsMobileViewport() {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false
    )

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
        const handler = e => setIsMobile(e.matches)
        // addEventListener на MediaQueryList поддерживают все актуальные браузеры;
        // addListener — устаревший, но более широко совместимый фолбэк.
        if (mq.addEventListener) mq.addEventListener('change', handler)
        else mq.addListener(handler)
        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', handler)
            else mq.removeListener(handler)
        }
    }, [])

    return isMobile
}

const style = `
    .grid-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
    }

    .grid-view {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
        gap: 12px;
    }


    .table-wrapper {
        background: var(--glass-fill);
        backdrop-filter: blur(18px) saturate(140%);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-glass);
        overflow: hidden;
        margin: 20px;
    }

    /* ══════════════════════════════════════════════════════════════
       МОБИЛЬНАЯ АДАПТАЦИЯ (Партия 2, MOBILE_PLAN.md)
       ══════════════════════════════════════════════════════════════
       БАГ: minmax(360px, 1fr) требует минимум 360px на карточку.
       На телефоне после padding:16px с обеих сторон доступно
       заметно меньше 360px (например ~330px на экране 360px шириной) —
       колонка физически не помещается, сетка вылезала бы за край
       экрана горизонтальным скроллом или обрезкой. Одна колонка
       снимает проблему полностью при любой ширине экрана.

       Режим таблицы на мобиле не рендерится вообще (см. JS ниже,
       effectiveViewMode) — .table-wrapper/.table-view media-правила
       здесь не нужны.
    */
    @media (max-width: 1024px) {
        .grid-container { padding: 12px; }
        .grid-view { grid-template-columns: 1fr; }
    }

    .table-view {
        width: 100%;
        border-collapse: collapse;
    }

    .table-view thead {
        background: rgba(255,255,255,0.02);
        backdrop-filter: blur(18px);
        position: sticky;
        top: 0;
        z-index: 1;
    }

    .table-view th {
        text-align: left;
        padding: 12px 14px;
        font-size: 10px;
        color: var(--accent-bright);
        letter-spacing: 1.5px;
        text-transform: uppercase;
        border-bottom: 1px solid var(--glass-border);
        font-weight: 700;
        white-space: nowrap;
    }


    .table-row {
        border-bottom: 1px solid var(--glass-border);
        cursor: pointer;
        transition: background 0.15s ease;
    }

    .table-row:last-child {
        border-bottom: none;
    }

    .table-row:hover {
        background: rgba(93,163,214,0.08);
    }

    .table-row td {
        padding: 10px 14px;
        font-size: 12px;
        color: var(--text-secondary);
        font-family: var(--font-mono);
        white-space: nowrap;
    }

    .td-num {
        color: var(--text-muted) !important;
        font-size: 10px !important;
        width: 32px;
    }

    .td-symbol {
        color: var(--text-primary) !important;
        font-weight: 700;
        font-size: 13px !important;
    }

    .td-symbol span {
        color: var(--text-muted);
        font-weight: 400;
        font-size: 10px;
    }

    .td-strategy-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border: 1px solid currentColor;
        border-radius: 20px;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1px;
    }

    .td-exchange {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .td-exchange-logo {
        width: 18px;
        height: 18px;
        border-radius: 3px;
        object-fit: contain;
        flex-shrink: 0;
    }

    .td-exchange-name {
        color: var(--text-primary);
        font-weight: 600;
    }

    .td-exchange-type {
        color: var(--text-muted);
        font-size: 10px;
        font-weight: 400;
    }

    .td-profit {
        color: var(--success) !important;
        font-weight: 700;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--text-muted);
        font-size: 13px;
        gap: 8px;
    }

`

function OpportunityGrid({ opportunities, viewMode, tradeAmount, onSelect, favorites, onFavorite, onHide}) {
    const isMobile = useIsMobileViewport()
    // На мобиле режим карточек — единственный доступный, независимо от
    // того, что сохранено в viewMode (см. комментарий у useIsMobileViewport).
    const effectiveViewMode = isMobile ? 'grid' : viewMode

    if (!opportunities.length) {
        return (
            <>
                <style>{style}</style>
                <div className="grid-container">
                    <div className="empty-state">
                        <span>Нет возможностей</span>
                        <span style={{ fontSize: '11px'}}>Попробуйте изменить фильтры</span>
                    </div>
                </div>
            </>
        )
    }

    if (effectiveViewMode === 'table') {
        return (
            <>
                <style>{style}</style>
                <div className="grid-container">
                    <div className="table-wrapper">
                        <table className="table-view">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Symbol</th>
                                    <th>Strategy</th>
                                    <th>Spread</th>
                                    <th>Buy Exchange</th>
                                    <th>Sell Exchange</th>
                                    <th>Buy Price</th>
                                    <th>Sell Price</th>
                                    <th>Funding</th>
                                    <th>Max Vol</th>
                                    <th>Age</th>
                                    <th>Est. Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {opportunities.map((opp, index) => {
                                    const bidEx = getExchangeInfo(opp.bid_ex)
                                    const askEx = getExchangeInfo(opp.ask_ex)
                                    const spreadColor = getSpreadColor(opp.spread)
                                    const bidRate = opp.bid_funding?.rate ?? 0
                                    const askRate = opp.ask_funding?.rate ?? 0
                                    const fundingSpread = opp.strategy === 'sf'
                                        ? askRate
                                        : bidRate - askRate
                                    const bidType = opp.strategy === 'sf' ? 'Spot' : 'Futures'
                                    const askType = 'Futures'

                                    return (
                                        <tr
                                            key={opp.id}
                                            className="table-row"
                                            onClick={() => onSelect(opp)}
                                        >
                                            <td className="td-num">{index + 1}</td>

                                            <td className="td-symbol">
                                                {opp.symbol.replace('USDT', '')}
                                                <span>/USDT</span>
                                            </td>

                                            <td>
                                                <span className="td-strategy-badge" style={{
                                                    color: opp.strategy === 'ff' ? 'var(--accent-bright)' : 'var(--warning)'
                                                }}>
                                                    {opp.strategy.toUpperCase()}
                                                </span>
                                            </td>

                                            <td style={{ color: spreadColor, fontWeight: 700 }}>
                                                {opp.spread.toFixed(2)}%
                                            </td>

                                            <td>
                                                <div className="td-exchange">
                                                    <img className="td-exchange-logo" src={bidEx.logo} alt={bidEx.name} />
                                                    <span className="td-exchange-name">{bidEx.name}</span>
                                                    <span className="td-exchange-type">{bidType}</span>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="td-exchange">
                                                    <img className="td-exchange-logo" src={askEx.logo} alt={askEx.name} />
                                                    <span className="td-exchange-name">{askEx.name}</span>
                                                    <span className="td-exchange-type">{askType}</span>
                                                </div>
                                            </td>

                                            <td>{formatPrice(opp.bid_price)}</td>
                                            <td>{formatPrice(opp.ask_price)}</td>

                                            <td style={{ color: fundingSpread >= 0 ? 'var(--success)' : 'var(--error)' }}>
                                                {fundingSpread >= 0 ? '+' : ''}{fundingSpread.toFixed(4)}%
                                            </td>

                                            <td>
                                                {opp.max_volume_entry ? '~' + formatVolume(opp.max_volume_entry) : 'N/A'}
                                            </td>

                                            <td>{getAgeIcon(opp.first_seen)} {formatAge(opp.first_seen)}</td>

                                            <td className="td-profit">
                                                +${calcProfit(opp.spread, tradeAmount)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <style>{style}</style>
            <div className="grid-container">
                <div className="grid-view">
                    {opportunities.map((opp, index) => (
                        <OpportunityCard
                            key={opp.id}
                            opp={opp}
                            tradeAmount={tradeAmount}
                            onSelect={onSelect}
                            isFavorite={favorites.includes(opp.id)}
                            onFavorite={onFavorite}
                            onHide={onHide}
                            index={index}
                        />
                    ))}
                </div>
            </div>
        </>
    )
}

export default OpportunityGrid
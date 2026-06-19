/**
 * FundingPage.jsx
 *
 * Страница "Funding → CEX-CEX".
 * Отображает арбитражные возможности по funding rate (FF + SF)
 * из отдельного Python-сервиса (Funding-Present), порт 5001.
 *
 * v2:
 * - Шапка 72px, стиль идентичен Header.jsx (FUTURES ARBITRAGE паттерн)
 * - Кнопка "Фильтры" открывает общий FilterDrawer (mode="funding")
 * - Убрана сортировка (всегда по убыванию спреда) и второй tab-бар не нужен
 * - Полные названия табов: ALL / FUTURES-FUTURES / SPOT-FUTURES
 * - Карточки уже — 3+ колонки в зависимости от ширины экрана
 * - Profit считается от общего filters.tradeAmount (общий с futures-сканером)
 */

import { useState, useEffect, useRef } from "react"
import { Percent, SlidersHorizontal, Star, Trash2, ArrowRight } from "lucide-react"
import SpotPickerModal    from './SpotPickerModal.jsx'
import FundingDetailModal from './FundingDetailModal.jsx'
import FundingActiveBar   from './FundingActiveBar.jsx'

// ─── API ──────────────────────────────────────────────────────────────────────

const FUNDING_API_BASE = import.meta.env.PROD
    ? '/api/funding'
    : 'http://localhost:5001/api/funding'

const POLL_INTERVAL = 45000

async function fetchFundingRates() {
    const res = await fetch(`${FUNDING_API_BASE}/rates?limit=2000`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
}

// ─── Хелперы ──────────────────────────────────────────────────────────────────

/**
 * Стабильный ключ возможности. КРИТИЧНО: db.py делает DELETE+INSERT каждый
 * цикл (~60с), поэтому числовой `id` из БД меняется каждый раз — он не подходит
 * как ключ для избранного/скрытого. Используем то, что физически идентифицирует
 * саму возможность и остаётся неизменным между циклами.
 */
function oppKey(opp) {
    return `${opp.strategy}:${opp.symbol}:${opp.exchange_bid}:${opp.exchange_ask || ''}`
}

/**
 * Разбивает символ на базовую часть + нормализованный суффикс "USDT".
 * Источники дают разный формат: BTW-USDT, WL_USDTM, PORTALUSDT, BTWUSDTM —
 * разделитель (-/_) и хвостовая M (от *USDTM, маркер perpetual у некоторых
 * бирж) всегда отбрасываются, суффикс всегда рисуется как чистое "USDT".
 */
function splitSymbol(symbol) {
    if (!symbol) return { base: '', suffix: '' }
    const match = symbol.match(/^(.*?)[-_]?USDTM?$/i)
    if (!match || !match[1]) return { base: symbol, suffix: '' }
    return { base: match[1], suffix: 'USDT' }
}

// ─── Избранное / скрытые — ИЗОЛИРОВАНО от futures-сканера ────────────────────
// Собственные ключи localStorage, никак не связанные с isFavorite/onFavorite/onHide
// из App.jsx/OpportunityCard.jsx. Избранное и скрытые здесь касаются только
// карточек funding-арбитража и не пересекаются с futures ни в данных, ни в UI.

const FUNDING_FAVORITES_KEY = 'funding_favorites'
const FUNDING_HIDDEN_KEY    = 'funding_hidden'

function loadIdSet(key) {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return new Set()
        const arr = JSON.parse(raw)
        return new Set(Array.isArray(arr) ? arr : [])
    } catch {
        return new Set()
    }
}

function saveIdSet(key, set) {
    try {
        localStorage.setItem(key, JSON.stringify([...set]))
    } catch {
        // localStorage недоступен (приватный режим и т.п.) — тихо игнорируем
    }
}

/** Хук с persisted Set избранных/скрытых id, полностью отдельный для funding. */
function usePersistedIdSet(storageKey) {
    const [ids, setIds] = useState(() => loadIdSet(storageKey))

    const toggle = (id) => {
        setIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            saveIdSet(storageKey, next)
            return next
        })
    }

    return [ids, toggle]
}

function loadMap(key) {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return new Map()
        const obj = JSON.parse(raw)
        return new Map(Object.entries(obj))
    } catch {
        return new Map()
    }
}

function saveMap(key, map) {
    try {
        localStorage.setItem(key, JSON.stringify(Object.fromEntries(map)))
    } catch {
        // localStorage недоступен — тихо игнорируем
    }
}

/**
 * Хук с persisted Map<key, snapshot>. Используется для скрытых возможностей —
 * храним не только сам факт "скрыто", но и снимок (symbol/strategy/exchanges),
 * чтобы список в корзине можно было показать даже если возможность временно
 * пропала из текущего API-ответа (биржа перестала отдавать funding на цикл и т.п.).
 */
function usePersistedMap(storageKey) {
    const [map, setMap] = useState(() => loadMap(storageKey))

    const add = (key, snapshot) => {
        setMap(prev => {
            const next = new Map(prev)
            next.set(key, snapshot)
            saveMap(storageKey, next)
            return next
        })
    }

    const remove = (key) => {
        setMap(prev => {
            const next = new Map(prev)
            next.delete(key)
            saveMap(storageKey, next)
            return next
        })
    }

    return [map, add, remove]
}

function parseExtraAsks(raw) {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

/** Профит на сумму сделки (одна нога) при данном спреде. */
function calcProfit(spread, tradeAmount) {
    if (spread == null || isNaN(spread)) return '0.00'
    return (spread / 100 * tradeAmount).toFixed(2)
}

function formatRate(rate) {
    if (rate == null) return '—'
    const sign = rate >= 0 ? '+' : ''
    return `${sign}${rate.toFixed(6)}`
}

/**
 * Точный остаток времени до next_funding_time (реальный timestamp с биржи).
 * isoString — ISO 8601 строка из API (next_funding_time из БД), либо null/undefined
 * если биржа не вернула это поле в текущем цикле — в этом случае честно
 * показываем что время неизвестно, никаких абстракций/заглушек.
 */
function formatCountdown(isoString) {
    if (!isoString) return null

    const targetMs = new Date(isoString).getTime()
    if (isNaN(targetMs)) return null

    const diffMs = targetMs - Date.now()
    if (diffMs <= 0) return 'now'

    const totalSec = Math.floor(diffMs / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60

    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
    if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
    return `${s}s`
}

// ─── Стили ────────────────────────────────────────────────────────────────────

const style = `
    .funding-page {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
    }

    /* Шапка — идентична Header.jsx (72px) */
    .fp-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 20px;
        height: 72px;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
    }

    .fp-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: 2px;
        margin-right: auto;
    }

    .fp-title span {
        color: var(--accent-bright);
    }

    .fp-header-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-secondary);
        font-size: 14px;
        font-family: var(--font-sans);
        cursor: pointer;
        transition: all 0.15s ease;
        letter-spacing: 0.5px;
        white-space: nowrap;
    }

    .fp-header-btn:hover {
        border-color: var(--accent);
        color: var(--text-primary);
    }

    .fp-hidden-wrap {
        position: relative;
    }

    .fp-header-icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 39px;
        height: 39px;
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;
        position: relative;
    }

    .fp-header-icon-btn:hover {
        border-color: var(--accent);
        color: var(--text-primary);
    }

    .fp-hidden-count {
        position: absolute;
        top: -6px;
        right: -6px;
        background: var(--error);
        color: white;
        font-size: 10px;
        font-weight: 700;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
    }

    .fp-hidden-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        background: var(--bg-card);
        border: 1px solid var(--border);
        min-width: 280px;
        max-height: 360px;
        overflow-y: auto;
        z-index: 100;
    }

    .fp-hidden-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 14px;
        border-bottom: 1px solid var(--border);
        transition: background 0.15s ease;
    }

    .fp-hidden-row:last-child { border-bottom: none; }
    .fp-hidden-row:hover { background: var(--bg-hover); }

    .fp-hidden-row-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
    }

    .fp-hidden-row-sym {
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 700;
        color: var(--text-primary);
    }

    .fp-hidden-row-meta {
        font-size: 10px;
        color: var(--text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .fp-hidden-restore-btn {
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-secondary);
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: all 0.15s ease;
    }

    .fp-hidden-restore-btn:hover {
        border-color: var(--accent);
        color: var(--accent-bright);
    }

    /* Tab bar — крупнее, полные названия */
    .fp-tabbar {
        display: flex;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
    }

    .fp-tab {
        padding: 0 24px;
        height: 44px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: var(--text-muted);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        user-select: none;
        transition: color 0.15s, border-color 0.15s;
    }

    .fp-tab:hover { color: var(--text-secondary); }

    .fp-tab.on {
        color: var(--accent-bright);
        border-bottom-color: var(--accent-bright);
    }

    .fp-tab-count {
        font-size: 9px;
        padding: 2px 7px;
        border: 1px solid var(--border);
        font-weight: 700;
        color: var(--text-muted);
    }

    .fp-tab.on .fp-tab-count {
        color: var(--accent-bright);
        border-color: rgba(61,135,192,0.3);
        background: rgba(61,135,192,0.07);
    }

    .fp-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 18px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        align-content: start;
        align-items: stretch;
        background-image: radial-gradient(rgba(26, 58, 82, 0.5) 1px, transparent 1px);
        background-size: 32px 32px;
        background-color: var(--bg-primary);
    }

    /* Явное число колонок по ширине экрана — без auto-fit/minmax,
       чтобы не оставалось пустого пространства на последней карточке
       в ряду независимо от вкладки (ALL/FF/SF) и наличия скроллбара. */
    @media (min-width: 1900px) {
        .fp-content { grid-template-columns: repeat(5, 1fr); }
    }
    @media (min-width: 1500px) and (max-width: 1899px) {
        .fp-content { grid-template-columns: repeat(4, 1fr); }
    }
    @media (min-width: 1100px) and (max-width: 1499px) {
        .fp-content { grid-template-columns: repeat(3, 1fr); }
    }
    @media (min-width: 700px) and (max-width: 1099px) {
        .fp-content { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 699px) {
        .fp-content { grid-template-columns: 1fr; }
    }

    .fp-content::-webkit-scrollbar { width: 4px; }
    .fp-content::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 2px; }

    .fp-card {
        background: var(--bg-card);
        border: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        transition: border-color 0.15s;
        height: 100%;
        min-width: 0;
    }

    .fp-card:hover { border-color: var(--accent); }

    .fp-card-top {
        padding: 16px 18px 13px;
        border-bottom: 1px solid var(--border);
    }

    .fp-row1 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 9px;
    }

    .fp-sym {
        font-size: 17px;
        font-weight: 900;
        font-family: var(--font-mono);
        color: var(--text-primary);
        letter-spacing: 0.3px;
        line-height: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .fp-sym-suffix {
        color: var(--text-secondary);
        font-weight: 400;
        font-size: 12px;
    }

    .fp-badge {
        font-size: 9px;
        font-weight: 600;
        letter-spacing: 1.2px;
        color: var(--text-secondary);
        padding: 2px 6px;
        border: 1px solid var(--border);
        flex-shrink: 0;
        white-space: nowrap;
    }

    .fp-row1-spacer { flex: 1; }

    .fp-icon-btn {
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

    .fp-icon-btn:hover { color: var(--accent-bright); }
    .fp-icon-btn.favorite { color: #f0a500; }
    .fp-icon-btn.trash:hover { color: var(--error); }

    .fp-spread {
        font-family: var(--font-mono);
        font-size: 26px;
        font-weight: 700;
        line-height: 1;
        margin-bottom: 3px;
    }

    .fp-spread.ff { color: var(--accent-bright); }
    .fp-spread.sf { color: var(--warning); }

    .fp-label {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: var(--text-muted);
        text-transform: uppercase;
    }

    .fp-card-mid {
        padding: 13px 18px;
        display: flex;
        align-items: stretch;
        gap: 0;
        flex: 1;
    }

    .fp-side {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    .fp-side-type {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
    }

    .fp-side-type.sell { color: rgba(224,62,62,0.7); }
    .fp-side-type.buy  { color: rgba(0,201,122,0.7); }

    .fp-side-ex {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .fp-side-rate {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .fp-side-funding {
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 600;
        color: var(--accent-bright);
        white-space: nowrap;
    }

    .fp-side-funding.soon {
        color: var(--warning);
    }

    .fp-side-funding.unknown {
        color: var(--text-muted);
    }

    .fp-mid-sep {
        width: 1px;
        background: var(--border);
        margin: 0 12px;
        flex-shrink: 0;
    }

    .fp-asks {
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 0;
        flex-shrink: 1;
        max-width: 50%;
    }

    .fp-ask-ex {
        display: flex;
        align-items: center;
        gap: 7px;
    }

    .fp-ask-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: rgba(0,201,122,0.4);
        flex-shrink: 0;
    }

    .fp-ask-name {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Футер — тот же стиль что в карточке фьючерсного арбитража:
       footer-stat (label + value) слева, закрашенный profit-badge справа */
    .fp-card-bot {
        padding: 10px 16px;
        background: rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
    }

    /* Обе половины футера равной ширины — поэтому разделитель всегда строго посередине,
       независимо от длины текста слева (длинные countdown типа "7h 13m" не сдвигают центр) */
    .fp-footer-stat {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .fp-footer-stat-label {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1px;
        color: var(--text-muted);
        text-transform: uppercase;
    }

    .fp-footer-stat-value {
        font-family: var(--font-mono);
        font-size: 14px;
        font-weight: 700;
        color: var(--accent-bright);
        white-space: nowrap;
    }

    /* Скоро начисление (≤5 минут) — предупреждающий цвет */
    .fp-footer-stat-value.soon {
        color: var(--warning);
    }

    /* Неизвестно (биржа не вернула next_funding_time) — честно, без маскировки под данные */
    .fp-footer-stat-value.unknown {
        color: var(--text-muted);
    }

    .fp-footer-divider {
        width: 1px;
        height: 26px;
        background: var(--border);
        margin: 0 16px;
        flex-shrink: 0;
    }

    .fp-footer-profit {
        flex: 1;
        display: flex;
        justify-content: flex-end;
    }

    .fp-profit-badge {
        font-family: var(--font-mono);
        font-size: 16px;
        font-weight: 700;
        color: var(--success);
        background: rgba(0,201,122,0.12);
        border: 1px solid rgba(0,201,122,0.4);
        padding: 7px 18px;
        white-space: nowrap;
        letter-spacing: 0.3px;
    }

    .fp-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        color: var(--text-muted);
        grid-column: 1 / -1;
    }

    .fp-state-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
    }

    .fp-state-sub {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-muted);
    }
`

// ─── Таймер до начисления funding ──────────────────────────────────────────────

/**
 * Самостоятельно тикающий countdown — обновляется раз в секунду
 * без перерендера всего списка карточек. Если nextFundingTime
 * не пришёл с биржи (null) — честно показывает "—", без абстрактных заглушек.
 */
/** Общий тикающий countdown-хук — раз в секунду, без лишних перерендеров родителя. */
function useCountdownLabel(nextFundingTime) {
    const [label, setLabel] = useState(() => formatCountdown(nextFundingTime))

    useEffect(() => {
        setLabel(formatCountdown(nextFundingTime))
        if (!nextFundingTime) return
        const id = setInterval(() => {
            setLabel(formatCountdown(nextFundingTime))
        }, 1000)
        return () => clearInterval(id)
    }, [nextFundingTime])

    const isUnknown = label === null
    let isSoon = false
    if (!isUnknown && nextFundingTime) {
        const diffMs = new Date(nextFundingTime).getTime() - Date.now()
        isSoon = diffMs > 0 && diffMs <= 5 * 60 * 1000
    }

    return { label, isUnknown, isSoon }
}

/** Футер карточки — крупный countdown с лейблом "Funding In". */
function FundingCountdown({ nextFundingTime }) {
    const { label, isUnknown, isSoon } = useCountdownLabel(nextFundingTime)

    return (
        <div className="fp-footer-stat">
            <span className="fp-footer-stat-label">Funding In</span>
            <span className={`fp-footer-stat-value ${isUnknown ? 'unknown' : ''} ${isSoon ? 'soon' : ''}`}>
                {isUnknown ? '—' : label}
            </span>
        </div>
    )
}

/** Компактный countdown под каждой биржей в FF-карточке — без лейбла, мелкий текст. */
function MiniCountdown({ nextFundingTime }) {
    const { label, isUnknown, isSoon } = useCountdownLabel(nextFundingTime)

    return (
        <span className={`fp-side-funding ${isUnknown ? 'unknown' : ''} ${isSoon ? 'soon' : ''}`}>
            {isUnknown ? '—' : label}
        </span>
    )
}

// ─── Карточка FF ──────────────────────────────────────────────────────────────

function FFCard({ opp, tradeAmount, isFavorite, isHidden, onToggleFavorite, onToggleHide, onClick }) {
    const profit = calcProfit(opp.spread, tradeAmount)
    const { base, suffix } = splitSymbol(opp.symbol)
    if (isHidden) return null
    return (
        <div className="fp-card" onClick={onClick} style={{ cursor: 'pointer' }}>
            <div className="fp-card-top">
                <div className="fp-row1">
                    <div className="fp-sym">
                        {base}
                        <span className="fp-sym-suffix">/{suffix}</span>
                    </div>
                    <div className="fp-badge">FUTURES-FUTURES</div>
                    <div className="fp-row1-spacer"></div>
                    <button
                        className={`fp-icon-btn ${isFavorite ? 'favorite' : ''}`}
                        onClick={e => { e.stopPropagation(); onToggleFavorite(opp.id) }}
                        title="В избранное"
                    >
                        <Star size={13} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        className="fp-icon-btn trash"
                        onClick={e => { e.stopPropagation(); onToggleHide(opp.id) }}
                        title="Скрыть"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
                <div className="fp-spread ff">{opp.spread?.toFixed(4)}%</div>
                <div className="fp-label">Spread</div>
            </div>
            <div className="fp-card-mid">
                <div className="fp-side">
                    <div className="fp-side-type sell">Short ({formatRate(opp.funding_rate_bid)})</div>
                    <div className="fp-side-ex">{opp.exchange_bid}</div>
                    <div className="fp-side-rate">Futures</div>
                    <MiniCountdown nextFundingTime={opp.next_funding_time_bid} />
                </div>
                <div className="fp-mid-sep"></div>
                <div className="fp-side" style={{ alignItems: 'flex-end' }}>
                    <div className="fp-side-type buy" style={{ textAlign: 'right' }}>
                        Long ({formatRate(opp.funding_rate_ask)})
                    </div>
                    <div className="fp-side-ex">{opp.exchange_ask}</div>
                    <div className="fp-side-rate">Futures</div>
                    <MiniCountdown nextFundingTime={opp.next_funding_time_ask} />
                </div>
            </div>
            <div className="fp-card-bot">
                <FundingCountdown nextFundingTime={opp.next_funding_time} />
                <div className="fp-footer-divider"></div>
                <div className="fp-footer-profit">
                    <div className="fp-profit-badge">+${profit}</div>
                </div>
            </div>
        </div>
    )
}

// ─── Карточка SF ──────────────────────────────────────────────────────────────

function SFCard({ opp, tradeAmount, isFavorite, isHidden, onToggleFavorite, onToggleHide, onClick }) {
    const profit = calcProfit(opp.spread, tradeAmount)
    const extraAsks = parseExtraAsks(opp.extra_asks)
    const allAsks = [opp.exchange_ask, ...extraAsks].filter(Boolean)
    const visibleAsks = allAsks.slice(0, 2)
    const moreCount = allAsks.length - visibleAsks.length
    const { base, suffix } = splitSymbol(opp.symbol)
    if (isHidden) return null

    return (
        <div className="fp-card" onClick={onClick} style={{ cursor: 'pointer' }}>
            <div className="fp-card-top">
                <div className="fp-row1">
                    <div className="fp-sym">
                        {base}
                        <span className="fp-sym-suffix">/{suffix}</span>
                    </div>
                    <div className="fp-badge">SPOT-FUTURES</div>
                    <div className="fp-row1-spacer"></div>
                    <button
                        className={`fp-icon-btn ${isFavorite ? 'favorite' : ''}`}
                        onClick={e => { e.stopPropagation(); onToggleFavorite(opp.id) }}
                        title="В избранное"
                    >
                        <Star size={13} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        className="fp-icon-btn trash"
                        onClick={e => { e.stopPropagation(); onToggleHide(opp.id) }}
                        title="Скрыть"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
                <div className="fp-spread sf">{opp.spread?.toFixed(4)}%</div>
                <div className="fp-label">Spread</div>
            </div>
            <div className="fp-card-mid">
                <div className="fp-side">
                    <div className="fp-side-type sell">Short Futures</div>
                    <div className="fp-side-ex">{opp.exchange_bid}</div>
                    <div className="fp-side-rate">rate {formatRate(opp.funding_rate)}</div>
                </div>
                <div className="fp-mid-sep"></div>
                <div className="fp-asks">
                    <div className="fp-side-type buy">Buy Spot</div>
                    {visibleAsks.map((ex, i) => (
                        <div className="fp-ask-ex" key={i}>
                            <div className="fp-ask-dot"></div>
                            <div className="fp-ask-name">{ex}</div>
                        </div>
                    ))}
                    {moreCount > 0 && (
                        <div className="fp-ask-ex">
                            <div className="fp-ask-dot" style={{ background: 'rgba(0,201,122,0.2)' }}></div>
                            <div className="fp-ask-name" style={{ color: 'var(--text-muted)' }}>+{moreCount} more</div>
                        </div>
                    )}
                </div>
            </div>
            <div className="fp-card-bot">
                <FundingCountdown nextFundingTime={opp.next_funding_time} />
                <div className="fp-footer-divider"></div>
                <div className="fp-footer-profit">
                    <div className="fp-profit-badge">+${profit}</div>
                </div>
            </div>
        </div>
    )
}

// ─── Главный компонент ────────────────────────────────────────────────────────

/**
 * Пропсы:
 *   tradeAmount  — filters.tradeAmount из App.jsx (общий с futures-сканером)
 *   exchanges    — filters.exchanges  (фильтрация по биржам)
 *   minSpread    — filters.minSpread  (фильтрация по минимальному спреду)
 *   onOpenFilters — открывает общий FilterDrawer в режиме "funding"
 */
// ─── Корзина скрытых возможностей ──────────────────────────────────────────────

function FundingHiddenDropdown({ hiddenMap, onRestore }) {
    const [open, setOpen] = useState(false)
    const items = [...hiddenMap.entries()]

    if (items.length === 0) return null

    return (
        <div className="fp-hidden-wrap">
            <button
                className="fp-header-icon-btn"
                onClick={() => setOpen(o => !o)}
                title="Скрытые возможности"
            >
                <Trash2 size={15} />
                <span className="fp-hidden-count">{items.length}</span>
            </button>

            {open && (
                <div className="fp-hidden-dropdown">
                    {items.map(([key, snap]) => (
                        <div key={key} className="fp-hidden-row">
                            <div className="fp-hidden-row-info">
                                <span className="fp-hidden-row-sym">{snap.symbol}</span>
                                <span className="fp-hidden-row-meta">
                                    {snap.strategy === 'ff' ? 'FUTURES-FUTURES' : 'SPOT-FUTURES'} · {snap.exchange_bid}
                                    {snap.exchange_ask ? ` → ${snap.exchange_ask}` : ''}
                                </span>
                            </div>
                            <button
                                className="fp-hidden-restore-btn"
                                onClick={() => onRestore(key)}
                                title="Восстановить"
                            >
                                <ArrowRight size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}


function FundingPage({
  tradeAmount, exchanges, minSpread, onOpenFilters,
  isAdmin,
  // Новые пропсы для funding-позиций (изолированы от futures)
  fundingActiveTrades,
  onFundingTrade,
  onRemoveFundingTrade,
  fundingTradeError,
}) {
    const [data, setData] = useState([])
    const [strategy, setStrategy] = useState('all')
    const [loading, setLoading] = useState(true)

    // Логирование только для админа — аналог aLog из futures-сканера
    // isAdminRef нужен потому что useEffect с [] захватывает isAdmin=false
    // при первом рендере (до завершения проверки сессии), а ref всегда актуален.
    const isAdminRef = useRef(isAdmin)
    useEffect(() => { isAdminRef.current = isAdmin }, [isAdmin])

    function fLog(level, ...args) {
        if (!isAdminRef.current) return
        const styles = {
            log:     'color:#8bb8d0',
            info:    'color:#3d87c0;font-weight:bold',
            warn:    'color:#f0a500;font-weight:bold',
            error:   'color:#e03e3e;font-weight:bold',
            success: 'color:#00c97a;font-weight:bold',
        }
        const style = styles[level] ?? styles.log
        if (level === 'error') console.error('%c' + (args[0] ?? ''), style, ...args.slice(1))
        else if (level === 'warn') console.warn('%c' + (args[0] ?? ''), style, ...args.slice(1))
        else console.log('%c' + (args[0] ?? ''), style, ...args.slice(1))
    }
    const [error, setError] = useState(null)

    // Избранное/скрытые — изолированное хранилище funding-сканера, см. usePersistedIdSet выше
    const [favorites, toggleFavorite] = usePersistedIdSet(FUNDING_FAVORITES_KEY)
    const [hiddenMap, hideOpp, restoreOpp] = usePersistedMap(FUNDING_HIDDEN_KEY)

    // ── Модалки ──────────────────────────────────────────────────────────────
    const [selectedOpp,    setSelectedOpp]    = useState(null)
    const [pickerOpen,     setPickerOpen]      = useState(false)
    const [detailOpen,     setDetailOpen]      = useState(false)
    const [selectedSpotEx, setSelectedSpotEx]  = useState(null)
    // Активная позиция, если карточка открыта через FundingActiveBar
    const [selectedActiveFundingTrade, setSelectedActiveFundingTrade] = useState(null)

    /**
     * Определяем все доступные спот-биржи для SF-возможности.
     * extra_asks — JSON-строка вида '["BingX","KuCoin"]' или null.
     */
    function getAllSpotExchanges(opp) {
      const extras = parseExtraAsks(opp.extra_asks)
      return [opp.exchange_ask, ...extras].filter(Boolean)
    }

    /** Обработчик клика на карточку возможности. */
    function handleCardClick(opp) {
      setSelectedOpp(opp)
      setSelectedActiveFundingTrade(null)

      // Если SF и несколько спот-бирж → сначала picker
      if (opp.strategy === 'sf') {
        const spotExchanges = getAllSpotExchanges(opp)
        if (spotExchanges.length > 1) {
          fLog('log', `[FUNDING] Клик → SpotPicker: ${opp.symbol} | ${opp.exchange_bid} | spots: [${spotExchanges.join(',')}]`)
          setPickerOpen(true)
          return
        }
        // Одна спот-биржа → сразу в детали
        setSelectedSpotEx(spotExchanges[0] || opp.exchange_ask)
      } else {
        // FF → ask-биржа уже известна
        setSelectedSpotEx(opp.exchange_ask)
      }
      fLog('log', `[FUNDING] Клик → модалка: ${opp.symbol} ${opp.spread?.toFixed(4)}% | ${opp.exchange_bid}→${opp.exchange_ask || '?'} | strategy=${opp.strategy}`)
      setDetailOpen(true)
    }

    /** Обработчик клика на карточку в FundingActiveBar. */
    function handleActiveTradeClick(trade) {
      // Ищем opp в текущих данных, чтобы иметь актуальные данные
      const key = oppKey(trade.opp)
      const liveOpp = data.find(o => oppKey(o) === key) || trade.opp
      fLog('log', `[FUNDING] ActiveBar клик → модалка: ${trade.opp.symbol} | avgBid=${trade.avgBid} avgAsk=${trade.avgAsk}`)
      setSelectedOpp(liveOpp)
      setSelectedSpotEx(trade.selectedSpotEx)
      setSelectedActiveFundingTrade(trade)
      setDetailOpen(true)
    }

    /** Проверяет, является ли возможность активной позицией. */
    function isActiveFundingTrade(opp, spotEx) {
      if (!fundingActiveTrades?.length) return false
      const key = `${opp.strategy}:${opp.symbol}:${opp.exchange_bid}:${spotEx || opp.exchange_ask}`
      return fundingActiveTrades.some(t => t.key === key)
    }

    function closeModals() {
      setDetailOpen(false)
      setPickerOpen(false)
      setSelectedOpp(null)
      setSelectedSpotEx(null)
      setSelectedActiveFundingTrade(null)
    }

    const pollRef = useRef(null)

    useEffect(() => {
        let cancelled = false
        let cycle = 0

        async function load() {
            cycle++
            fLog('info', `[FUNDING] ═══════ Цикл ${cycle} ═══════`)
            fLog('log', `[FUNDING] GET ${FUNDING_API_BASE}/rates?limit=2000`)
            const t0 = performance.now()
            try {
                const json = await fetchFundingRates()
                if (cancelled) return
                const count = json.data?.length ?? 0
                const elapsed = (performance.now() - t0).toFixed(0)
                fLog('success', `[FUNDING] ✅ Получено ${count} возможностей | ⏱ ${elapsed}мс`)
                const ff = json.data?.filter(o => o.strategy === 'ff').length ?? 0
                const sf = json.data?.filter(o => o.strategy === 'sf').length ?? 0
                fLog('log', `[FUNDING] FF: ${ff} | SF: ${sf}`)
                // Покрытие next_funding_time — показываем какие биржи возвращают null
                if (json.data?.length) {
                    const withTime = json.data.filter(o => o.next_funding_time != null).length
                    const pct = ((withTime / count) * 100).toFixed(0)
                    fLog('log', `[FUNDING] next_funding_time: ${withTime}/${count} (${pct}%)`)
                    // Биржи с нулевым покрытием (группируем по exchange_bid)
                    const nullByEx = {}
                    json.data.filter(o => o.next_funding_time == null).forEach(o => {
                        nullByEx[o.exchange_bid] = (nullByEx[o.exchange_bid] || 0) + 1
                    })
                    if (Object.keys(nullByEx).length > 0) {
                        const nullStr = Object.entries(nullByEx)
                            .sort((a, b) => b[1] - a[1])
                            .map(([ex, n]) => `${ex}×${n}`)
                            .join(', ')
                        fLog('warn', `[FUNDING] Без next_funding_time: ${nullStr}`)
                    }
                }
                setData(json.data || [])
                setError(null)
            } catch (err) {
                if (cancelled) return
                fLog('error', `[FUNDING] ❌ Ошибка: ${err.message}`)
                setError(err.message)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        pollRef.current = setInterval(load, POLL_INTERVAL)

        return () => {
            cancelled = true
            clearInterval(pollRef.current)
            pollRef.current = null
        }
    }, [])

    // ── Фильтрация: биржи + минимальный спред (из общего FilterDrawer) ────────
    const normalize = (name) => (name || '').toLowerCase().replace(/[^a-z]/g, '')

    const filteredByExchange = data.filter(o => {
        if (!exchanges || exchanges.length === 0) return true
        const exSet = new Set(exchanges.map(normalize))
        const bidMatch = exSet.has(normalize(o.exchange_bid))
        if (o.strategy === 'ff') {
            const askMatch = exSet.has(normalize(o.exchange_ask))
            return bidMatch && askMatch
        }
        // SF — проверяем bid + хотя бы одну ask-биржу (основную или дополнительную)
        const extraAsks = parseExtraAsks(o.extra_asks)
        const allAsks = [o.exchange_ask, ...extraAsks].filter(Boolean)
        const anyAskMatch = allAsks.some(a => exSet.has(normalize(a)))
        return bidMatch && anyAskMatch
    })

    const filteredBySpread = (minSpread > 0)
        ? filteredByExchange.filter(o => (o.spread ?? 0) >= minSpread)
        : filteredByExchange

    // Скрытые убираются ДО подсчёта счётчиков табов, чтобы ALL/FF/SF числа были честными
    const visibleOpps = filteredBySpread.filter(o => !hiddenMap.has(oppKey(o)))

    const ffCount = visibleOpps.filter(o => o.strategy === 'ff').length
    const sfCount = visibleOpps.filter(o => o.strategy === 'sf').length

    const byStrategy = strategy === 'all'
        ? visibleOpps
        : visibleOpps.filter(o => o.strategy === strategy)

    // Избранное всегда наверху (как самые важные возможности), внутри каждой
    // группы (избранное / остальное) сортировка по спреду как раньше.
    const sorted = [...byStrategy].sort((a, b) => {
        const aFav = favorites.has(oppKey(a))
        const bFav = favorites.has(oppKey(b))
        if (aFav !== bFav) return aFav ? -1 : 1
        return (b.spread ?? 0) - (a.spread ?? 0)
    })

    // Лог фильтрации — однократно после сортировки, только для админа.
    // Используем ref чтобы не логировать одно и то же дважды подряд.
    const lastFilterLogRef = useRef('')
    if (isAdminRef.current && !loading) {
        const logKey = `${data.length}:${visibleOpps.length}:${ffCount}:${sfCount}:${sorted[0]?.symbol ?? '-'}`
        if (logKey !== lastFilterLogRef.current) {
            lastFilterLogRef.current = logKey
            fLog('log', `[FUNDING] Фильтрация | всего: ${data.length} | бирж: [${exchanges?.join(',') ?? 'все'}] | minSpread: ${minSpread}%`)
            fLog('log', `[FUNDING] После фильтра бирж: ${filteredByExchange.length} | после minSpread: ${filteredBySpread.length} | видимых: ${visibleOpps.length}`)
            fLog('log', `[FUNDING] FF: ${ffCount} | SF: ${sfCount} | скрытых: ${hiddenMap.size} | в табе "${strategy}": ${sorted.length}`)
            if (sorted.length > 0) {
                const top = sorted[0]
                fLog('success', `[FUNDING] Топ: ${top.symbol} ${top.spread?.toFixed(4)}% (${top.exchange_bid}→${top.exchange_ask || '?'})`)
            }
        }
    }

    return (
        <div className="funding-page">
            <style>{style}</style>

            <div className="fp-header">
                <span className="fp-title">
                    FUNDING <span>ARBITRAGE</span>
                </span>

                <FundingHiddenDropdown hiddenMap={hiddenMap} onRestore={restoreOpp} />

                <button className="fp-header-btn" onClick={onOpenFilters}>
                    <SlidersHorizontal size={16} />
                    Фильтры
                </button>
            </div>

            {/* Панель активных funding-позиций (изолирована от futures-сканера) */}
            <FundingActiveBar
                trades={fundingActiveTrades || []}
                onSelect={handleActiveTradeClick}
                onRemove={id => onRemoveFundingTrade?.(id)}
            />

            <div className="fp-tabbar">
                <div className={`fp-tab ${strategy === 'all' ? 'on' : ''}`} onClick={() => setStrategy('all')}>
                    ALL <span className="fp-tab-count">{visibleOpps.length}</span>
                </div>
                <div className={`fp-tab ${strategy === 'ff' ? 'on' : ''}`} onClick={() => setStrategy('ff')}>
                    FUTURES-FUTURES <span className="fp-tab-count">{ffCount}</span>
                </div>
                <div className={`fp-tab ${strategy === 'sf' ? 'on' : ''}`} onClick={() => setStrategy('sf')}>
                    SPOT-FUTURES <span className="fp-tab-count">{sfCount}</span>
                </div>
            </div>

            <div className="fp-content">
                {loading && (
                    <div className="fp-state">
                        <div className="fp-state-title">Loading funding rates…</div>
                    </div>
                )}

                {!loading && error && (
                    <div className="fp-state">
                        <div className="fp-state-title" style={{ color: 'var(--error)' }}>Funding service unreachable</div>
                        <div className="fp-state-sub">{error}</div>
                    </div>
                )}

                {!loading && !error && sorted.length === 0 && (
                    <div className="fp-state">
                        <div className="fp-state-title">No opportunities right now</div>
                    </div>
                )}

                {!loading && !error && sorted.map(opp => {
                    const key = oppKey(opp)
                    const cardProps = {
                        opp,
                        tradeAmount,
                        isFavorite: favorites.has(key),
                        isHidden: false, // уже отфильтровано выше — sorted не содержит скрытых
                        onToggleFavorite: () => toggleFavorite(key),
                        onToggleHide: () => hideOpp(key, {
                            symbol:       opp.symbol,
                            strategy:     opp.strategy,
                            exchange_bid: opp.exchange_bid,
                            exchange_ask: opp.exchange_ask || null,
                        }),
                        onClick: () => handleCardClick(opp),
                    }
                    return opp.strategy === 'ff'
                        ? <FFCard key={key} {...cardProps} />
                        : <SFCard key={key} {...cardProps} />
                })}
            </div>

            {/* ── Промежуточная модалка выбора спот-биржи (SF с несколькими спотами) ── */}
            {pickerOpen && selectedOpp && (
                <SpotPickerModal
                    opp={selectedOpp}
                    allSpotExchanges={getAllSpotExchanges(selectedOpp)}
                    onSelect={ex => {
                        setSelectedSpotEx(ex)
                        setPickerOpen(false)
                        setDetailOpen(true)
                    }}
                    onClose={() => setPickerOpen(false)}
                />
            )}

            {/* ── Основная модалка funding-арбитража ── */}
            {detailOpen && selectedOpp && (
                <FundingDetailModal
                    opp={selectedOpp}
                    selectedSpotEx={selectedSpotEx}
                    tradeAmount={tradeAmount}
                    onClose={closeModals}
                    onTrade={(opp, avgBid, avgAsk, spotEx) => {
                        onFundingTrade?.(opp, avgBid, avgAsk, spotEx)
                    }}
                    isActiveTrade={isActiveFundingTrade(selectedOpp, selectedSpotEx)}
                    onRemoveTrade={() => {
                        // Находим trade по ключу и удаляем
                        const key = `${selectedOpp.strategy}:${selectedOpp.symbol}:${selectedOpp.exchange_bid}:${selectedSpotEx || selectedOpp.exchange_ask}`
                        const trade = fundingActiveTrades?.find(t => t.key === key)
                        if (trade) onRemoveFundingTrade?.(trade.id)
                        closeModals()
                    }}
                    initialAvgBid={selectedActiveFundingTrade?.avgBid || ''}
                    initialAvgAsk={selectedActiveFundingTrade?.avgAsk || ''}
                    tradeError={fundingTradeError}
                />
            )}

        </div>
    )
}

export default FundingPage
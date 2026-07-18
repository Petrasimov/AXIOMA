/**
 * Sidebar.jsx
 *
 * Десктоп (>1024px): существующая hover-раскрывающаяся боковая панель — без изменений.
 * Мобилка (≤1024px): верхний бар (бургер + лого + аватар) + выдвижная панель (off-canvas).
 *   На тач-экранах :hover не срабатывает, поэтому мобильная навигация построена на тапах,
 *   а не на раскрытии сайдбара наведением.
 *
 * Изменения (мобильная адаптация, Партия 1 — MOBILE_PLAN.md, п.2.1):
 * - Добавлены .sb-topbar / .sb-drawer-ov / .sb-drawer — независимая от десктопного
 *   сайдбара мобильная навигация. Все три — position: fixed, поэтому не участвуют
 *   в flex-раскладке .app-layout и не требуют правок в App.jsx/index.css кроме
 *   одного отступа сверху у .main-area (сделано в index.css).
 * - .sidebar скрывается на ≤1024px (display:none), чтобы flex .app-layout не
 *   резервировал под него 68px и не появлялась нерабочая узкая полоска слева.
 * - Список разделов (TABS) и подтабы futures/developers, а также фильтрация
 *   по правам (isAdmin/isCexCexPaid) — продублированы для мобильной панели,
 *   логика идентична десктопному сайдбару.
 * - Профиль внизу панели не переиспользует UserProfile.jsx: тот рассчитан на
 *   desktop hover-раскрытие текста (.sidebar:hover .user-info), которое на
 *   мобилке никогда не сработает. Вместо этого — свой блок с той же логикой
 *   отображения имени/бейджа, но всегда видимый.
 */

import { useState, useEffect } from "react"
import { Home, TrendingUp, Percent, BookOpen, ArrowLeftRight, Shuffle, Code2, Users, Flame, Menu, X } from "lucide-react"
import { TABS } from "../constants"
import UserProfile from './UserProfile.jsx'

const TAB_ICONS = {
    main: Home,
    futures: TrendingUp,
    funding: Percent,
    movers: Flame,
    promo: BookOpen,
    about: Users,
    developers: Code2,
}

const style = `
    /* ══════════════════════════════════════════════════════════════
       ДЕСКТОП (>1024px) — существующий hover-сайдбар, без изменений
       ══════════════════════════════════════════════════════════════ */
    .sidebar {
        width: 68px;
        min-width: 68px;
        height: 100%;
        background: rgba(10,26,37,0.62);
        backdrop-filter: blur(18px) saturate(140%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
        border-right: 1px solid var(--glass-border);
        display: flex;
        flex-direction: column;
        padding: 20px 0;
        gap: 4px;
        overflow: hidden;
        position: relative;
        z-index: 20;
        transition: width 0.25s ease, min-width 0.25s ease, background 0.25s ease;
    }

    .sidebar::after {
        content: '';
        position: absolute;
        top: 0; right: -1px; bottom: 0;
        width: 1px;
        background: linear-gradient(180deg, rgba(255,255,255,0.14), transparent 60%);
        pointer-events: none;
    }

    .sidebar:hover {
        width: 240px;
        min-width: 240px;
    }

    .sidebar:hover .sidebar-tab {
        justify-content: flex-start;
        padding: 10px 17px;
    }

    .sidebar:hover .sidebar-subtab {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 17px 8px 43px;
        cursor: pointer;
        color: var(--text-secondary);
        font-size: 13px;
        transition: all 0.15s ease;
        white-space: nowrap;
        border-left: 2px solid transparent;
    }

    .sidebar:hover .sidebar-tab span {
        display: inline;
    }

    .sidebar-logo {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 14px 20px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 8px;
        white-space: nowrap;
    }

    .sidebar-logo-icon {
        width: 40px;
        height: 40px;
        min-width: 40px;
        background: linear-gradient(135deg, #ffffff, #cfe6f7);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 800;
        color: var(--accent);
        letter-spacing: 1px;
        border-radius: var(--radius-sm);
        box-shadow: 0 4px 14px rgba(255,255,255,0.12);
        flex-shrink: 0;
    }

    .sidebar-logo-text {
        font-size: 19px;
        font-weight: 700;
        color: white;
        letter-spacing: 3px;
    }

    .sidebar-logo-sub {
        font-size: 11px;
        color: var(--text-muted);
        letter-spacing: 2px;
        margin-top: 2px;
    }

    .sidebar-tab {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 11px 0;
        margin: 0 8px;
        justify-content: center;
        cursor: pointer;
        color: var(--text-secondary);
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.5px;
        border-radius: var(--radius-sm);
        transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
        user-select: none;
        white-space: nowrap;
        width: calc(100% - 16px);
    }

    .sidebar-tab span {
        display: none;
    }

    .sidebar-tab:hover {
        color: var(--text-primary);
        background: rgba(93,163,214,0.1);
    }

    .sidebar-tab.active {
        color: var(--text-primary);
        background: var(--glass-fill-hover);
        box-shadow: var(--shadow-glass), 0 0 0 1px var(--glass-border-hover) inset;
    }

    .sidebar-tab.disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .sidebar-subtab {
        display: none;
        align-items: center;
        gap: 10px;
        padding: 8px 17px 8px 43px;
        cursor: pointer;
        color: var(--text-secondary);
        font-size: 13px;
        transition: all 0.15s ease;
        white-space: nowrap;
        border-left: 2px solid transparent;
    }

    .sidebar-subtab:hover {
        color: var(--text-primary);
        background: rgba(93,163,214,0.08);
        border-radius: var(--radius-sm);
    }

    .sidebar-subtab.active {
        color: var(--accent-bright);
        border-left-color: transparent;
        background: rgba(93,163,214,0.1);
        border-radius: var(--radius-sm);
    }

    .sidebar-subtab.disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .sidebar-footer {
        margin-top: auto;
        padding: 16px 17px;
        border-top: 1px solid var(--border);
        font-size: 11px;
        color: var(--text-muted);
        letter-spacing: 1px;
        white-space: nowrap;
    }

    .sidebar:not(:hover) .sidebar-footer {
        opacity: 0;
    }

    /* ══════════════════════════════════════════════════════════════
       МОБИЛКА (≤1024px) — верхний бар + выдвижная панель (off-canvas)
       ══════════════════════════════════════════════════════════════ */

    /* Десктопный сайдбар полностью убираем из потока на мобиле — иначе
       flex .app-layout зарезервирует под него 68px нерабочей полосы. */
    @media (max-width: 1024px) {
        .sidebar { display: none; }
    }

    /* ─── Верхний бар ─── */
    .sb-topbar {
        display: none;
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 56px;
        padding: env(safe-area-inset-top) 8px 0;
        align-items: center;
        gap: 4px;
        background: rgba(10,26,37,0.88);
        backdrop-filter: blur(18px) saturate(140%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
        border-bottom: 1px solid var(--glass-border);
        z-index: 500;
    }

    @media (max-width: 1024px) {
        .sb-topbar { display: flex; }
    }

    .sb-burger {
        width: 44px;
        height: 44px;
        min-width: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        color: var(--text-primary);
        cursor: pointer;
        border-radius: var(--radius-sm);
        transition: background 0.15s ease;
    }

    .sb-burger:active {
        background: var(--bg-hover);
    }

    .sb-topbar-brand {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-right: auto;
        min-width: 0;
        overflow: hidden;
    }

    .sb-topbar-logo {
        width: 30px;
        height: 30px;
        min-width: 30px;
        background: linear-gradient(135deg, #ffffff, #cfe6f7);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        color: var(--accent);
        letter-spacing: 0.5px;
        border-radius: var(--radius-sm);
    }

    .sb-topbar-text {
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 2px;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .sb-topbar-av {
        width: 44px;
        height: 44px;
        min-width: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
    }

    .sb-topbar-av-inner {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--glass-fill);
        border: 1px solid var(--glass-border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
        color: var(--accent-bright);
        overflow: hidden;
    }

    .sb-topbar-av-inner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    /* ─── Затемнение под открытой панелью ─── */
    .sb-drawer-ov {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(3,8,13,0.62);
        backdrop-filter: blur(2px);
        z-index: 600;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.22s ease, visibility 0.22s ease;
    }

    @media (max-width: 1024px) {
        .sb-drawer-ov { display: block; }
    }

    .sb-drawer-ov.open {
        opacity: 1;
        visibility: visible;
    }

    /* ─── Сама выдвижная панель ─── */
    .sb-drawer {
        display: none;
        position: fixed;
        top: 0; left: 0; bottom: 0;
        width: 84%;
        max-width: 320px;
        z-index: 601;
        background: rgba(9,22,34,0.97);
        backdrop-filter: blur(24px) saturate(150%);
        -webkit-backdrop-filter: blur(24px) saturate(150%);
        border-right: 1px solid var(--glass-border);
        flex-direction: column;
        transform: translateX(-100%);
        transition: transform 0.24s cubic-bezier(0.4,0,0.2,1);
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
    }

    @media (max-width: 1024px) {
        .sb-drawer { display: flex; }
    }

    .sb-drawer.open {
        transform: translateX(0);
    }

    .sb-drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 10px 14px 18px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 8px;
        flex-shrink: 0;
    }

    .sb-drawer-brand {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
    }

    .sb-drawer-logo {
        width: 36px;
        height: 36px;
        min-width: 36px;
        background: linear-gradient(135deg, #ffffff, #cfe6f7);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 800;
        color: var(--accent);
        letter-spacing: 1px;
        border-radius: var(--radius-sm);
    }

    .sb-drawer-title {
        font-size: 17px;
        font-weight: 800;
        letter-spacing: 2.5px;
        color: white;
    }

    .sb-drawer-close {
        width: 44px;
        height: 44px;
        min-width: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        border-radius: var(--radius-sm);
        transition: background 0.15s ease, color 0.15s ease;
    }

    .sb-drawer-close:active {
        background: var(--bg-hover);
        color: var(--error);
    }

    .sb-drawer-list {
        flex: 1;
        overflow-y: auto;
        padding: 4px 10px 10px;
    }

    .sb-nav-item {
        display: flex;
        align-items: center;
        gap: 13px;
        width: 100%;
        min-height: 48px;
        padding: 12px 12px;
        margin-bottom: 2px;
        border-radius: var(--radius-sm);
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        font-size: 14.5px;
        font-weight: 500;
        letter-spacing: 0.3px;
        text-align: left;
        transition: background 0.15s ease, color 0.15s ease;
    }

    .sb-nav-item:active {
        background: var(--bg-hover);
    }

    .sb-nav-item.active {
        color: var(--text-primary);
        background: var(--glass-fill-hover);
        box-shadow: var(--shadow-glass), 0 0 0 1px var(--glass-border-hover) inset;
    }

    .sb-nav-item.disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .sb-nav-subitem {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 44px;
        padding: 10px 12px 10px 43px;
        margin-bottom: 2px;
        border-radius: var(--radius-sm);
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        font-size: 13px;
        text-align: left;
        border-left: 2px solid transparent;
        transition: background 0.15s ease, color 0.15s ease;
    }

    .sb-nav-subitem:active {
        background: rgba(93,163,214,0.08);
    }

    .sb-nav-subitem.active {
        color: var(--accent-bright);
        background: rgba(93,163,214,0.1);
    }

    .sb-nav-subitem.disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    /* ─── Профиль внизу панели ─── */
    .sb-drawer-foot {
        padding: 10px 14px 4px;
        border-top: 1px solid var(--border);
        flex-shrink: 0;
    }

    .sb-drawer-profile {
        display: flex;
        align-items: center;
        gap: 11px;
        width: 100%;
        min-height: 48px;
        padding: 8px 6px;
        background: none;
        border: none;
        cursor: pointer;
        border-radius: var(--radius-sm);
        text-align: left;
        transition: background 0.15s ease;
    }

    .sb-drawer-profile:active {
        background: var(--bg-hover);
    }

    .sb-drawer-av {
        width: 38px;
        height: 38px;
        min-width: 38px;
        border-radius: 50%;
        background: var(--glass-fill);
        border: 1px solid var(--glass-border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        color: var(--accent-bright);
        overflow: hidden;
    }

    .sb-drawer-av img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .sb-drawer-profile-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
    }

    .sb-drawer-profile-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 180px;
    }

    .sb-drawer-profile-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-family: var(--font-mono);
        letter-spacing: 0.3px;
        width: fit-content;
    }

    .sb-drawer-profile-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .sb-drawer-profile-badge.access { color: var(--success); }
    .sb-drawer-profile-badge.access .sb-drawer-profile-dot { background: var(--success); }
    .sb-drawer-profile-badge.no-access { color: var(--error); }
    .sb-drawer-profile-badge.no-access .sb-drawer-profile-dot { background: var(--error); }
    .sb-drawer-profile-badge.admin { color: #a78bfa; }
    .sb-drawer-profile-badge.admin .sb-drawer-profile-dot { background: #a78bfa; }

    .sb-drawer-version {
        padding: 12px 6px 16px;
        font-size: 11px;
        color: var(--text-muted);
        letter-spacing: 1px;
    }
`

function Sidebar({ activeTab, onTabChange, activePage, onPageChange, authUser, onLogout, onOpenProfile }) {
    const [futuresSubTab, setFuturesSubTab] = useState('cex-cex')
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

    const isAdmin      = authUser?.isAdmin === true
    const isCexCexPaid = authUser?.isCexCexPaid === true

    // Esc закрывает выдвижную панель — привычное поведение off-canvas меню
    useEffect(() => {
        if (!mobileNavOpen) return
        const onKey = e => { if (e.key === 'Escape') setMobileNavOpen(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [mobileNavOpen])

    // Общая логика выбора раздела — используется и десктопным сайдбаром,
    // и мобильной панелью (последняя дополнительно закрывается после выбора).
    function selectTab(tab) {
        if (!tab.enabled) return
        onTabChange(tab.id)
        if (tab.id === 'main') onPageChange?.('home')
        else if (tab.id === 'funding') onPageChange?.('funding')
        else if (tab.id === 'movers') onPageChange?.('movers')
        else if (tab.id === 'promo') onPageChange?.('training')
        else if (tab.id === 'about') onPageChange?.('about')
        else if (tab.id !== 'developers') onPageChange?.('futures')
        setMobileNavOpen(false)
    }

    // Профиль для мобильной панели: та же логика имени/бейджа, что в
    // UserProfile.jsx, продублирована намеренно — см. комментарий в шапке файла.
    const displayName = authUser?.username || authUser?.login || 'Пользователь'
    const initial = displayName.charAt(0).toUpperCase()
    let badgeClass = 'no-access'
    let badgeText = 'Нет доступа'
    if (isAdmin) {
        badgeClass = 'admin'
        badgeText = 'Админ'
    } else if (isCexCexPaid) {
        badgeClass = 'access'
        badgeText = 'Доступ есть'
    }

    return (
        <>
            <style>{style}</style>

            {/* ═══ ДЕСКТОП (>1024px) ═══ */}
            <div className="sidebar">

                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">AX</div>
                    <div>
                        <div className="sidebar-logo-text">AXIOM</div>
                        <div className="sidebar-logo-sub">v1.0</div>
                    </div>
                </div>

                {TABS.map(tab => {
                    const Icon = TAB_ICONS[tab.id]
                    const isActive = activeTab === tab.id

                    if (tab.id === 'developers' && !isAdmin) return null
                    if (tab.id === 'funding' && !isCexCexPaid) return null

                    return (
                        <div key={tab.id}>
                            <div
                                className={`sidebar-tab ${isActive ? 'active' : ''} ${!tab.enabled ? 'disabled' : ''}`}
                                onClick={() => selectTab(tab)}
                            >
                                {Icon && <Icon size={18} />}
                                <span>{tab.label}</span>
                            </div>

                            {tab.id === 'futures' && isActive && (
                                <>
                                    <div
                                        className={`sidebar-subtab ${futuresSubTab === 'cex-cex' ? 'active' : ''}`}
                                        onClick={() => { setFuturesSubTab('cex-cex'); onPageChange?.('futures') }}
                                    >
                                        <ArrowLeftRight size={14} />
                                        CEX-CEX
                                    </div>
                                    <div className="sidebar-subtab disabled">
                                        <Shuffle size={14} />
                                        DEX-CEX
                                    </div>
                                </>
                            )}

                            {tab.id === 'developers' && isActive && isAdmin && (
                                <>
                                    <div
                                        className={`sidebar-subtab ${activePage === 'api' ? 'active' : ''}`}
                                        onClick={() => onPageChange?.('api')}
                                    >
                                        API
                                    </div>
                                    <div className="sidebar-subtab disabled">
                                        Logs
                                    </div>
                                </>
                            )}
                        </div>
                    )
                })}

                {/* Профиль / версия */}
                {authUser ? (
                    <UserProfile user={authUser} onOpenProfile={onOpenProfile} />
                ) : (
                    <div className="sidebar-footer">
                        AXIOM v1.0
                    </div>
                )}

            </div>

            {/* ═══ МОБИЛКА (≤1024px): верхний бар ═══ */}
            <header className="sb-topbar">
                <button
                    className="sb-burger"
                    onClick={() => setMobileNavOpen(true)}
                    aria-label="Открыть меню"
                    aria-expanded={mobileNavOpen}
                >
                    <Menu size={22} />
                </button>

                <div className="sb-topbar-brand">
                    <div className="sb-topbar-logo">AX</div>
                    <span className="sb-topbar-text">AXIOM</span>
                </div>

                {authUser && (
                    <button
                        className="sb-topbar-av"
                        onClick={() => onOpenProfile?.()}
                        aria-label="Открыть профиль"
                    >
                        <span className="sb-topbar-av-inner">
                            {authUser?.photoUrl
                                ? <img src={authUser.photoUrl} alt={displayName} onError={e => { e.target.style.display = 'none' }} />
                                : initial}
                        </span>
                    </button>
                )}
            </header>

            {/* ═══ МОБИЛКА: затемнение под панелью ═══ */}
            <div
                className={`sb-drawer-ov ${mobileNavOpen ? 'open' : ''}`}
                onClick={() => setMobileNavOpen(false)}
                aria-hidden="true"
            />

            {/* ═══ МОБИЛКА: выдвижная панель ═══ */}
            <aside className={`sb-drawer ${mobileNavOpen ? 'open' : ''}`}>
                <div className="sb-drawer-head">
                    <div className="sb-drawer-brand">
                        <div className="sb-drawer-logo">AX</div>
                        <span className="sb-drawer-title">AXIOM</span>
                    </div>
                    <button
                        className="sb-drawer-close"
                        onClick={() => setMobileNavOpen(false)}
                        aria-label="Закрыть меню"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="sb-drawer-list">
                    {TABS.map(tab => {
                        const Icon = TAB_ICONS[tab.id]
                        const isActive = activeTab === tab.id

                        if (tab.id === 'developers' && !isAdmin) return null
                        if (tab.id === 'funding' && !isCexCexPaid) return null

                        return (
                            <div key={tab.id}>
                                <button
                                    className={`sb-nav-item ${isActive ? 'active' : ''} ${!tab.enabled ? 'disabled' : ''}`}
                                    onClick={() => selectTab(tab)}
                                >
                                    {Icon && <Icon size={18} />}
                                    <span>{tab.label}</span>
                                </button>

                                {tab.id === 'futures' && isActive && (
                                    <>
                                        <button
                                            className={`sb-nav-subitem ${futuresSubTab === 'cex-cex' ? 'active' : ''}`}
                                            onClick={() => { setFuturesSubTab('cex-cex'); onPageChange?.('futures'); setMobileNavOpen(false) }}
                                        >
                                            <ArrowLeftRight size={14} />
                                            CEX-CEX
                                        </button>
                                        <button className="sb-nav-subitem disabled" disabled>
                                            <Shuffle size={14} />
                                            DEX-CEX
                                        </button>
                                    </>
                                )}

                                {tab.id === 'developers' && isActive && isAdmin && (
                                    <>
                                        <button
                                            className={`sb-nav-subitem ${activePage === 'api' ? 'active' : ''}`}
                                            onClick={() => { onPageChange?.('api'); setMobileNavOpen(false) }}
                                        >
                                            API
                                        </button>
                                        <button className="sb-nav-subitem disabled" disabled>
                                            Logs
                                        </button>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="sb-drawer-foot">
                    {authUser ? (
                        <button
                            className="sb-drawer-profile"
                            onClick={() => { onOpenProfile?.(); setMobileNavOpen(false) }}
                        >
                            <span className="sb-drawer-av">
                                {authUser?.photoUrl
                                    ? <img src={authUser.photoUrl} alt={displayName} onError={e => { e.target.style.display = 'none' }} />
                                    : initial}
                            </span>
                            <span className="sb-drawer-profile-info">
                                <span className="sb-drawer-profile-name">{displayName}</span>
                                <span className={`sb-drawer-profile-badge ${badgeClass}`}>
                                    <span className="sb-drawer-profile-dot" />
                                    {badgeText}
                                </span>
                            </span>
                        </button>
                    ) : (
                        <div className="sb-drawer-version">AXIOM v1.0</div>
                    )}
                </div>
            </aside>
        </>
    )
}

export default Sidebar
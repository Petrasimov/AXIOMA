/**
 * Sidebar.jsx
 *
 * Изменения:
 * - Вкладка Developers видна и доступна только если authUser?.isAdmin === true
 * - Вкладка Funding видна всем у кого есть isCexCexPaid доступ
 * - UserProfile вместо footer когда авторизован
 */

import { useState } from "react"
import { Home, TrendingUp, Percent, BookOpen, ArrowLeftRight, Shuffle, Code2, Users } from "lucide-react"
import { TABS } from "../constants"
import UserProfile from './UserProfile.jsx'

const TAB_ICONS = {
    main: Home,
    futures: TrendingUp,
    funding: Percent,
    promo: BookOpen,
    about: Users,
    developers: Code2,
}

const style = `
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
`

function Sidebar({ activeTab, onTabChange, activePage, onPageChange, authUser, onLogout }) {
    const [futuresSubTab, setFuturesSubTab] = useState('cex-cex')

    const isAdmin      = authUser?.isAdmin === true
    const isCexCexPaid = authUser?.isCexCexPaid === true

    return (
        <>
            <style>{style}</style>
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

                    // Вкладка Developers — только для админов
                    if (tab.id === 'developers' && !isAdmin) return null

                    // Вкладка Funding — для всех у кого есть доступ isCexCexPaid
                    if (tab.id === 'funding' && !isCexCexPaid) return null

                    return (
                        <div key={tab.id}>
                            <div
                                className={`sidebar-tab ${isActive ? 'active' : ''} ${!tab.enabled ? 'disabled' : ''}`}
                                onClick={() => {
                                    if (!tab.enabled) return
                                    onTabChange(tab.id)
                                    if (tab.id === 'main') onPageChange?.('home')
                                    else if (tab.id === 'funding') onPageChange?.('funding')
                                    else if (tab.id === 'promo') onPageChange?.('training')
                                    else if (tab.id === 'about') onPageChange?.('about')
                                    else if (tab.id !== 'developers') onPageChange?.('futures')
                                }}
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
                    <UserProfile user={authUser} onLogout={onLogout} />
                ) : (
                    <div className="sidebar-footer">
                        AXIOM v1.0
                    </div>
                )}

            </div>
        </>
    )
}

export default Sidebar
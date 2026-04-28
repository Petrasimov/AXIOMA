import { useState } from "react"
import { Home, TrendingUp, Percent, BookOpen, ArrowLeftRight, Shuffle, Code2 } from "lucide-react"
import { TABS } from "../constants"

const TAB_ICONS = {
    main: Home,
    futures: TrendingUp,
    funding: Percent,
    promo: BookOpen,
    developers: Code2,
}

const style = `
    .sidebar {
        width: 60px;
        min-width: 60px;
        height: 100%;
        background: var(--bg-secondary);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        padding: 20px 0;
        gap: 4px;
        overflow: hidden;
        transition: width 0.25s ease, min-width 0.25s ease;
    }

    .sidebar:hover {
        width: 220px;
        min-width: 220px;
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
        font-size: 12px;
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
        padding: 0 12px 20px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 8px;
        white-space: nowrap;
    }

    .sidebar-logo-icon {
        width: 36px;
        height: 36px;
        min-width: 36px;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 800;
        color: var(--accent);
        letter-spacing: 1px;
        border-radius: 4px;
        flex-shrink: 0;
    }

    .sidebar-logo-text {
        font-size: 18px;
        font-weight: 700;
        color: white;
        letter-spacing: 3px;
    }

    .sidebar-logo-sub {
        font-size: 10px;
        color: var(--text-muted);
        letter-spacing: 2px;
        margin-top: 2px;
    }

    .sidebar-tab {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 0;
        justify-content: center;
        cursor: pointer;
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.5px;
        transition: all 0.15s ease;
        border-left: 2px solid transparent;
        user-select: none;
        white-space: nowrap;
    }

    .sidebar-tab span {
        display: none;
    }

    .sidebar-tab:hover {
        color: var(--text-primary);
        background: var(--bg-hover);
    }

    .sidebar-tab.active {
        color: var(--accent-bright);
        border-left-color: var(--accent-bright);
        background: var(--bg-hover);
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
        font-size: 12px;
        transition: all 0.15s ease;
        white-space: nowrap;
        border-left: 2px solid transparent;
    }

    .sidebar-subtab:hover {
        color: var(--text-primary);
        background: var(--bg-hover);
    }

    .sidebar-subtab.active {
        color: var(--accent-bright);
        border-left-color: transparent;
    }

    .sidebar-subtab.disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .sidebar-footer {
        margin-top: auto;
        padding: 16px 17px;
        border-top: 1px solid var(--border);
        font-size: 10px;
        color: var(--text-muted);
        letter-spacing: 1px;
        white-space: nowrap;
    }

    .sidebar:not(:hover) .sidebar-footer {
        opacity: 0;
    }
        
`


function Sidebar({ activeTab, onTabChange, activePage, onPageChange }) {
    const [futuresSubTab, setFuturesSubTab] = useState('cex-cex')

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

                    return (
                        <div key={tab.id}>
                            <div
                                className={`sidebar-tab ${isActive ? 'active' : ''} ${!tab.enabled ? 'disabled' : ''}`}
                                onClick={() => {
                                    if (!tab.enabled) return
                                    onTabChange(tab.id)
                                    if (tab.id !== 'developers') onPageChange?.('futures')
                                }}

                            >
                                {Icon && <Icon size={16} />}
                                <span>{tab.label}</span>
                            </div>

                            {tab.id === 'futures' && isActive && (
                                <>
                                    <div
                                        className={`sidebar-subtab ${futuresSubTab === 'cex-cex' ? 'active' : ''}`}
                                        onClick={() => { setFuturesSubTab('cex-cex'); onPageChange?.('futures') }}
                                    >
                                        <ArrowLeftRight size={13} />
                                        CEX-CEX
                                    </div>
                                    <div className="sidebar-subtab disabled">
                                        <Shuffle size={13} />
                                        DEX-CEX
                                    </div>
                                </>
                            )}

                            {tab.id === 'developers' && isActive && (
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

                <div className="sidebar-footer">
                    AXIOM v1.0
                </div>
            </div>
        </>
    )
}

export default Sidebar
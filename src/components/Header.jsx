import { useState, useEffect } from "react"
import { ArrowUpDown, SlidersHorizontal, LayoutGrid, AlignJustify, TrendingUp, Clock as ClockIcon, BarChart2, Trash2, ArrowRight  } from "lucide-react"
import { SORT_OPTIONS } from "../constants"

function Clock() {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    const pad = (n) => String(n).padStart(2, '0')

    return (
        <span className="header-clock">
            {pad(time.getHours())}:{pad(time.getMinutes())}:{pad(time.getSeconds())}
        </span>
    )
}

const SORT_ICONS = {
    spread: TrendingUp,
    age: ClockIcon,
    volume: BarChart2
}

const style = `
    .header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 20px;
        height: 72px;
        background: var(--bg-secondary);
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
        align-items: center;
    }

    .header-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: 2px;
        margin-right: auto;
    }

    .header-title span {
        color: var(--accent-bright);
    }

    .header-clock {
        font-size: 13px;
        font-family: var(--font-mono);
        color: var(--text-secondary);
        letter-spacing: 1px;
        margin-right: 4px;
    }

    .header-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-secondary);
        font-size: 13px;
        font-family: var(--font-sans);
        cursor: pointer;
        transition: all 0.15s ease;
        letter-spacing: 0.5px;
        white-space: nowrap;
        align-self: center;
    }

    .header-btn:hover {
        border-color: var(--accent);
        color: var(--text-primary);
    }

    .header-btn.active {
        background: var(--accent);
        border-color: var(--accent);
        color: white;
    }

    .header-icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 35px;
        height: 35px;
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;
        align-self: center;
    }

    .header-icon-btn:hover {
        border-color: var(--accent);
        color: var(--text-primary);
    }

    .header-icon-btn.active {
        background: var(--accent);
        border-color: var(--accent);
        color: white;
        height: 30px;
    }

    .header-view-toggle {
        display: flex;
        border: 1px solid var(--border);
        align-items: center;
        height: 30px;
        align-self: centerж
    }

    .header-view-toggle .header-icon-btn {
        border: none;
        border-right: 1px solid var(--border);
    }

    .header-view-toggle .header-icon-btn:last-child {
        border-right: none;
    }

    .sort-wrapper {
        position: relative;
    }

    .sort-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        background: var(--bg-card);
        border: 1px solid var(--border);
        min-width: 160px;
        z-index: 100;
    }

    .sort-option {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 14px;
        font-size: 12px;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;
        letter-spacing: 0.5px;
    }


    .sort-option:hover {
        color: var(--text-primary);
        background: var(--bg-hover);
    }

    .sort-option.selected {
        color: var(--accent-bright);
    }
`

function SortDropdown({ sortMode, onSort }) {
    const [open, setOpen] = useState(false)
    const current = SORT_OPTIONS.find(o => o.value === sortMode)
    const CurrentIcon = current ? SORT_ICONS[current.value] : ArrowUpDown

    return (
        <div className="sort-wrapper">
            <button 
                className="header-btn" 
                onClick={() => setOpen(o => !o)}
            >
                <CurrentIcon size={14} />
                {current?.label ?? 'Сортировка'}
            </button>

            {open && (
                <div className="sort-dropdown">
                    {SORT_OPTIONS.map(option => {
                        const Icon = SORT_ICONS[option.value]
                        return (
                            <div 
                                key={option.value}
                                className={`sort-option ${sortMode === option.value ? 'selected' : ''}`}
                                onClick={() => {
                                    onSort(option.value)
                                    setOpen(false)
                                }} 
                            >
                                {Icon && <Icon size={13} />}
                                {option.label}
                            </div> 
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function HiddenDropdown({ hiddenItems, onRestore }) {
    const [open, setOpen] = useState(false)

    if (!hiddenItems.length) return null
    return (
        <div className="sort-wrapper">
            <button
                className="header-icon-btn"
                onClick={() => setOpen(o => !o)}
                title="Скрытые возможности"
                style={{ position: 'relative'}}
                >
                    <Trash2 size={15} />
                    <span style={{
                        position: 'absolute',
                        top: -5, right: -5,
                        background: 'var(--error)',
                        color: 'white',
                        fontSize: 9,
                        fontWeight: 700,
                        width: 14, height: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {hiddenItems.length}
                    </span>
                </button>

                {open && (
                    <div className="sort-dropdown" style={{ minWidth: 260, right: 0}}>
                        {hiddenItems.map(opp => (
                            <div key={opp.id} className="sort-option" style={{ justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ color: 'var(--text-promary)', fontWeight: 600, fontSize: 12 }}>
                                        {opp.symbol}
                                    </span>
                                    <span style={{ fontSize: 10, color: 'car(--text-muted)' }}>
                                        {opp.strategy.toUpperCase()} · {opp.bid_ex} → {opp.ask_ex} 
                                    </span>
                                </div>
                                <button 
                                    className="header-icon-btn"
                                    onClick={() => onRestore(opp.id)}
                                    title="Восстановить"
                                    style={{ width: 24, height: 24 }}
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

function Header({ total, sortMode, onSort, viewMode, onViewMode, onOpenFilters, hiddenItems, onRestore}) {
    return (
        <>
            <style>{style}</style>
            <div className="header">

                <span className="header-title">
                    FUTURES <span>ARBITRAGE</span>
                </span>

                <Clock />

                <HiddenDropdown hiddenItems={hiddenItems} onRestore={onRestore} />

                <SortDropdown sortMode={sortMode} onSort={onSort} />


                <div className="header-view-toggle">
                    <button
                        className={`header-icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => onViewMode('grid')}
                        title="Сетка"
                    >
                        <LayoutGrid size={16} />
                    </button>

                    <button 
                        className={`header-icon-btn ${viewMode === 'table' ? 'active' : ''}`}
                        onClick={() => onViewMode('table')}
                        title="Таблица"
                    >
                        <AlignJustify size={16} />
                    </button>
                </div>

                <button className="header-btn" onClick={onOpenFilters}>
                    <SlidersHorizontal size={14} />
                    Фильтры
                </button>

            </div>
        </>
    )
}

export default Header
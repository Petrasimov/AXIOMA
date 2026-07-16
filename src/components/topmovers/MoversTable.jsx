/**
 * MoversTable.jsx — детальная таблица «Топ роста и падения»
 *
 * Сортировка по любой колонке (клик по заголовку).
 * Кнопка «На биржу →» открывает торговый терминал биржи по этой монете
 * (спот или фьючерс — по типу рынка монеты), в новой вкладке.
 */

import { useState, useMemo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import { getExchangeInfo, formatVolume, formatPrice } from '../../utils.js'
import { coinDivergence } from '../../tickers.js'
import { openTerminal } from '../../exchangeLinks.js'

const style = `
  .mt-wrap { overflow-x: auto; }
  .mt-wrap::-webkit-scrollbar { height: 5px; }
  .mt-wrap::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 3px; }

  .mt { width: 100%; border-collapse: collapse; }

  .mt thead th {
    padding: 12px 14px; text-align: left;
    font-family: var(--font-mono); font-size: 9px; font-weight: 700;
    letter-spacing: 1px; color: var(--text-muted); text-transform: uppercase;
    border-bottom: 1px solid var(--glass-border);
    background: rgba(255,255,255,0.02);
    white-space: nowrap; cursor: pointer; user-select: none;
    transition: color .15s;
  }
  .mt thead th:hover { color: var(--accent-bright); }
  .mt thead th.active { color: var(--accent-bright); }
  .mt-th-inner { display: flex; align-items: center; gap: 5px; }

  .mt tbody td {
    padding: 12px 14px; font-size: 13px;
    border-bottom: 1px solid rgba(93,163,214,0.08);
    white-space: nowrap;
  }
  .mt tbody tr { transition: background .15s; }
  .mt tbody tr:hover { background: rgba(93,163,214,0.06); }
  .mt tbody tr:last-child td { border-bottom: none; }

  .mt-num { color: var(--text-muted); font-family: var(--font-mono); font-size: 11px; }
  .mt-sym { font-weight: 700; display: flex; align-items: center; gap: 7px; }
  .mt-mkt-tag {
    font-size: 8px; font-family: var(--font-mono); font-weight: 700;
    padding: 2px 5px; border-radius: 4px;
    background: rgba(61,135,192,0.15); border: 1px solid rgba(61,135,192,0.3);
    color: var(--accent-bright);
  }
  .mt-ex { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-secondary); }
  .mt-ex-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .mt-mono { font-family: var(--font-mono); }
  .mt-up { color: var(--success); font-family: var(--font-mono); font-weight: 700; }
  .mt-down { color: var(--error); font-family: var(--font-mono); font-weight: 700; }
  .mt-dim { color: var(--text-secondary); font-family: var(--font-mono); font-size: 12px; }

  .mt-div-badge {
    font-family: var(--font-mono); font-size: 10px; font-weight: 700;
    padding: 3px 8px; border-radius: 10px;
    background: rgba(240,165,0,0.12); border: 1px solid rgba(240,165,0,0.3);
    color: var(--warning);
  }
  .mt-div-none { color: var(--text-muted); font-family: var(--font-mono); font-size: 11px; }

  .mt-arb-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px; border-radius: var(--radius-sm);
    background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
    color: var(--text-secondary); font-size: 11px; font-family: var(--font-mono);
    cursor: pointer; transition: all .15s; white-space: nowrap;
  }
  .mt-arb-btn:hover {
    border-color: var(--glass-border-hover);
    color: var(--accent-bright);
    background: rgba(93,163,214,0.08);
  }

  .mt-empty { padding: 50px 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
`

const COLUMNS = [
    { id: 'idx', label: '#', sortable: false },
    { id: 'symbol', label: 'Монета', sortable: true },
    { id: 'exchange', label: 'Биржа', sortable: true },
    { id: 'pct', label: '% изм. 24ч', sortable: true },
    { id: 'price', label: 'Цена', sortable: true },
    { id: 'high', label: 'Макс. 24ч', sortable: true },
    { id: 'low', label: 'Мин. 24ч', sortable: true },
    { id: 'volume', label: 'Объём (USDT)', sortable: true },
    { id: 'divergence', label: 'Расхождение цен', sortable: true },
    { id: 'action', label: '', sortable: false },
]

function MoversTable({ coins }) {
    const [sortBy, setSortBy] = useState('pct')
    const [sortDir, setSortDir] = useState('desc')

    const sorted = useMemo(() => {
        const list = (coins ?? []).map(c => ({ ...c, divergence: coinDivergence(c) }))

        list.sort((a, b) => {
            let av = a[sortBy]
            let bv = b[sortBy]

            // строки сортируем по алфавиту, числа — по величине
            if (typeof av === 'string') {
                const cmp = av.localeCompare(bv ?? '')
                return sortDir === 'asc' ? cmp : -cmp
            }
            av = Number(av) || 0
            bv = Number(bv) || 0
            return sortDir === 'asc' ? av - bv : bv - av
        })

        return list
    }, [coins, sortBy, sortDir])

    function toggleSort(col) {
        if (!col.sortable) return
        if (sortBy === col.id) {
            setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortBy(col.id)
            setSortDir('desc')
        }
    }

    if (!coins?.length) {
        return (
            <>
                <style>{style}</style>
                <div className="mt-empty">Нет монет, подходящих под текущие фильтры</div>
            </>
        )
    }

    return (
        <>
            <style>{style}</style>
            <div className="mt-wrap">
                <table className="mt">
                    <thead>
                        <tr>
                            {COLUMNS.map(col => {
                                const active = sortBy === col.id
                                const Icon = !col.sortable
                                    ? null
                                    : active
                                        ? (sortDir === 'asc' ? ArrowUp : ArrowDown)
                                        : ArrowUpDown
                                return (
                                    <th
                                        key={col.id}
                                        className={active ? 'active' : ''}
                                        onClick={() => toggleSort(col)}
                                        style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                                    >
                                        <span className="mt-th-inner">
                                            {col.label}
                                            {Icon && <Icon size={11} />}
                                        </span>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((c, i) => {
                            const up = c.pct > 0
                            const exInfo = getExchangeInfo(c.exchange)
                            return (
                                <tr key={`${c.symbol}_${c.exchange}`}>
                                    <td className="mt-num">{i + 1}</td>
                                    <td>
                                        <span className="mt-sym">
                                            <span className="mt-mkt-tag">
                                                {c.market === 'futures' ? 'F' : 'S'}
                                            </span>
                                            {c.symbol}/USDT
                                        </span>
                                    </td>
                                    <td>
                                        <span className="mt-ex">
                                            <span
                                                className="mt-ex-dot"
                                                style={{ background: exInfo.color }}
                                            />
                                            {exInfo.name}
                                        </span>
                                    </td>
                                    <td className={up ? 'mt-up' : 'mt-down'}>
                                        {up ? '+' : ''}{c.pct.toFixed(2)}%
                                    </td>
                                    <td className="mt-mono">{formatPrice(c.price)}</td>
                                    <td className="mt-dim">{c.high > 0 ? formatPrice(c.high) : '—'}</td>
                                    <td className="mt-dim">{c.low > 0 ? formatPrice(c.low) : '—'}</td>
                                    <td className="mt-mono">{formatVolume(c.volume)}</td>
                                    <td>
                                        {c.divergence >= 2 ? (
                                            <span className="mt-div-badge">
                                                Δ {c.divergence.toFixed(2)}%
                                            </span>
                                        ) : c.others?.length ? (
                                            <span className="mt-div-none">
                                                {c.divergence.toFixed(2)}%
                                            </span>
                                        ) : (
                                            <span className="mt-div-none">только 1 биржа</span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className="mt-arb-btn"
                                            onClick={() => openTerminal(c.exchange, c.symbol, c.market)}
                                            title="Открыть терминал биржи по этой монете"
                                        >
                                            На биржу <ExternalLink size={11} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </>
    )
}

export default MoversTable
/**
 * TopMoversPage.jsx — «Топ роста и падения»
 *
 * Пузырьковая карта (размер = сила движения) + детальная таблица.
 * Данные тянутся напрямую с 8 бирж через существующие прокси (бэкенд не нужен).
 * Обновление раз в 5 минут + кнопка «Обновить».
 *
 * Управление: поиск · рост/падение/все · фьючерсы/спот · фильтр бирж ·
 *             мин. объём (отсечь неликвид) · сортировка
 *
 * Доступна всем (воронка), без проверки подписки.
 */

import { useState, useMemo } from 'react'
import {
    Flame, Search, RefreshCw, TrendingUp, TrendingDown, LayoutGrid,
    AlertTriangle, Loader, Filter, X
} from 'lucide-react'
import { getExchangeInfo } from '../utils.js'
import { useTickers } from '../hooks/useTickers.js'
import { TICKER_EXCHANGES } from '../tickers.js'
import BubbleMap from './topmovers/BubbleMap.jsx'
import MoversTable from './topmovers/MoversTable.jsx'
import Footer from './Footer.jsx'

const style = `
  .tm-wrap { flex: 1; overflow-y: auto; position: relative; }
  .tm-wrap::-webkit-scrollbar { width: 5px; }
  .tm-wrap::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 3px; }

  .tm-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
  .tm-bg::before { content:''; position:absolute; width:600px; height:600px; top:-200px; left:5%; background: radial-gradient(circle, rgba(0,201,122,0.09), transparent 70%); }
  .tm-bg::after { content:''; position:absolute; width:520px; height:520px; top:-120px; right:5%; background: radial-gradient(circle, rgba(224,62,62,0.07), transparent 70%); }

  .tm-inner { position: relative; z-index: 1; max-width: 1400px; margin: 0 auto; padding: 36px 32px 50px; }

  /* ─── Шапка ─── */
  .tm-head { margin-bottom: 20px; }
  .tm-eyebrow { display:inline-flex; align-items:center; gap:7px; font-family:var(--font-mono); font-size:10px; letter-spacing:2px; color:var(--accent-bright); text-transform:uppercase; margin-bottom:12px; padding:6px 13px; border-radius:20px; background:rgba(61,135,192,0.08); border:1px solid rgba(61,135,192,0.22); }
  .tm-h1 { font-size:32px; font-weight:900; letter-spacing:-1px; margin-bottom:8px; }
  .tm-h1 span { background:linear-gradient(135deg,var(--success),var(--error)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .tm-sub { font-size:14px; color:var(--text-secondary); line-height:1.6; max-width:760px; }

  /* ─── Панель управления ─── */
  .tm-ctrl {
    display:flex; align-items:center; gap:10px; padding:14px 16px; margin-bottom:16px;
    background:var(--glass-fill); backdrop-filter:blur(16px);
    border:1px solid var(--glass-border); border-radius:var(--radius-lg);
    box-shadow:var(--shadow-glass); flex-wrap:wrap;
  }
  .tm-search { flex:1; min-width:180px; display:flex; align-items:center; gap:9px; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--glass-border); border-radius:var(--radius-sm); }
  .tm-search input { flex:1; background:none; border:none; outline:none; color:var(--text-primary); font-size:13px; font-family:var(--font-sans); min-width:0; }
  .tm-search input::placeholder { color:var(--text-muted); }
  .tm-search-clear { background:none; border:none; color:var(--text-muted); cursor:pointer; display:flex; padding:0; }
  .tm-search-clear:hover { color:var(--error); }

  .tm-seg { display:flex; border:1px solid var(--glass-border); border-radius:var(--radius-sm); overflow:hidden; flex-shrink:0; }
  .tm-seg button {
    padding:10px 15px; font-family:var(--font-mono); font-size:10px; font-weight:700;
    letter-spacing:0.5px; background:rgba(255,255,255,0.02); border:none;
    border-right:1px solid var(--glass-border); color:var(--text-muted);
    cursor:pointer; transition:all .15s; display:flex; align-items:center; gap:5px;
    white-space:nowrap;
  }
  .tm-seg button:last-child { border-right:none; }
  .tm-seg button:hover { color:var(--text-secondary); }
  .tm-seg button.active { background:var(--glass-fill-hover); color:var(--text-primary); }
  .tm-seg button.up.active { color:var(--success); background:rgba(0,201,122,0.12); }
  .tm-seg button.down.active { color:var(--error); background:rgba(224,62,62,0.12); }

  .tm-btn {
    display:flex; align-items:center; gap:7px; padding:10px 16px;
    border-radius:var(--radius-sm); background:rgba(255,255,255,0.02);
    border:1px solid var(--glass-border); color:var(--text-secondary);
    font-family:var(--font-mono); font-size:10px; font-weight:700; letter-spacing:0.5px;
    cursor:pointer; transition:all .15s; white-space:nowrap; flex-shrink:0;
  }
  .tm-btn:hover { border-color:var(--glass-border-hover); color:var(--text-primary); background:rgba(93,163,214,0.08); }
  .tm-btn.active { background:var(--glass-fill-hover); border-color:var(--glass-border-hover); color:var(--text-primary); }
  .tm-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .tm-spin { animation: tm-rot 1s linear infinite; }
  @keyframes tm-rot { to { transform: rotate(360deg); } }

  .tm-meta { margin-left:auto; display:flex; gap:14px; align-items:center; font-size:11px; color:var(--text-muted); font-family:var(--font-mono); flex-wrap:wrap; }
  .tm-meta b { color:var(--text-secondary); font-weight:600; }
  .tm-live { display:flex; align-items:center; gap:6px; }
  .tm-dot { width:6px; height:6px; border-radius:50%; background:var(--success); animation:tm-pulse 1.8s infinite; }
  @keyframes tm-pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }

  /* ─── Фильтр бирж ─── */
  .tm-ex-panel {
    padding:14px 16px; margin-bottom:16px;
    background:var(--glass-fill); backdrop-filter:blur(16px);
    border:1px solid var(--glass-border); border-radius:var(--radius-lg);
    box-shadow:var(--shadow-glass);
  }
  .tm-ex-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
  .tm-ex-title { font-family:var(--font-mono); font-size:10px; letter-spacing:1.5px; color:var(--text-muted); text-transform:uppercase; }
  .tm-ex-actions { display:flex; gap:8px; }
  .tm-ex-link { background:none; border:none; color:var(--accent-bright); font-size:11px; cursor:pointer; font-family:var(--font-mono); }
  .tm-ex-link:hover { text-decoration:underline; }
  .tm-ex-list { display:flex; flex-wrap:wrap; gap:8px; }
  .tm-ex-chip {
    display:flex; align-items:center; gap:7px; padding:7px 13px;
    border-radius:20px; font-size:12px; cursor:pointer;
    background:rgba(255,255,255,0.02); border:1px solid var(--glass-border);
    color:var(--text-muted); transition:all .15s;
  }
  .tm-ex-chip:hover { border-color:var(--glass-border-hover); }
  .tm-ex-chip.on { background:var(--glass-fill-hover); border-color:var(--glass-border-hover); color:var(--text-primary); }
  .tm-ex-chip-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .tm-ex-chip.off .tm-ex-chip-dot { opacity:0.3; }
  .tm-ex-fail { color:var(--error); font-size:9px; }

  /* ─── Панель-контейнер ─── */
  .tm-panel {
    background:var(--glass-fill); backdrop-filter:blur(16px);
    border:1px solid var(--glass-border); border-radius:var(--radius-lg);
    box-shadow:var(--shadow-glass); overflow:hidden; margin-bottom:16px;
  }
  .tm-panel-head { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid var(--glass-border); gap:12px; flex-wrap:wrap; }
  .tm-panel-title { font-size:13px; font-weight:700; }
  .tm-panel-hint { font-size:11px; color:var(--text-muted); font-family:var(--font-mono); }

  /* ─── Состояния ─── */
  .tm-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; height:460px; color:var(--text-secondary); }
  .tm-loading-txt { font-size:13px; }
  .tm-loading-sub { font-size:11px; color:var(--text-muted); font-family:var(--font-mono); }

  .tm-error {
    display:flex; gap:12px; padding:18px 20px; margin-bottom:16px;
    background:rgba(224,62,62,0.07); border:1px solid rgba(224,62,62,0.3);
    border-radius:var(--radius-md);
  }
  .tm-error-ic { color:var(--error); flex-shrink:0; }
  .tm-error-t { font-size:13px; font-weight:700; color:var(--error); margin-bottom:5px; }
  .tm-error-d { font-size:12px; color:var(--text-secondary); line-height:1.6; }

  .tm-warn {
    display:flex; gap:11px; padding:12px 16px; margin-bottom:16px;
    background:rgba(240,165,0,0.06); border:1px solid rgba(240,165,0,0.25);
    border-radius:var(--radius-md); font-size:12px; color:var(--text-secondary); line-height:1.5;
  }
  .tm-warn-ic { color:var(--warning); flex-shrink:0; }
  .tm-warn b { color:var(--warning); }
`

const MIN_VOLUME_OPTIONS = [
    { id: 0, label: 'ВСЕ' },
    { id: 100_000, label: '>$100K' },
    { id: 1_000_000, label: '>$1M' },
    { id: 10_000_000, label: '>$10M' },
]

function TopMoversPage({ onNavigate, onOpenArbitrage }) {
    const [market, setMarket] = useState('futures')      // futures | spot
    const [dir, setDir] = useState('all')                // all | up | down
    const [query, setQuery] = useState('')
    const [minVolume, setMinVolume] = useState(100_000)  // по умолчанию отсекаем совсем мёртвое
    const [showExFilter, setShowExFilter] = useState(false)
    const [enabledEx, setEnabledEx] = useState(() => new Set(TICKER_EXCHANGES))

    const { coins, loading, refreshing, error, failed, updatedAt, refresh } =
        useTickers(market, { minVolume })

    // Фильтрация: направление, биржи, поиск
    const filtered = useMemo(() => {
        let list = coins ?? []

        if (dir === 'up') list = list.filter(c => c.pct > 0)
        if (dir === 'down') list = list.filter(c => c.pct < 0)

        if (enabledEx.size < TICKER_EXCHANGES.length) {
            list = list.filter(c => enabledEx.has(c.exchange))
        }

        const q = query.trim().toUpperCase()
        if (q) list = list.filter(c => c.symbol.includes(q))

        return list
    }, [coins, dir, enabledEx, query])

    const gainers = filtered.filter(c => c.pct > 0).length
    const losers = filtered.filter(c => c.pct < 0).length

    function toggleEx(ex) {
        setEnabledEx(prev => {
            const next = new Set(prev)
            if (next.has(ex)) next.delete(ex)
            else next.add(ex)
            return next
        })
    }

    const timeStr = updatedAt
        ? updatedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '—'

    return (
        <>
            <style>{style}</style>
            <div className="tm-wrap">
                <div className="tm-bg" />
                <div className="tm-inner">

                    {/* Шапка */}
                    <div className="tm-head">
                        <div className="tm-eyebrow"><Flame size={13} /> ЛИДЕРЫ РЫНКА</div>
                        <div className="tm-h1">Топ <span>роста и падения</span></div>
                        <div className="tm-sub">
                            Монеты с наибольшим изменением цены за 24 часа на 8 биржах.
                            Размер пузыря — сила движения. Показывается биржа с самым сильным движением
                            по монете; при наведении видно, как та же монета ведёт себя на остальных биржах.
                        </div>
                    </div>

                    {/* Ошибка — все биржи упали */}
                    {error && (
                        <div className="tm-error">
                            <span className="tm-error-ic"><AlertTriangle size={20} /></span>
                            <div>
                                <div className="tm-error-t">Не удалось загрузить данные</div>
                                <div className="tm-error-d">
                                    {error} Попробуй нажать «Обновить». Если проблема повторяется —
                                    открой консоль браузера (админ-режим) и скинь логи <code>[TICKERS]</code>.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Предупреждение — часть бирж не ответила */}
                    {!error && failed.length > 0 && (
                        <div className="tm-warn">
                            <span className="tm-warn-ic"><AlertTriangle size={16} /></span>
                            <div>
                                <b>Часть бирж не ответила:</b> {failed.map(f => getExchangeInfo(f).name).join(', ')}.
                                Данные показаны по остальным. Подробности — в консоли (логи <code>[TICKERS]</code>).
                            </div>
                        </div>
                    )}

                    {/* Панель управления */}
                    <div className="tm-ctrl">
                        <div className="tm-search">
                            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <input
                                placeholder="Поиск монеты..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                            {query && (
                                <button className="tm-search-clear" onClick={() => setQuery('')}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Направление */}
                        <div className="tm-seg">
                            <button
                                className={dir === 'all' ? 'active' : ''}
                                onClick={() => setDir('all')}
                            >
                                <LayoutGrid size={12} /> ВСЕ
                            </button>
                            <button
                                className={`up ${dir === 'up' ? 'active' : ''}`}
                                onClick={() => setDir('up')}
                            >
                                <TrendingUp size={12} /> РОСТ
                            </button>
                            <button
                                className={`down ${dir === 'down' ? 'active' : ''}`}
                                onClick={() => setDir('down')}
                            >
                                <TrendingDown size={12} /> ПАДЕНИЕ
                            </button>
                        </div>

                        {/* Рынок */}
                        <div className="tm-seg">
                            <button
                                className={market === 'futures' ? 'active' : ''}
                                onClick={() => setMarket('futures')}
                            >
                                ФЬЮЧЕРСЫ
                            </button>
                            <button
                                className={market === 'spot' ? 'active' : ''}
                                onClick={() => setMarket('spot')}
                            >
                                СПОТ
                            </button>
                        </div>

                        {/* Мин. объём — отсечь неликвид */}
                        <div className="tm-seg">
                            {MIN_VOLUME_OPTIONS.map(o => (
                                <button
                                    key={o.id}
                                    className={minVolume === o.id ? 'active' : ''}
                                    onClick={() => setMinVolume(o.id)}
                                    title="Минимальный объём за 24ч — отсекает неликвид, где рост нарисован одной сделкой"
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>

                        {/* Фильтр бирж */}
                        <button
                            className={`tm-btn ${showExFilter ? 'active' : ''}`}
                            onClick={() => setShowExFilter(v => !v)}
                        >
                            <Filter size={13} />
                            БИРЖИ {enabledEx.size < TICKER_EXCHANGES.length ? `(${enabledEx.size})` : ''}
                        </button>

                        {/* Обновить */}
                        <button className="tm-btn" onClick={refresh} disabled={loading || refreshing}>
                            <RefreshCw size={13} className={refreshing ? 'tm-spin' : ''} />
                            ОБНОВИТЬ
                        </button>

                        <div className="tm-meta">
                            <span>Монет: <b>{filtered.length}</b></span>
                            <span style={{ color: 'var(--success)' }}>↑{gainers}</span>
                            <span style={{ color: 'var(--error)' }}>↓{losers}</span>
                            <span>Обновлено: <b>{timeStr}</b></span>
                            <span className="tm-live"><span className="tm-dot" />LIVE</span>
                        </div>
                    </div>

                    {/* Панель фильтра бирж */}
                    {showExFilter && (
                        <div className="tm-ex-panel">
                            <div className="tm-ex-head">
                                <span className="tm-ex-title">Биржи в выборке</span>
                                <div className="tm-ex-actions">
                                    <button
                                        className="tm-ex-link"
                                        onClick={() => setEnabledEx(new Set(TICKER_EXCHANGES))}
                                    >
                                        Выбрать все
                                    </button>
                                    <button
                                        className="tm-ex-link"
                                        onClick={() => setEnabledEx(new Set())}
                                    >
                                        Снять все
                                    </button>
                                </div>
                            </div>
                            <div className="tm-ex-list">
                                {TICKER_EXCHANGES.map(ex => {
                                    const info = getExchangeInfo(ex)
                                    const on = enabledEx.has(ex)
                                    const isFailed = failed.includes(ex)
                                    return (
                                        <button
                                            key={ex}
                                            className={`tm-ex-chip ${on ? 'on' : 'off'}`}
                                            onClick={() => toggleEx(ex)}
                                        >
                                            <span
                                                className="tm-ex-chip-dot"
                                                style={{ background: info.color }}
                                            />
                                            {info.name}
                                            {isFailed && <span className="tm-ex-fail">нет данных</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Пузырьковая карта */}
                    <div className="tm-panel">
                        <div className="tm-panel-head">
                            <span className="tm-panel-title">
                                Карта движений за 24 часа · {market === 'futures' ? 'Фьючерсы' : 'Спот'}
                            </span>
                            <span className="tm-panel-hint">
                                размер пузыря = сила движения · жёлтая рамка = расхождение между биржами
                            </span>
                        </div>

                        {loading ? (
                            <div className="tm-loading">
                                <Loader size={28} className="tm-spin" style={{ color: 'var(--accent-bright)' }} />
                                <span className="tm-loading-txt">Собираем данные с 8 бирж...</span>
                                <span className="tm-loading-sub">это займёт несколько секунд</span>
                            </div>
                        ) : (
                            <BubbleMap coins={filtered} onSelectCoin={onOpenArbitrage} />
                        )}
                    </div>

                    {/* Таблица */}
                    <div className="tm-panel">
                        <div className="tm-panel-head">
                            <span className="tm-panel-title">Детальная таблица</span>
                            <span className="tm-panel-hint">клик по заголовку — сортировка</span>
                        </div>
                        {!loading && (
                            <MoversTable coins={filtered} onOpenArbitrage={onOpenArbitrage} />
                        )}
                    </div>

                </div>
                <Footer onNavigate={onNavigate} />
            </div>
        </>
    )
}

export default TopMoversPage
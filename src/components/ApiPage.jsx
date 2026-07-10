import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { fetchBinance, fetchBybit, fetchOKX, fetchGate, fetchKuCoin, fetchMEXC, fetchBitget, fetchBingX } from '../api.js'
import { getBinanceStatus, getBybitStatus, getOKXStatus, getKuCoinStatus, getMEXCStatus, getBitgetStatus, getBingXStatus } from '../coinStatus.js'
import { connectOrderBook } from '../ws.js'
import { formatVolume } from '../utils.js'


const EXCHANGES = ['Binance', 'Bybit', 'OKX', 'Gate', 'KuCoin', 'MEXC', 'Bitget', 'BingX']
const TESTS = ['funding', 'volume', 'transfer', 'ws']
const TEST_LABELS = { funding: '📈 Funding Rate', volume: '📊 Volume 24h', transfer: '🔄 Deposit/WD', ws: '⚡ WebSocket' }


const FETCHERS = {
  Binance: fetchBinance, 
  Bybit: fetchBybit, 
  OKX: fetchOKX,
  Gate: fetchGate, 
  KuCoin: fetchKuCoin, 
  MEXC: fetchMEXC,
  Bitget: fetchBitget, 
  BingX: fetchBingX,
}

const STATUS_FETCHERS = {
  Binance: getBinanceStatus, 
  Bybit: getBybitStatus, 
  OKX: getOKXStatus,
  Gate: null, 
  KuCoin: getKuCoinStatus, 
  MEXC: getMEXCStatus,
  Bitget: getBitgetStatus, 
  BingX: getBingXStatus,
}

const style = `
  .ap-wrap { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

  .ap-header {
    height: 72px; background: rgba(10,26,37,0.68); backdrop-filter: blur(20px) saturate(140%);
    border-bottom: 1px solid var(--glass-border);
    display: flex; align-items: center; padding: 0 20px; gap: 16px; flex-shrink: 0;
    position: relative;
  }
  .ap-header::after {
    content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  }
  .ap-title { font-size: 18px; font-weight: 700; color: var(--text-primary); letter-spacing: 2px; }

  .ap-sep { flex: 1; }
  .ap-mode-group { display: flex; border: 1px solid var(--glass-border); border-radius: var(--radius-sm); overflow: hidden; }
  .ap-mode-btn {
    padding: 7px 13px; font-family: var(--font-sans); font-size: 13px; font-weight: 500;
    letter-spacing: 0.5px; background: rgba(255,255,255,0.02); border: none; border-right: 1px solid var(--glass-border);
    color: var(--text-secondary); cursor: pointer; transition: all .15s;
  }

  .ap-mode-btn:last-child { border-right: none; }
  .ap-mode-btn.active { background: var(--glass-fill-hover); color: var(--accent-bright); }

  .ap-toolbar {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    border-bottom: 1px solid var(--glass-border); flex-shrink: 0; background: rgba(10,26,37,0.5);
    backdrop-filter: blur(14px);
  }
  .ap-run-all {
    padding: 11px 28px; font-family: var(--font-mono); font-size: 12px; font-weight: 700;
    letter-spacing: 1.5px; background: rgba(0,201,122,0.1); border: 1px solid var(--success);
    border-radius: var(--radius-sm);
    color: var(--success); cursor: pointer; transition: all .15s;
    box-shadow: 0 0 14px rgba(0,201,122,0.1);
  }
  .ap-run-all:hover { background: rgba(0,201,122,0.2); }
  .ap-pills { display: flex; border: 1px solid var(--glass-border); border-radius: var(--radius-sm); overflow: hidden; }
  .ap-pill {
    padding: 10px 19px; font-family: var(--font-mono); font-size: 11px; font-weight: 700;
    letter-spacing: 1px; background: rgba(255,255,255,0.02); border: none; border-right: 1px solid var(--glass-border);
    color: var(--text-muted); cursor: pointer; transition: all .15s;
  }
  .ap-pill:last-child { border-right: none; }
  .ap-pill.active { background: var(--glass-fill-hover); color: var(--accent-bright); }
  .ap-counters { margin-left: auto; display: flex; gap: 8px; }
  .ap-counter {
    padding: 6px 13px; border: 1px solid var(--glass-border); border-radius: 20px;
    background: rgba(255,255,255,0.02);
    font-family: var(--font-mono); font-size: 11px; font-weight: 700;
    display: flex; align-items: center; gap: 6px;
  }
  .ap-counter-label { font-size: 8px; color: var(--text-muted); letter-spacing: 1px; }

  .ap-matrix-wrap { flex: 1; overflow-y: auto; padding: 16px; }
  .ap-matrix-wrap::-webkit-scrollbar { width: 4px; }
  .ap-matrix-wrap::-webkit-scrollbar-track { background: var(--bg-primary); }
  .ap-matrix-wrap::-webkit-scrollbar-thumb { background: var(--border); }

  .ap-matrix { border: 1px solid var(--glass-border); background: var(--glass-fill); backdrop-filter: blur(16px) saturate(140%); border-radius: var(--radius-md); box-shadow: var(--shadow-glass); overflow: hidden; }

  .ap-matrix-head {
    display: grid; grid-template-columns: 160px repeat(4, 1fr) 110px;
    border-bottom: 2px solid var(--glass-border); background: rgba(255,255,255,0.02);
  }
  .ap-mh-cell {
    padding: 10px 14px; font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
    color: var(--text-muted); text-transform: uppercase;
    border-right: 1px solid var(--glass-border); display: flex; align-items: center;
  }
  .ap-mh-cell:last-child { border-right: none; }

  .ap-matrix-row {
    display: grid; grid-template-columns: 160px repeat(4, 1fr) 110px;
    border-bottom: 1px solid var(--glass-border); transition: background .15s;
  }
  .ap-matrix-row:last-child { border-bottom: none; }
  .ap-matrix-row:hover { background: rgba(93,163,214,0.06); }

  .ap-row-ex {
    padding: 14px; border-right: 1px solid var(--glass-border);
    display: flex; align-items: center; gap: 8px;
  }
  .ap-ex-dot {
    width: 8px; height: 8px; border-radius: 50%; background: var(--border); flex-shrink: 0; transition: background .3s;
  }
  .ap-ex-dot.ok  { background: var(--success); box-shadow: 0 0 6px rgba(0,201,122,0.35); }
  .ap-ex-dot.err { background: var(--error); }
  .ap-ex-dot.run { background: var(--warning); animation: ap-pulse 0.8s infinite; }
  .ap-ex-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }

  .ap-cell {
    border-right: 1px solid var(--glass-border); display: flex; align-items: center;
    justify-content: center; padding: 10px; cursor: pointer; transition: background .15s; flex-direction: column; gap: 4px;
  }
  .ap-cell:last-child { border-right: none; }
  .ap-cell:hover { background: rgba(93,163,214,0.1); }

  .ap-badge {
    width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; font-size: 14px; border: 2px solid var(--glass-border);
    background: rgba(255,255,255,0.03); transition: all .3s;
  }
  .ap-badge.ok  { border-color: var(--success); background: rgba(0,201,122,0.12); box-shadow: 0 0 12px rgba(0,201,122,0.15); }
  .ap-badge.err { border-color: var(--error); background: rgba(224,62,62,0.12); }
  .ap-badge.run { border-color: var(--warning); animation: ap-pulse 0.8s infinite; }

  .ap-cell-val { font-family: var(--font-mono); font-size: 9px; color: var(--text-muted); text-align: center; min-height: 12px; }
  .ap-cell-val.ok  { color: var(--success); }
  .ap-cell-val.err { color: var(--error); }

  .ap-row-action { display: flex; align-items: center; justify-content: center; padding: 10px; }
  .ap-row-btn {
    padding: 6px 15px; font-family: var(--font-mono); font-size: 9px; font-weight: 700;
    letter-spacing: 1px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: var(--text-muted); cursor: pointer; transition: all .15s;
  }
  .ap-row-btn:hover { border-color: var(--glass-border-hover); color: var(--accent-bright); background: rgba(93,163,214,0.08); }
  .ap-row-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .ap-detail {
    position: fixed; bottom: 0; left: 68px; right: 0;
    background: rgba(13,32,51,0.82); backdrop-filter: blur(26px) saturate(150%);
    border-top: 1px solid var(--glass-border-hover);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: 0 -12px 48px rgba(0,0,0,0.5);
    transition: height .3s ease; overflow: hidden; z-index: 50; height: 0;
  }
  .ap-detail.open { height: 260px; }
  .ap-detail-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 9px 16px; background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--glass-border); flex-shrink: 0;
  }
  .ap-detail-title { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; color: var(--text-secondary); }
  .ap-detail-btns { display: flex; gap: 8px; }
  .ap-detail-btn {
    padding: 4px 13px; font-family: var(--font-mono); font-size: 9px; font-weight: 700;
    letter-spacing: 1px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    color: var(--text-muted); cursor: pointer; transition: all .15s;
  }
  .ap-detail-btn:hover { border-color: var(--glass-border-hover); color: var(--accent-bright); }
  .ap-detail-btn.copied { border-color: var(--success); color: var(--success); }
  .ap-detail-body {
    padding: 10px 16px; height: 200px; overflow-y: auto;
    font-family: var(--font-mono); font-size: 12px; line-height: 1.9; background: rgba(0,0,0,0.15);
  }
  .ap-detail-body::-webkit-scrollbar { width: 4px; }
  .ap-detail-body::-webkit-scrollbar-track { background: transparent; }
  .ap-detail-body::-webkit-scrollbar-thumb { background: var(--glass-border); }
  .ap-log { display: flex; gap: 10px; }
  .ap-log-t { color: var(--text-muted); flex-shrink: 0; }
  .ap-log-m { color: var(--text-secondary); }
  .ap-log-m.ok   { color: var(--success); }
  .ap-log-m.err  { color: var(--error); }
  .ap-log-m.info { color: var(--accent-bright); }

  @keyframes ap-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
`

function initState() {
  const s = {}
  EXCHANGES.forEach(ex => {
    s[ex] = {}
    TESTS.forEach(t => { s[ex][t] = { status: 'idle', val: '', logs: [] } })
  })
  return s
}

function ts() {
  return new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function ApiPage() {
    const [filterCol, setFilterCol] = useState('all')
    const [testState, setTestState] = useState(initState)
    const [selected, setSelected] = useState(null)
    const [copied, setCopied] = useState(false)
    const stopRef = useRef(false)
    const activeWsRef = useRef([])
    const [isRunning, setIsRunning] = useState(false)
    const [testCoin, setTestCoin] = useState('BTC')

    useEffect(() => {
        return () => {
            stopRef.current = true
            activeWsRef.current.forEach(item => { item.abort?.(); item.ws?.close() })
            activeWsRef.current = []
        }
    }, [])

    useEffect(() => {
        stopRef.current = true
        activeWsRef.current.forEach(item => { item.abort?.(); item.ws?.close() })
        activeWsRef.current = []
        setIsRunning(false)
    }, [testCoin])


    const TEST_SYMBOL = {
        Binance: testCoin, Bybit: testCoin, OKX: testCoin, Gate: testCoin,
        KuCoin: testCoin === 'BTC' ? 'XBT' : testCoin,
        MEXC: testCoin, Bitget: testCoin, BingX: testCoin,
    }
    const SPOT_SYMBOL = {
        Binance: testCoin, Bybit: testCoin, OKX: testCoin, Gate: testCoin,
        KuCoin: testCoin, MEXC: testCoin, Bitget: testCoin, BingX: testCoin,
    }

    const updateCell = useCallback((ex, test, patch) => {
        setTestState(prev => ({
            ...prev,
            [ex]: { ...prev[ex], [test]: { ...prev[ex][test], ...patch } }
        }))
    }, [])

    const addLog = useCallback((ex, test, emoji, msg, cls = '') => {
        const line = { t: ts(), emoji, msg, cls }
        setTestState(prev => ({
            ...prev,
            [ex]: {
                ...prev[ex], 
                [test]: { ...prev[ex][test], logs: [...prev[ex][test].logs, line] }
            }
        }))
    }, [])

    const runCell = async (ex, test) => {
        const sym = TEST_SYMBOL[ex]
        const spotSym = SPOT_SYMBOL[ex]

        updateCell(ex, test, { status: 'run', val: '', logs: [] })
        addLog(ex, test, '🔄', `Запрос к ${ex} — монета: ${sym}`, 'info')

        try {
            if (test === 'funding' || test === 'volume') {
                addLog(ex, test, '⏳', `Вызов FETCHERS['${ex}']('${sym}') из api.js...`, '')
                const data = await FETCHERS[ex]?.(sym)

                if (!data) {
                    addLog(ex, test, '⚠️', 'Функция вернула null — внутри api.js была поймана ошибка', 'err')
                    addLog(ex, test, '🔍', 'Проверь: console.warn в браузере → там полный текст ошибки', 'err')
                    addLog(ex, test, '🔍', 'Вероятные причины: прокси не настроен, биржа недоступна, неверный символ', 'err')
                    throw new Error(`FETCHERS['${ex}'] вернул null`)
                }

                addLog(ex, test, '📦', `Ответ получен: funding=${data.funding}, volume=${data.volume}, nextFunding=${data.nextFunding}`, '')

                if (test === 'funding') {
                    const rate = (data.funding * 100).toFixed(4)
                    const next = data.nextFunding ? new Date(data.nextFunding).toLocaleTimeString('ru') : 'не передан'
                    updateCell(ex, test, { status: 'ok', val: rate + '%' })
                    addLog(ex, test, '✅', `rate=${rate}%  |  rawDecimal=${data.funding}  |  next=${next}`, 'ok')
                } else {
                    const vol = formatVolume(data.volume)
                    updateCell(ex, test, { status: 'ok', val: '$' + vol })
                    addLog(ex, test, '✅', `volume=$${vol} USDT  |  rawValue=${Math.round(data.volume).toLocaleString()}`, 'ok')
                }
            }

            if (test === 'transfer') {
                const fetcher = STATUS_FETCHERS[ex]
                if (!fetcher) {
                    addLog(ex, test, '⏳', `STATUS_FETCHERS нет → пробуем FETCHERS['${ex}'] из api.js...`, '')
                    const mainData = await FETCHERS[ex]?.(spotSym)
                    if (mainData?.deposit !== undefined) {
                        const d = mainData.deposit, w = mainData.withdraw
                        updateCell(ex, test, { status: 'ok', val: `D:${d ? '✅' : '❌'} W:${w ? '✅' : '❌'}` })
                        addLog(ex, test, '📦', `deposit=${mainData.deposit}, withdraw=${mainData.withdraw}`, '')
                        addLog(ex, test, '✅', `deposit=${d ? '✅ открыт' : '🚫 закрыт'}  |  withdraw=${w ? '✅ открыт' : '🚫 закрыт'}`, 'ok')
                        if (!d || !w) addLog(ex, test, '⚠️', 'Частичный статус — перевод может быть недоступен', 'err')
                    } else {
                        updateCell(ex, test, { status: 'ok', val: 'N/A' })
                        addLog(ex, test, '⚠️', `${ex} — данные о переводах недоступны`, 'info')
                    }
                    return
                }

                addLog(ex, test, '⏳', `Вызов STATUS_FETCHERS['${ex}']('${sym}') из coinStatus.js...`, '')
                const data = await fetcher(sym)
                addLog(ex, test, '📦', `Ответ: deposit=${data.deposit}, withdraw=${data.withdraw}`, '')
                const d = data.deposit, w = data.withdraw
                updateCell(ex, test, { status: 'ok', val: `D:${d ? '✅' : '❌'} W:${w ? '✅' : '❌'}` })
                addLog(ex, test, '✅', `deposit=${d ? '✅ открыт' : '🚫 закрыт'}  |  withdraw=${w ? '✅ открыт' : '🚫 закрыт'}`, 'ok')
                if (!d || !w) addLog(ex, test, '⚠️', 'Частичный статус — перевод может быть недоступен', 'err')
            }

            if (test === 'ws') {
                addLog(ex, test, '⏳', `connectOrderBook('${ex.toLowerCase()}', '${sym}', 'futures') из ws.js...`, '')
                const t0 = Date.now()
                await new Promise((resolve, reject) => {
                    let done = false
                    const timeout = setTimeout(() => {
                        if (done) return
                        done = true
                        activeWsRef.current = activeWsRef.current.filter(i => i.abort !== abort)
                        reject(new Error('Timeout 8s — WS не ответил за 8 секунд'))
                    }, 8000)
                    const abort = () => {
                        if (done) return
                        done = true
                        clearTimeout(timeout)
                        reject(new Error('Тест остановлен'))
                    }
                    const entry = { abort, ws: null }
                    activeWsRef.current.push(entry)
                    const ws = connectOrderBook(ex.toLowerCase(), sym, 'futures', (data) => {
                        if (done) return
                        done = true
                        clearTimeout(timeout)
                        activeWsRef.current = activeWsRef.current.filter(i => i !== entry)
                        ws.close()
                        const latency = Date.now() - t0
                        const bids = data.bids?.length ?? 0
                        const asks = data.asks?.length ?? 0
                        const topBid = data.bids?.[0]?.[0] ?? '?'
                        const topAsk = data.asks?.[0]?.[0] ?? '?'
                        updateCell(ex, 'ws', { status: 'ok', val: latency + 'ms' })
                        addLog(ex, 'ws', '📦', `Снэпшот получен: bids=${bids} уровней, asks=${asks} уровней`, '')
                        addLog(ex, 'ws', '✅', `topBid=$${topBid}  |  topAsk=$${topAsk}  |  latency=${latency}ms`, 'ok')
                        resolve()
                    })
                    entry.ws = ws
                })
            }


        } catch (e) {
            updateCell(ex, test, { status: 'err', val: 'ERR' })
            addLog(ex, test, '❌', `Ошибка: ${e.message}`, 'err')
            if (test === 'ws') {
                addLog(ex, test, '🔍', 'Проверь: WS адаптер в ws.js → функция для этой биржи существует?', 'err')
                addLog(ex, test, '🔍', 'Проверь: браузер не блокирует WSS соединение (CORS/firewall)', 'err')
            }
            if (test === 'funding' || test === 'volume') {
                addLog(ex, test, '🔍', 'Проверь vite.config.js → есть ли proxy для этой биржи?', 'err')
            }
            if (test === 'transfer') {
                addLog(ex, test, '🔍', 'Проверь .env → API ключи для этой биржи заданы?', 'err')
            }
        }
    }




    const runRow = async (ex) => {
        for (const t of TESTS) {
            if (stopRef.current) break
            await runCell(ex, t)
        }
    }

    const runAll = async () => {
        stopRef.current = false
        setIsRunning(true)
        for (const ex of EXCHANGES) {
            if (stopRef.current) break
            await runRow(ex)
        }
        setIsRunning(false)
    }

    const stopTests = () => {
        stopRef.current = true
        activeWsRef.current.forEach(item => { item.abort?.(); item.ws?.close() })
        activeWsRef.current = []
        setIsRunning(false)
    }


    const getMock = (test, ex) => {
        if (test === 'funding') {
        const rate = ((Math.random() - 0.5) * 0.04).toFixed(4)
        return { val: rate + '%', msg: `rate=${rate}%, next=0${Math.floor(Math.random()*8)}:${String(Math.floor(Math.random()*60)).padStart(2,'0')}:00` }
        }
        if (test === 'volume') {
        const v = (Math.random() * 500 + 50).toFixed(0)
        return { val: '$' + v + 'M', msg: `volume=$${v}M USDT` }
        }
        if (test === 'transfer') {
        const d = Math.random() > 0.1, w = Math.random() > 0.15
        return { val: `D:${d?'✅':'❌'} W:${w?'✅':'❌'}`, msg: `deposit=${d?'✅ открыт':'🚫 закрыт'}, withdraw=${w?'✅ открыт':'🚫 закрыт'}` }
        }
        const ms = Math.floor(Math.random() * 300 + 80)
        return { val: ms + 'ms', msg: `подключён, bids=${Math.floor(Math.random()*50+10)}, asks=${Math.floor(Math.random()*50+10)}, latency=${ms}ms` }
    }

    const getExDot = (ex) => {
        const statuses = TESTS.map(t => testState[ex][t].status)
        if (statuses.some(s => s === 'run')) return 'run'
        if (statuses.every(s => s === 'ok')) return 'ok'
        if (statuses.some(s => s === 'err')) return 'err'
        return ''
    }

    const totals = useMemo(() => {
        let ok = 0, err = 0, done = 0
        EXCHANGES.forEach(ex => TESTS.forEach(t => {
            const s = testState[ex][t].status
            if (s === 'ok') { ok++; done++ }
            if (s === 'err') { err++; done++ }
        }))
        return { ok, err, done, total: EXCHANGES.length * TESTS.length }
    }, [testState])

    const { ok, err, done, total } = totals

    const showCols = TESTS.filter(t => filterCol === 'all' || filterCol === t)

    const selLogs = selected ? testState[selected.ex][selected.test].logs : []

    const copyLogs = () => {
        const text = selLogs.map(l => `[${l.t}] ${l.emoji} ${l.msg}`).join('\n')
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const colCount = showCols.length
    const gridCols = filterCol === 'all'
        ? `160px repeat(${colCount}, 1fr) 110px`
        : `160px repeat(${colCount}, 200px) 110px`

    return (
        <>
        <style>{style}</style>
        <div className="ap-wrap">

            {/* Header */}
            <div className="ap-header">
            <span className="ap-title">API</span>
            <div className="ap-sep" />
            <div className="ap-mode-group">
                <button className="ap-mode-btn active" style={{ cursor: 'default' }}>FUTURES</button>
                <button className="ap-mode-btn" style={{ opacity: 0.35, cursor: 'not-allowed' }}>FUNDING</button>
            </div>
            <div className="ap-mode-group">
                <button className={`ap-mode-btn ${testCoin === 'BTC' ? 'active' : ''}`} onClick={() => setTestCoin('BTC')}>BTC</button>
                <button className={`ap-mode-btn ${testCoin === 'ETH' ? 'active' : ''}`} onClick={() => setTestCoin('ETH')}>ETH</button>
            </div>

            </div>

            {/* Toolbar */}
            <div className="ap-toolbar">
            {isRunning
            ? <button className="ap-run-all" style={{ background: 'rgba(224,62,62,0.1)', borderColor: 'var(--error)', color: 'var(--error)' }} onClick={stopTests}>⬛ ОСТАНОВИТЬ</button>
            : <button className="ap-run-all" onClick={runAll}>▶ ТЕСТ ВСЕГО</button>
            }
            <div className="ap-pills">
                {['all', ...TESTS].map(col => (
                <button key={col} className={`ap-pill ${filterCol === col ? 'active' : ''}`} onClick={() => setFilterCol(col)}>
                    {col === 'all' ? 'ВСЕ' : TEST_LABELS[col]}
                </button>
                ))}
            </div>
            <div className="ap-counters">
                <div className="ap-counter"><span className="ap-counter-label">OK</span><span style={{ color: 'var(--success)' }}>{ok}</span></div>
                <div className="ap-counter"><span className="ap-counter-label">ERR</span><span style={{ color: 'var(--error)' }}>{err}</span></div>
                <div className="ap-counter"><span className="ap-counter-label">TOTAL</span><span style={{ color: 'var(--text-secondary)' }}>{done}/{total}</span></div>
            </div>
            </div>

            {/* Matrix */}
            <div className="ap-matrix-wrap" style={{ paddingBottom: selected ? 270 : 0 }}>
            <div className="ap-matrix" style={{ width: filterCol === 'all' ? '100%' : `${160 + colCount * 200 + 110}px` }}>


                {/* Head */}
                <div className="ap-matrix-head" style={{ gridTemplateColumns: gridCols }}>
                <div className="ap-mh-cell">БИРЖА</div>
                {showCols.map(t => <div key={t} className="ap-mh-cell">{TEST_LABELS[t]}</div>)}
                <div className="ap-mh-cell">ДЕЙСТВИЕ</div>
                </div>

                {/* Rows */}
                {EXCHANGES.map(ex => (
                <div key={ex} className="ap-matrix-row" style={{ gridTemplateColumns: gridCols }}>
                    <div className="ap-row-ex">
                    <div className={`ap-ex-dot ${getExDot(ex)}`} />
                    <div className="ap-ex-name">{ex}</div>
                    </div>

                    {showCols.map(t => {
                    const cell = testState[ex][t]
                    return (
                        <div key={t} className="ap-cell" onClick={() => setSelected({ ex, test: t })}>
                        <div className={`ap-badge ${cell.status}`}>
                            {cell.status === 'idle' ? '·' : cell.status === 'run' ? '⟳' : cell.status === 'ok' ? '✓' : '✗'}
                        </div>
                        <div className={`ap-cell-val ${cell.status}`}>{cell.val}</div>
                        </div>
                    )
                    })}

                    <div className="ap-row-action">
                    <button className="ap-row-btn" disabled={isRunning} onClick={() => { stopRef.current = false; setIsRunning(true); runRow(ex).then(() => setIsRunning(false)) }}>▶ ТЕСТ</button>
                    </div>
                </div>
                ))}

            </div>
            </div>

            {/* Detail Panel */}
            <div className={`ap-detail ${selected ? 'open' : ''}`}>
            <div className="ap-detail-head">
                <span className="ap-detail-title">
                {selected ? `${TEST_LABELS[selected.test]} — ${selected.ex.toUpperCase()}` : ''}
                </span>
                <div className="ap-detail-btns">
                <button className={`ap-detail-btn ${copied ? 'copied' : ''}`} onClick={copyLogs}>
                    {copied ? '✓ COPIED' : 'COPY'}
                </button>
                <button className="ap-detail-btn" onClick={() => setSelected(null)}>✕ ЗАКРЫТЬ</button>
                </div>
            </div>
            <div className="ap-detail-body">
                {selLogs.length === 0
                ? <span style={{ color: 'var(--text-muted)' }}>— нет данных, запустите тест</span>
                : selLogs.map((l, i) => (
                    <div key={i} className="ap-log">
                        <span className="ap-log-t">{l.t}</span>
                        <span className={`ap-log-m ${l.cls}`}>{l.emoji} {l.msg}</span>
                    </div>
                    ))
                }
            </div>
            </div>

        </div>
        </>
    )
}

export default ApiPage
import { useState, useMemo, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { EXCHANGES } from "./constants.js";
import StatsRow from "./components/StatsRow.jsx";
import OpportunityGrid from "./components/OpportunityGrid.jsx";
import FilterDrawer from "./components/FilterDrawer.jsx";
import DetailModal from "./components/DetailModal.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import ActiveTradesBar from "./components/ActiveTradesBar.jsx";
import ApiPage from "./components/ApiPage.jsx";
import { enrichOpportunities, enrichSingleOpportunity, clearCacheForOpp } from "./api.js";
import { calcVwap } from "./utils.js";
import HomePage from "./components/HomePage.jsx";
import { loadSession, checkAccess, saveSession, clearSession } from "./auth.js";
import TelegramAuthModal from "./components/TelegramAuthModal.jsx";
import AccessDenied from "./components/AccessDenied.jsx";

const DEFAULT_FILTERS = {
  strategy: { sf: true, ff: true },
  exchanges: Object.keys(EXCHANGES),
  minSpread: 0,
  tradeAmount: 100,
  funding: { positive: true, negative: true },
  transfer: { deposit: true, withdraw: true },
  onlyPositiveFunding: false,
}

// Подпись статуса — сравниваем при каждой проверке
function getSignature(user) {
  if (!user) return ''
  return `${user.isCexCexPaid}|${user.isDexCexPaid}|${user.isAdmin}`
}

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('activeTab') || 'main' }
    catch { return 'main' }
  })
  const [activePage, setActivePage] = useState(() => {
    try { return localStorage.getItem('activePage') || 'home' }
    catch { return 'home' }
  })
  const [sortMode, setSortMode] = useState(() => {
    try { return localStorage.getItem('sortMode') || 'spread' }
    catch { return 'spread' }
  })
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('viewMode') || 'grid' }
    catch { return 'grid' }
  })
  const [filters, setFilters] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('userFilters'))
      return saved ? { ...DEFAULT_FILTERS, ...saved } : DEFAULT_FILTERS
    }
    catch { return DEFAULT_FILTERS }
  })

  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [liveOpp, setLiveOpp] = useState(null)
  const [selectedActiveTrade, setSelectedActiveTrade] = useState(null)
  const [liveData, setLiveData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rawData, setRawData] = useState(null)

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favorites')) || [] }
    catch { return [] }
  })
  const [hidden, setHidden] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hidden')) || [] }
    catch { return [] }
  })
  const [activeTrades, setActiveTrades] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('activeTrades'))
      return Array.isArray(stored) ? stored : []
    }
    catch { return [] }
  })

  // ── Auth ───────────────────────────────────────────────────────────────────
  // Три возможных статуса:
  //   'unknown'  — не авторизован, показываем TelegramAuthModal
  //   'checking' — авторизован, идёт первичная проверка доступа
  //   'ready'    — проверка завершена, user содержит актуальный статус

  const [auth, setAuth] = useState(() => {
    // Localhost → автоматически входим как dev-пользователь, без модалки Telegram
    if (window.location.hostname === 'localhost') {
      return {
        status: 'checking',
        user: { userId: 5295815261, login: 'dev', photoUrl: null }
      }
    }
    // Ngrok / продакшен → стандартный flow через Telegram
    const session = loadSession()
    if (session) return { status: 'checking', user: session }
    return { status: 'unknown', user: null }
  })

  const sigRef = useRef(null)           // текущая подпись статуса
  const scanIntervalRef = useRef(null)  // интервал запросов к биржам
  const accessIntervalRef = useRef(null)// интервал проверки доступа
  const liveOppIntervalRef = useRef(null)
  const liveOppRef = useRef(null)

  // ── Эффект: первичная проверка доступа при старте ─────────────────────────
  // Запускается один раз когда status === 'checking'
  // Результат определяет — запускать скринер или нет

  useEffect(() => {
    if (auth.status !== 'checking' || !auth.user?.userId) return

    checkAccess(auth.user.userId).then(access => {
      if (!access) {
        // Ошибка сети — используем данные из сессии как есть
        const user = auth.user
        sigRef.current = getSignature(user)
        setAuth({ status: 'ready', user })
        return
      }

      // Обновляем сессию актуальными данными и переходим в ready
      const updatedUser = { ...auth.user, ...access }
      saveSession(updatedUser)
      sigRef.current = getSignature(updatedUser)
      setAuth({ status: 'ready', user: updatedUser })
    })
  }, [auth.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Эффект: фоновая проверка доступа каждые 60с ───────────────────────────
  // Работает только когда status === 'ready'
  // Если подпись изменилась → saveSession → reload

  useEffect(() => {
    if (auth.status !== 'ready' || !auth.user?.userId) {
      clearInterval(accessIntervalRef.current)
      accessIntervalRef.current = null
      return
    }

    const userId = auth.user.userId

    async function checkStatus() {
      const access = await checkAccess(userId)
      if (!access) return // ошибка сети — пропускаем

      const newSig = getSignature(access)
      if (newSig === sigRef.current) return // не изменилось — ничего не делаем

      // Статус изменился:
      // 1. Сохраняем новый статус в sessionStorage ДО перезагрузки
      const updatedUser = { ...auth.user, ...access }
      saveSession(updatedUser)
      // 2. Перезагружаем — при старте снова пройдёт 'checking' с новыми данными
      window.location.reload()
    }

    accessIntervalRef.current = setInterval(checkStatus, 60000)
    return () => {
      clearInterval(accessIntervalRef.current)
      accessIntervalRef.current = null
    }
  }, [auth.status, auth.user?.userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleAuthSuccess(userData) {
    saveSession(userData)
    // Запускаем проверку доступа перед тем как открыть скринер
    setAuth({ status: 'checking', user: userData })
  }

  function handleLogout() {
    clearSession()
    clearInterval(scanIntervalRef.current)
    clearInterval(accessIntervalRef.current)
    scanIntervalRef.current = null
    accessIntervalRef.current = null
    sigRef.current = null
    setAuth({ status: 'unknown', user: null })
    setLiveData(null)
    setIsLoading(true)
  }

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem('favorites', JSON.stringify(next))
      return next
    })
  }
  const toggleHidden = (id) => {
    setHidden(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem('hidden', JSON.stringify(next))
      return next
    })
  }
  const addActiveTrade = (trade) => {
    setActiveTrades(prev => {
      if (prev.length >= 5) return prev
      const next = [...prev, trade]
      localStorage.setItem('activeTrades', JSON.stringify(next))
      return next
    })
  }
  const removeActiveTrade = (id) => {
    setActiveTrades(prev => {
      const next = prev.filter(t => t.id !== id)
      localStorage.setItem('activeTrades', JSON.stringify(next))
      return next
    })
    if (selectedActiveTrade?.id === id) {
      setSelected(null)
      setSelectedActiveTrade(null)
    }
  }

  // ── Фильтрация ─────────────────────────────────────────────────────────────

  const opportunities = useMemo(() => {
    let result = (liveData || []).map(opp => {
      if (!opp.raw_bid || !opp.raw_ask) return opp
      const bid_price = calcVwap(opp.raw_bid, filters.tradeAmount)
      const ask_price = calcVwap(opp.raw_ask, filters.tradeAmount)
      if (!bid_price || !ask_price) return opp
      const spread = (ask_price - bid_price) / bid_price * 100
      return { ...opp, bid_price, ask_price, spread }
    })

    if (!filters.strategy.sf) result = result.filter(o => o.strategy !== 'sf')
    if (!filters.strategy.ff) result = result.filter(o => o.strategy !== 'ff')

    if (!filters.funding.positive || !filters.funding.negative) {
      result = result.filter(o => {
        const bidRate = o.bid_funding?.rate ?? 0
        const askRate = o.ask_funding?.rate ?? 0
        const isPositive = o.strategy === 'sf'
          ? askRate >= 0
          : bidRate >= 0 && askRate >= 0
        if (isPositive) return filters.funding.positive
        return filters.funding.negative
      })
    }

    if (filters.exchanges.length > 0) {
      result = result.filter(o =>
        filters.exchanges.includes(o.bid_ex) &&
        filters.exchanges.includes(o.ask_ex)
      )
    }

    if (filters.minSpread > 0) {
      result = result.filter(o => o.spread >= filters.minSpread)
    }

    result = result.filter(o => {
      const bidDep = o.bid_transfer?.deposit
      const askDep = o.ask_transfer?.deposit
      const bidWd  = o.bid_transfer?.withdraw
      const askWd  = o.ask_transfer?.withdraw
      const depOk = (bidDep === null || askDep === null) ? true : !!(bidDep && askDep)
      const wdOk  = (bidWd  === null || askWd  === null) ? true : !!(bidWd  && askWd)
      return depOk === filters.transfer.deposit && wdOk === filters.transfer.withdraw
    })

    result.sort((a, b) => {
      if (sortMode === 'spread') return b.spread - a.spread
      if (sortMode === 'age')    return new Date(b.first_seen) - new Date(a.first_seen)
      if (sortMode === 'volume') return (b.bid_volume + b.ask_volume) - (a.bid_volume + a.ask_volume)
      return 0
    })

    result.sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 1 : 0
      const bFav = favorites.includes(b.id) ? 1 : 0
      return bFav - aFav
    })

    result = result.filter(o => !hidden.includes(o.id))
    return result
  }, [filters, sortMode, liveData, hidden, favorites])

  const hiddenOpportunities = useMemo(() => {
    return (liveData || []).filter(o => hidden.includes(o.id))
  }, [hidden, liveData])

  // ── Эффект: загрузка FinalData.json ───────────────────────────────────────

  useEffect(() => {
    fetch('/FinalData.json')
      .then(r => r.json())
      .then(data => setRawData(data.opportunities))
      .catch(err => console.error('FinalData load failed:', err))
  }, [])

  // ── Эффект: запросы к биржам каждые 60с ───────────────────────────────────
  // Запускаются ТОЛЬКО когда:
  //   - status === 'ready'       (проверка доступа завершена)
  //   - isCexCexPaid === true    (доступ есть)
  //   - activePage === 'futures' (мы на нужной странице)
  //   - selected === null        (модалка закрыта)
  //   - rawData загружен

  const canScan = (
    auth.status === 'ready' &&
    auth.user?.isCexCexPaid === true &&
    activePage === 'futures' &&
    selected === null &&
    rawData !== null
  )

  useEffect(() => {
    if (!canScan) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
      return
    }

    async function refresh() {
      const enriched = await enrichOpportunities(rawData, filters.tradeAmount)
      setLiveData(enriched)
      setIsLoading(false)
    }

    refresh()
    scanIntervalRef.current = setInterval(refresh, 60000)
    return () => {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }, [canScan, rawData])

  // ── Эффект: 10s поллинг liveOpp пока модалка открыта ─────────────────────

  useEffect(() => {
    if (!selected) {
      clearInterval(liveOppIntervalRef.current)
      liveOppIntervalRef.current = null
      setLiveOpp(null)
      return
    }
    clearCacheForOpp(selected)
    setLiveOpp(selected)
    liveOppRef.current = selected

    async function refreshLive() {
      const enriched = await enrichSingleOpportunity(liveOppRef.current || selected)
      setLiveOpp(enriched)
      liveOppRef.current = enriched
    }

    refreshLive()
    liveOppIntervalRef.current = setInterval(refreshLive, 10000)
    return () => clearInterval(liveOppIntervalRef.current)
  }, [selected])

  // Сохранение настроек
  useEffect(() => { try { localStorage.setItem('sortMode', sortMode) } catch {} }, [sortMode])
  useEffect(() => { try { localStorage.setItem('viewMode', viewMode) } catch {} }, [viewMode])
  useEffect(() => { try { localStorage.setItem('userFilters', JSON.stringify(filters)) } catch {} }, [filters])
  useEffect(() => { try { localStorage.setItem('activeTab', activeTab) } catch {} }, [activeTab])
  useEffect(() => { try { localStorage.setItem('activePage', activePage) } catch {} }, [activePage])

  const handleOpenModal       = (opp)   => { setSelected(opp); setSelectedActiveTrade(null) }
  const handleOpenActiveTrade = (trade) => { setSelected(trade.opp); setSelectedActiveTrade(trade) }
  const handleCloseModal      = ()      => { setSelected(null); setSelectedActiveTrade(null); setLiveOpp(null) }
  const handleTrade = (opp, avgLong, avgShort) => {
    const trade = { id: `${opp.id}_${Date.now()}`, opp, avgLong, avgShort, openedAt: new Date().toISOString() }
    addActiveTrade(trade)
    setSelectedActiveTrade(trade)
  }

  // ── Что показывать на странице futures ────────────────────────────────────
  const showAuthModal    = activePage === 'futures' && auth.status === 'unknown'
  const showAccessDenied = activePage === 'futures' && auth.status === 'ready' && !auth.user?.isCexCexPaid

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activePage={activePage}
        onPageChange={setActivePage}
        authUser={auth.status === 'ready' ? auth.user : null}
        onLogout={handleLogout}
      />

      <div className="main-area" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {activePage === 'home' ? (
          <HomePage onOpenScanner={() => { setActiveTab('futures'); setActivePage('futures') }} />
        ) : activePage === 'api' ? (
          <ApiPage />
        ) : (
          <>
            <Header
              total={opportunities.length}
              sortMode={sortMode}
              onSort={setSortMode}
              viewMode={viewMode}
              onViewMode={setViewMode}
              onOpenFilters={() => setFilterOpen(true)}
              hiddenItems={hiddenOpportunities}
              onRestore={toggleHidden}
            />

            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Не авторизован → модалка входа */}
              {showAuthModal && (
                <TelegramAuthModal onSuccess={handleAuthSuccess} />
              )}

              {/* Авторизован, проверка идёт → пустой экран (LoadingScreen покажет isLoading) */}

              {/* Авторизован, проверка завершена, нет доступа → AccessDenied */}
              {showAccessDenied && (
                <AccessDenied />
              )}

              <ActiveTradesBar
                trades={activeTrades}
                liveData={liveData}
                onSelect={handleOpenActiveTrade}
                onRemove={removeActiveTrade}
              />

              <StatsRow
                opportunities={opportunities}
                tradeAmount={filters.tradeAmount}
                isLoading={isLoading}
              />

              {isLoading
                ? <LoadingScreen />
                : <OpportunityGrid
                    opportunities={opportunities}
                    viewMode={viewMode}
                    tradeAmount={filters.tradeAmount}
                    onSelect={handleOpenModal}
                    favorites={favorites}
                    onFavorite={toggleFavorite}
                    onHide={toggleHidden}
                  />
              }

              <FilterDrawer
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                filters={filters}
                onFilters={setFilters}
                defaultFilters={DEFAULT_FILTERS}
              />
            </div>
          </>
        )}

        {selected && (
          <DetailModal
            opp={liveOpp || selected}
            tradeAmount={filters.tradeAmount}
            onClose={handleCloseModal}
            isFavorite={favorites.includes(selected.id)}
            onFavorite={() => toggleFavorite(selected.id)}
            onHide={() => { toggleHidden(selected.id); handleCloseModal() }}
            onTrade={handleTrade}
            initialAvgLong={selectedActiveTrade?.avgLong || ''}
            initialAvgShort={selectedActiveTrade?.avgShort || ''}
            isActiveTrade={!!selectedActiveTrade}
            onRemoveTrade={() => removeActiveTrade(selectedActiveTrade?.id)}
          />
        )}
      </div>
    </div>
  )
}

export default App
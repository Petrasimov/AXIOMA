import { useState, useMemo, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { mockData } from "./mockData.js";
import { EXCHANGES } from "./constants.js";
import StatsRow from "./components/StatsRow.jsx";
import OpportunityGrid from "./components/OpportunityGrid.jsx";
import FilterDrawer from "./components/FilterDrawer.jsx";
import DetailModal from "./components/DetailModal.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import ActiveTradesBar from "./components/ActiveTradesBar.jsx";
import ApiPage from "./components/ApiPage.jsx";
import { enrichOpportunities, enrichSingleOpportunity, clearCacheForOpp } from "./api.js";

const DEFAULT_FILTERS = {
  strategy: { sf: true, ff: true },
  exchanges: Object.keys(EXCHANGES),
  minSpread: 0,
  tradeAmount: 1000,
  funding: { positive: true, negative: true },
  transfer: { deposit: true, withdraw: true },
  onlyPositiveFunding: false,
}

function App() {
  const [activeTab, setActiveTab] = useState('futures')
  const [activePage, setActivePage] = useState('futures')
  const [sortMode, setSortMode] = useState('spread')
  const [viewMode, setViewMode] = useState('grid')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selected, setSelected] = useState(null)
  const [liveOpp, setLiveOpp] = useState(null)
  const [selectedActiveTrade, setSelectedActiveTrade] = useState(null)
  const [liveData, setLiveData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const intervalRef = useRef(null)
  const liveOppIntervalRef = useRef(null)
  const liveOppRef = useRef(null)

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

  const opportunities = useMemo(() => {
    let result = [...(liveData || mockData)]

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
      const depOk = !!(o.bid_transfer?.deposit && o.ask_transfer?.deposit)
      const wdOk  = !!(o.bid_transfer?.withdraw && o.ask_transfer?.withdraw)
      return depOk === filters.transfer.deposit && wdOk === filters.transfer.withdraw
    })

    if (filters.onlyPositiveFunding) {
      result = result.filter(o => {
        const bidRate = o.bid_funding?.rate ?? 0
        const askRate = o.ask_funding?.rate ?? 0
        const fs = o.strategy === 'sf' ? askRate : askRate - bidRate
        return fs > 0
      })
    }

    result.sort((a, b) => {
      if (sortMode === 'spread') return b.spread - a.spread
      if (sortMode === 'age') return new Date(b.first_seen) - new Date(a.first_seen)
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
    return (liveData || mockData).filter(o => hidden.includes(o.id))
  }, [hidden, liveData])

  // Главный 60-секундный поллинг — пауза при открытой модалке или не-futures странице
  useEffect(() => {
    if (selected !== null || activePage !== 'futures') {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }

    async function refresh() {
      const enriched = await enrichOpportunities(mockData)
      setLiveData(enriched)
      setIsLoading(false)
    }

    refresh()
    intervalRef.current = setInterval(refresh, 60000)
    return () => clearInterval(intervalRef.current)
  }, [selected, activePage])

  // 10-секундный поллинг liveOpp пока модалка открыта
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

  const handleOpenModal = (opp) => {
    setSelected(opp)
    setSelectedActiveTrade(null)
  }

  const handleOpenActiveTrade = (trade) => {
    setSelected(trade.opp)
    setSelectedActiveTrade(trade)
  }

  const handleCloseModal = () => {
    setSelected(null)
    setSelectedActiveTrade(null)
    setLiveOpp(null)
  }

  const handleTrade = (opp, avgLong, avgShort) => {
    const trade = {
      id: `${opp.id}_${Date.now()}`,
      opp,
      avgLong,
      avgShort,
      openedAt: new Date().toISOString(),
    }
    addActiveTrade(trade)
    setSelectedActiveTrade(trade)
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activePage={activePage}
        onPageChange={setActivePage}
      />

      <div className="main-area" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {activePage === 'api' ? (
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

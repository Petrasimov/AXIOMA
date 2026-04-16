import { useState, useMemo, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { mockData } from "./mockData.js";
import { EXCHANGES } from "./constants.js";
import StatsRow from "./components/StatsRow.jsx";
import OpportunityGrid from "./components/OpportunityGrid.jsx";
import FilterDrawer from "./components/FilterDrawer.jsx";
import DetailModal from "./components/DetailModal.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import { enrichOpportunities } from "./api.js";

const DEFAULT_FILTERS = {
  strategy: { sf: true, ff: true},
  exchanges: Object.keys(EXCHANGES),
  minSpread: 0,
  tradeAmount: 1000,
  funding: { positive: true, negative: true},
  transfer: { deposit: false, withdraw: false},
  onlyPositiveFunding: false,
}

function App() {
  const [activeTab, setActiveTab] = useState('futures')
  const [sortMode, setSortMode] = useState('spread')
  const [viewMode, setViewMode] = useState('grid')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selected, setSelected] = useState(null)
  const [liveData, setLiveData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favorites')) || []}
    catch { return [] }
  })

  const [hidden, setHidden] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hidden')) || []}
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

    if (filters.transfer.deposit) {
      result = result.filter(o =>
        o.bid_transfer.deposit && o.ask_transfer.deposit
      )
    }

    if (filters.transfer.withdraw) {
      result = result.filter(o => 
        o.bid_transfer.withdraw && o.ask_transfer.withdraw
      )
    }

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

  useEffect(() => {
    async function refresh() {
      const enriched = await enrichOpportunities(mockData)
      setLiveData(enriched)
      setIsLoading(false)
    }

    refresh()
    const interval = setInterval(refresh, 60000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="app-layout">
      <Sidebar 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      />

      <div className="main-area" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}>
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
              onSelect={setSelected}
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

        {selected && (
          <DetailModal
          opp={selected}
          tradeAmount={filters.tradeAmount}
          onClose={() => setSelected(null)}
          />
        )}

      </div>
    </div>
  )
}

export default App
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
import FundingPage from "./components/FundingPage.jsx"; 
import { enrichOpportunities, enrichSingleOpportunity, clearCacheForOpp, setAdminLogging, aLog } from "./api.js";
import { calcVwap } from "./utils.js";
import HomePage from "./components/HomePage.jsx";
import TrainingPage from "./components/TrainingPage.jsx";
import { loadSession, checkAccess, saveSession, clearSession, saveUserSettings, toggleNotifications } from "./auth.js";
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

// ─── Кэш liveData ────────────────────────────────────────────────────────────
// Карточки сохраняются в localStorage между сессиями.
// TTL = 3 минуты: если пользователь вернулся быстрее — видит кэш сразу,
// цикл обновляет данные в фоне. Если позже — показывается LoadingScreen.
const LIVE_DATA_CACHE_KEY = 'axioma_live_data_cache'
const LIVE_DATA_TTL       = 3 * 60 * 1000 // 3 минуты в мс

function readLiveDataCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(LIVE_DATA_CACHE_KEY))
    if (!raw || !Array.isArray(raw.data) || raw.data.length === 0) return null
    const age = Date.now() - raw.ts
    if (age > LIVE_DATA_TTL) {
      // Кэш устарел — удаляем и показываем LoadingScreen
      localStorage.removeItem(LIVE_DATA_CACHE_KEY)
      aLog('log', `[CACHE] кэш устарел (возраст ${(age / 60000).toFixed(1)}мин > 3мин) — удалён`)
      return null
    }
    aLog('log', `[CACHE] кэш найден: ${raw.data.length} монет | возраст ${(age / 60000).toFixed(1)}мин`)
    return raw.data
  } catch {
    return null
  }
}

function writeLiveDataCache(enriched) {
  try {
    // Облегчённая версия — стаканы обрезаем до топ-20 уровней (~200KB вместо ~5MB).
    // Для отображения карточек полные стаканы не нужны.
    // При пересчёте VWAP с новым tradeAmount точность чуть снизится —
    // но данные обновятся за следующий цикл (~55с).
    const cacheData = enriched.map(opp => ({
      ...opp,
      raw_bid: opp.raw_bid?.slice(0, 20) ?? null,
      raw_ask: opp.raw_ask?.slice(0, 20) ?? null,
      variants: opp.variants?.map(v => ({
        ...v,
        raw_bid: undefined,
        raw_ask: undefined,
      })) ?? [],
    }))
    localStorage.setItem(LIVE_DATA_CACHE_KEY, JSON.stringify({
      ts:   Date.now(),
      data: cacheData,
    }))
    aLog('log', `[CACHE] кэш записан: ${enriched.length} монет | TTL 3мин`)
  } catch (e) {
    aLog('warn', `[CACHE] ошибка записи кэша: ${e.message}`)
  }
}
// ─────────────────────────────────────────────────────────────────────────────

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
  // showAllTransfer — локальная настройка, не сохраняется в БД.
  // При true: фильтр transfer отключается, показываются все монеты независимо от переводов.
  const [showAllTransfer, setShowAllTransfer] = useState(false)
  const [selected, setSelected] = useState(null)
  const [liveOpp, setLiveOpp] = useState(null)
  const [selectedActiveTrade, setSelectedActiveTrade] = useState(null)
  // liveData инициализируется из кэша если он свежий (< 3 мин).
  // При устаревшем или отсутствующем кэше — null → показывается LoadingScreen.
  const [liveData, setLiveData] = useState(() => readLiveDataCache())
  // isLoading=false если кэш есть (карточки показываем сразу, цикл работает в фоне)
  // isLoading=true  если кэша нет (показываем LoadingScreen до первого цикла)
  // Читаем кэш второй раз в том же render — localStorage синхронный, это безопасно
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LIVE_DATA_CACHE_KEY))
      return !(raw && Array.isArray(raw.data) && raw.data.length > 0 && (Date.now() - raw.ts) <= LIVE_DATA_TTL)
    } catch { return true }
  })

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

  // activeCoins — зеркало activeTrades в БД (до 5 монет, синхронизируется через saveUserSettings)
  // Инициализируется из userSettings при checkAccess (ШАГ 2)
  const [activeCoins, setActiveCoins] = useState([])

  // activeNotifications — включены ли Telegram уведомления о новых возможностях
  // Инициализируется из userSettings при checkAccess, меняется кнопкой в FilterDrawer
  const [activeNotifications, setActiveNotifications] = useState(false)

  // ── Auth ───────────────────────────────────────────────────────────────────
  // Три возможных статуса:
  //   'unknown'  — не авторизован, показываем TelegramAuthModal
  //   'checking' — авторизован, идёт первичная проверка доступа
  //   'ready'    — проверка завершена, user содержит актуальный статус

  const [auth, setAuth] = useState(() => {
    const session = loadSession()
    if (session) {
      // Лог старта приложения — сессия найдена, запускаем проверку доступа
      aLog('info', `[APP] Старт: сессия найдена → status='checking' | userId=${session.userId} login=${session.login}`)
      return { status: 'checking', user: session }
    }
    // Лог старта приложения — сессии нет, показываем TelegramAuthModal
    aLog('info', `[APP] Старт: сессия отсутствует → status='unknown', показываем TelegramAuthModal`)
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
        setAdminLogging(user.isAdmin === true)
        setAuth({ status: 'ready', user })
        return
      }

      if (access.expired) {
        // Cookie истекла → требуем повторную авторизацию через Telegram
        clearSession()
        setAuth({ status: 'unknown', user: null })
        return
      }

      // Обновляем сессию актуальными данными и переходим в ready
      // Сохраняем tgData из старой сессии — нужны для следующих checkAccess
      const updatedUser = { ...auth.user, ...access }
      // ════════════════════════════════════════════════════
      // ШАГ 2 — Применение userSettings к фильтрам
      if (access.userSettings) {
          const t2 = performance.now()
          console.group('%c[ШАГ 2] Применение userSettings к фильтрам', 'color:#f0a500;font-weight:bold')
          console.log('[ШАГ 2] userSettings из backend:', access.userSettings)
          setFilters(current => {
              const next = {
                  ...current,
                  tradeAmount: access.userSettings.tradeAmount ?? current.tradeAmount,
                  minSpread:   access.userSettings.minSpread   ?? current.minSpread,
                  exchanges:   access.userSettings.exchanges   ?? current.exchanges,
                  strategy:    access.userSettings.strategy    ?? current.strategy,
                  funding:     access.userSettings.funding     ?? current.funding,
                  transfer:    access.userSettings.transfer    ?? current.transfer,
              }
              console.log(`[ШАГ 2] ✅ tradeAmount=${next.tradeAmount} | minSpread=${next.minSpread} | exchanges=[${next.exchanges.join(',')}]`)
              console.log(`[ШАГ 2] ✅ strategy=ff:${next.strategy?.ff},sf:${next.strategy?.sf} | funding=pos:${next.funding?.positive},neg:${next.funding?.negative}`)
              console.log(`[ШАГ 2] ⏱ Время: ${(performance.now() - t2).toFixed(0)}мс`)
              console.groupEnd()
              return next
          })

          // ── activeCoins → восстанавливаем activeTrades из БД ──────────────────
          // Если в БД есть activeCoins — загружаем в state.
          // Если localStorage пустой (перезагрузка) — восстанавливаем activeTrades из activeCoins.
          if (access.userSettings.activeCoins?.length > 0) {
              const coins = access.userSettings.activeCoins
              setActiveCoins(coins)
              aLog('log', `[ШАГ 2] activeCoins из БД: ${coins.length} монет → [${coins.map(c => c.symbol).join(',')}]`)

              setActiveTrades(prev => {
                  if (prev.length > 0) return prev // localStorage уже есть — не трогаем

                  // Восстанавливаем synthetic trades из activeCoins
                  const restored = coins.map((coin, i) => ({
                      id:       `restored_${coin.symbol}_${i}`,
                      opp: {
                          symbol:     coin.symbol,
                          bid_ex:     coin.bid_exchange,
                          ask_ex:     coin.ask_exchange,
                          strategy:   coin.strategy,
                          bid_market: 'futures',
                          ask_market: coin.strategy === 'sf' ? 'spot' : 'futures',
                          spread:     null,
                          bid_price:  coin.priceShort,
                          ask_price:  coin.priceLong,
                      },
                      avgShort:  coin.priceShort != null ? String(coin.priceShort) : '',
                      avgLong:   coin.priceLong  != null ? String(coin.priceLong)  : '',
                      openedAt:  null,
                      _restored: true, // флаг: восстановлено из БД, не из localStorage
                  }))

                  localStorage.setItem('activeTrades', JSON.stringify(restored))
                  aLog('log', `[ШАГ 2] activeTrades восстановлено из activeCoins: ${restored.length} позиций`)
                  return restored
              })
          } else {
              setActiveCoins([])
          }
          // ─────────────────────────────────────────────────────────────────────

          // ── activeNotifications → инициализируем из userSettings ──────────────
          setActiveNotifications(access.userSettings.activeNotifications ?? false)
          aLog('log', `[ШАГ 2] activeNotifications=${access.userSettings.activeNotifications ?? false}`)
          // ─────────────────────────────────────────────────────────────────────

      } else {
          console.log('%c[ШАГ 2] userSettings отсутствуют — оставляем текущие фильтры', 'color:#f0a500')
      }
      // ════════════════════════════════════════════════════
      saveSession(updatedUser)
      sigRef.current = getSignature(updatedUser)
      setAdminLogging(updatedUser.isAdmin === true)
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

    let checkCount = 0

    async function checkStatus() {
      checkCount++
      // Лог старта фоновой проверки — номер проверки
      aLog('log', `[APP] Фоновая проверка доступа #${checkCount} | userId=${userId}`)
      const tBg = performance.now()
      const access = await checkAccess(userId)
      if (!access) {
        // Лог пропуска цикла из-за ошибки сети
        aLog('warn', `[APP] Фоновая проверка #${checkCount} → ошибка сети, пропускаем | ⏱ ${(performance.now() - tBg).toFixed(0)}мс`)
        return
      }

      if (access.expired) {
        aLog('warn', `[APP] Фоновая проверка #${checkCount} → cookie истекла, разлогиниваем`)
        clearSession()
        clearInterval(accessIntervalRef.current)
        accessIntervalRef.current = null
        setAuth({ status: 'unknown', user: null })
        return
      }

      const newSig = getSignature(access)
      if (newSig === sigRef.current) {
        // Лог — статус не изменился
        aLog('log', `[APP] Фоновая проверка #${checkCount} → статус не изменился (${newSig}) | ⏱ ${(performance.now() - tBg).toFixed(0)}мс`)
        return
      }

      // Лог изменения статуса пользователя — старая и новая подпись
      aLog('warn', `[APP] Фоновая проверка #${checkCount} → статус ИЗМЕНИЛСЯ! ${sigRef.current} → ${newSig} | перезагружаем страницу`)

      // Статус изменился → сохраняем и перезагружаем
      const updatedUser = { ...auth.user, ...access }
      saveSession(updatedUser)
      setAdminLogging(updatedUser.isAdmin === true)
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
    // Очищаем кэш карточек — при следующем входе другой пользователь
    // не увидит данные предыдущей сессии
    try { localStorage.removeItem(LIVE_DATA_CACHE_KEY) } catch {}
  }

  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem('favorites', JSON.stringify(next))
      return next
    })
  }
  const toggleHidden = (id) => {
    // Определяем заранее — скрываем или восстанавливаем
    // (не внутри setState чтобы избежать вызова state-изменений внутри updater)
    const isHiding = !hidden.includes(id)

    if (isHiding) {
      // Ищем opp в liveData — если монеты нет в текущем цикле (вышла из топа),
      // берём из activeTrades чтобы корректно удалить из activeCoins
      let opp = liveData?.find(o => o.id === id)
      if (!opp) {
        const trade = activeTrades.find(t => t.opp.id === id)
        opp = trade?.opp
      }
      if (opp) {
        const bidEx = opp.bid_ex.replace(/_futures$|_spot$/, '')
        const askEx = opp.ask_ex.replace(/_futures$|_spot$/, '')
        const isActive = activeCoins.some(c =>
          c.symbol       === opp.symbol  &&
          c.bid_exchange === bidEx       &&
          c.ask_exchange === askEx       &&
          c.strategy     === opp.strategy
        )
        if (isActive) {
          aLog('warn', `[APP] toggleHidden → ${opp.symbol} в activeCoins, удаляем`)
          removeActiveCoin(opp.symbol, bidEx, askEx, opp.strategy)
          const trade = activeTrades.find(t => t.opp.id === id)
          if (trade) removeActiveTrade(trade.id)
        }
      }
    }

    // Обновляем hidden отдельно — чистый state updater без побочных эффектов
    setHidden(prev => {
      const next = isHiding ? [...prev, id] : prev.filter(x => x !== id)
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
      const trade = prev.find(t => t.id === id)
      if (trade) {
        // Синхронизируем удаление с БД через activeCoins
        const bidEx = trade.opp.bid_ex.replace(/_futures$|_spot$/, '')
        const askEx = trade.opp.ask_ex.replace(/_futures$|_spot$/, '')
        removeActiveCoin(trade.opp.symbol, bidEx, askEx, trade.opp.strategy)
      }
      const next = prev.filter(t => t.id !== id)
      localStorage.setItem('activeTrades', JSON.stringify(next))
      return next
    })
    if (selectedActiveTrade?.id === id) {
      setSelected(null)
      setSelectedActiveTrade(null)
    }
  }
  // addActiveCoin: добавляет монету в state + sessionStorage + БД
  const addActiveCoin = async (coin) => {
    if (activeCoins.length >= 5) {
      aLog('warn', `[APP] addActiveCoin → лимит 5 монет достигнут, ${coin.symbol} не добавлена`)
      return
    }
    // Проверка дубля по symbol + bid_exchange + ask_exchange + strategy
    const isDuplicate = activeCoins.some(c =>
      c.symbol       === coin.symbol       &&
      c.bid_exchange === coin.bid_exchange &&
      c.ask_exchange === coin.ask_exchange &&
      c.strategy     === coin.strategy
    )
    if (isDuplicate) {
      aLog('warn', `[APP] addActiveCoin → дубль: ${coin.symbol} уже в activeCoins, пропускаем`)
      return
    }
    const next = [...activeCoins, coin]
    setActiveCoins(next)
    // Обновляем sessionStorage
    const session = loadSession()
    if (session) {
      saveSession({ ...session, userSettings: { ...session.userSettings, activeCoins: next } })
    }
    aLog('log', `[APP] addActiveCoin → ${coin.symbol} | всего: ${next.length}`)
    await saveUserSettings(auth.user.userId, { ...filters, activeCoins: next })
  }

  // removeActiveCoin: удаляет монету из state + sessionStorage + БД
  const removeActiveCoin = async (symbol, bid_exchange, ask_exchange, strategy) => {
    const next = activeCoins.filter(c => !(
      c.symbol       === symbol       &&
      c.bid_exchange === bid_exchange &&
      c.ask_exchange === ask_exchange &&
      c.strategy     === strategy
    ))
    setActiveCoins(next)
    // Обновляем sessionStorage
    const session = loadSession()
    if (session) {
      saveSession({ ...session, userSettings: { ...session.userSettings, activeCoins: next } })
    }
    aLog('log', `[APP] removeActiveCoin → ${symbol} | осталось: ${next.length}`)
    await saveUserSettings(auth.user.userId, { ...filters, activeCoins: next })
  }

  // ── Фильтрация ─────────────────────────────────────────────────────────────

  const opportunities = useMemo(() => {
    const tMemo = performance.now()
    // Лог старта цикла фильтрации — сколько записей на входе
    aLog('group', `[ШАГ 7] Фильтрация UI | входящих от enricher: ${(liveData || []).length}`)

    let result = (liveData || []).map(opp => {
      if (!opp.raw_bid || !opp.raw_ask) return opp
      const bid_price = calcVwap(opp.raw_bid, filters.tradeAmount)
      const ask_price = calcVwap(opp.raw_ask, filters.tradeAmount)
      if (!bid_price || !ask_price) return opp
      const spread = (bid_price - ask_price) / bid_price * 100
      return { ...opp, bid_price, ask_price, spread }
    })

    const beforeStrategy = result.length
    if (!filters.strategy.sf) result = result.filter(o => o.strategy !== 'sf')
    if (!filters.strategy.ff) result = result.filter(o => o.strategy !== 'ff')
    // Лог фильтра стратегии — до/после, параметры
    aLog('log', `[ШАГ 7] Фильтр strategy (ff:${filters.strategy.ff} sf:${filters.strategy.sf}): ${beforeStrategy} → ${result.length} (отсеяно: ${beforeStrategy - result.length})`)

    const beforeFunding = result.length
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
    // Лог фильтра funding — до/после, параметры
    aLog('log', `[ШАГ 7] Фильтр funding (pos:${filters.funding.positive} neg:${filters.funding.negative}): ${beforeFunding} → ${result.length} (отсеяно: ${beforeFunding - result.length})`)

    const beforeExchanges = result.length
    if (filters.exchanges.length > 0) {
      result = result.filter(o =>
        filters.exchanges.includes(o.bid_ex) &&
        filters.exchanges.includes(o.ask_ex)
      )
    }
    // Лог фильтра бирж — до/после, список активных бирж
    aLog('log', `[ШАГ 7] Фильтр exchanges [${filters.exchanges.join(',')}]: ${beforeExchanges} → ${result.length} (отсеяно: ${beforeExchanges - result.length})`)

    const beforeSpread = result.length
    if (filters.minSpread > 0) {
      result = result.filter(o => o.spread >= filters.minSpread)
    }
    // Лог фильтра минимального спреда — до/после, порог
    aLog('log', `[ШАГ 7] Фильтр minSpread ≥${filters.minSpread}%: ${beforeSpread} → ${result.length} (отсеяно: ${beforeSpread - result.length})`)

    // Перед применением transfer/exchange фильтров —
    // если главная карточка не проходит, пробуем промоутить подходящий вариант
    const beforeTransfer = result.length
    let promotedCount = 0
    result = result.map(opp => {
      // Проверяем проходит ли главная карточка все фильтры
      const passesExchange = filters.exchanges.length === 0 ||
        (filters.exchanges.includes(opp.bid_ex) && filters.exchanges.includes(opp.ask_ex))

      // showAllTransfer=true — фильтр переводов полностью отключён,
      // показываем все монеты независимо от статуса депозита/вывода
      const passesTransfer = showAllTransfer || (() => {
        const bidDep0 = opp.bid_transfer?.deposit
        const askDep0 = opp.ask_transfer?.deposit
        const bidWd0  = opp.bid_transfer?.withdraw
        const askWd0  = opp.ask_transfer?.withdraw
        const depOk0  = (bidDep0 === null || askDep0 === null) ? true : !!(bidDep0 && askDep0)
        const wdOk0   = (bidWd0  === null || askWd0  === null) ? true : !!(bidWd0  && askWd0)
        return (!filters.transfer.deposit  || depOk0) &&
               (!filters.transfer.withdraw || wdOk0)
      })()

      if (passesExchange && passesTransfer) return opp // главная проходит — ничего не делаем

      // Главная не проходит — ищем лучший вариант который проходит
      const allVariants = opp.variants || []
      const passingVariant = allVariants.find(v => {
        const exOk = filters.exchanges.length === 0 ||
          (filters.exchanges.includes(v.bid_ex) && filters.exchanges.includes(v.ask_ex))
        if (!exOk) return false

        // Сырой вариант (_raw) не имеет данных трансфера — пропускаем его через фильтр,
        // данные загрузятся лениво при клике пользователя через enrichSingleOpportunity
        if (v._raw) return true

        const bDep = v.bid_transfer?.deposit
        const aDep = v.ask_transfer?.deposit
        const bWd  = v.bid_transfer?.withdraw
        const aWd  = v.ask_transfer?.withdraw
        const dOk  = (bDep === null || aDep === null) ? true : !!(bDep && aDep)
        const wOk  = (bWd  === null || aWd  === null) ? true : !!(bWd  && aWd)
        return (!filters.transfer.deposit || dOk) && (!filters.transfer.withdraw || wOk)
      })

      if (!passingVariant) return null // ни один вариант не подходит → удалить

      // Промоутируем найденный вариант в главную позицию
      promotedCount++
      // Лог промоута варианта — символ и новые биржи
      aLog('log', `[ШАГ 7] Промоут варианта: ${opp.symbol} | ${opp.bid_ex}→${opp.ask_ex} заменён на ${passingVariant.bid_ex}→${passingVariant.ask_ex}`)
      const remainingVariants = allVariants.filter(v => v.id !== passingVariant.id)
      return {
        ...passingVariant,
        id: opp.id,
        variants: [opp, ...remainingVariants].filter(v => {
          const exOk = filters.exchanges.length === 0 ||
            (filters.exchanges.includes(v.bid_ex) && filters.exchanges.includes(v.ask_ex))
          return exOk
        })
      }
    }).filter(Boolean)

    result = result.filter(o => {
      const bidDep = o.bid_transfer?.deposit
      const askDep = o.ask_transfer?.deposit
      const bidWd  = o.bid_transfer?.withdraw
      const askWd  = o.ask_transfer?.withdraw
      const depOk = (bidDep === null || askDep === null) ? true : !!(bidDep && askDep)
      const wdOk  = (bidWd  === null || askWd  === null) ? true : !!(bidWd  && askWd)
      if (filters.transfer.deposit && !depOk) return false
      if (filters.transfer.withdraw && !wdOk) return false
      return true
    })
    // Лог фильтра transfer — до/после, промоутировано вариантов
    aLog('log', `[ШАГ 7] Фильтр transfer (dep:${filters.transfer.deposit} wd:${filters.transfer.withdraw}): ${beforeTransfer} → ${result.length} (промоутировано вариантов: ${promotedCount})`)

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

    // Лог итогов сортировки — режим и первые 5 символов в порядке отображения
    const top5 = result.slice(0, 5).map(o => `${o.symbol}(${o.spread.toFixed(2)}%)`).join(', ')
    aLog('log', `[ШАГ 7] Сортировка: режим=${sortMode} | скрытых=${hidden.length} | итого: ${result.length} карточек`)
    aLog('log', `[ШАГ 7] Топ-5 в порядке отображения: ${top5 || '—'}`)
    aLog('log', `[ШАГ 7] ⏱ Фильтрация UI: ${(performance.now() - tMemo).toFixed(0)}мс`)
    aLog('groupEnd')

    return result
  }, [filters, sortMode, liveData, hidden, favorites, showAllTransfer])

  const hiddenOpportunities = useMemo(() => {
    return (liveData || []).filter(o => hidden.includes(o.id))
  }, [hidden, liveData])

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
    selected === null
  )

  // Лог причины canScan — видно почему сканирование запущено или заблокировано
  aLog('log',
    `[APP] canScan=${canScan} | ` +
    `status=${auth.status} | ` +
    `isCexCexPaid=${auth.user?.isCexCexPaid} | ` +
    `page=${activePage} | ` +
    `modal=${selected !== null ? 'open' : 'closed'}`
  )

  useEffect(() => {
    if (!canScan) {
        clearTimeout(scanIntervalRef.current)
        scanIntervalRef.current = null
        return
    }

    let cancelled = false

    async function refresh() {
        const cycleStart = performance.now()
        console.group('%c[ЦИКЛ] ═══════ Новый цикл сканирования ═══════', 'color:#3d87c0;font-weight:bold;font-size:13px')

        try {
            // ════════════════════════════════════════════════════
            // ШАГ 3 — Запрос к бэкенду
            const t3 = performance.now()
            console.group('%c[ШАГ 3] Запрос к бэкенду', 'color:#3d87c0;font-weight:bold')
            console.log('[ШАГ 3] GET /backend/api/analysis/order-books-json')
            // ════════════════════════════════════════════════════

            const res = await fetch('/backend/api/analysis/order-books-json', {
                credentials: 'include',
                cache: 'no-store',
            })

            // 401 — cookie истекла, разлогиниваем прямо здесь
            if (res.status === 401) {
                console.warn('[ЦИКЛ] ❌ 401 — сессия истекла, требуется повторная авторизация')
                console.groupEnd()
                clearSession()
                clearTimeout(scanIntervalRef.current)
                scanIntervalRef.current = null
                setAuth({ status: 'unknown', user: null })
                return
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            const rawOpps = data.opportunities || []

            // ════════════════════════════════════════════════════
            console.log(`[ШАГ 3] ✅ Получено: ${rawOpps.length} записей | ⏱ ${(performance.now() - t3).toFixed(0)}мс`)
            console.groupEnd()
            // ════════════════════════════════════════════════════

            const enriched = await enrichOpportunities(rawOpps, filters.tradeAmount)

            if (!cancelled) {
                setLiveData(enriched)
                setIsLoading(false)

                // Обновляем кэш после каждого цикла — TTL сбрасывается
                writeLiveDataCache(enriched)

                // ════════════════════════════════════════════════════
                // ШАГ 6 — Показ карточек
                console.group('%c[ШАГ 6] Карточки показаны пользователю', 'color:#00c97a;font-weight:bold')
                console.log(`[ШАГ 6] ✅ Получено от enricher: ${enriched.length} (до фильтров UI)`)
                console.log(`[ШАГ 6] Монеты: ${enriched.map(o => o.symbol).join(', ')}`)
                console.log(`[ШАГ 6] ⏱ Полный цикл: ${((performance.now() - cycleStart)/1000).toFixed(2)}с`)
                console.log(`[ШАГ 6] Следующий цикл через 55с`)
                console.groupEnd()
                console.groupEnd() // ЦИКЛ
                // ════════════════════════════════════════════════════

                scanIntervalRef.current = setTimeout(refresh, 55000)
            }
        } catch (err) {
            console.error('[ЦИКЛ] ❌ Ошибка:', err.message)
            console.groupEnd()
            if (!cancelled) {
                setIsLoading(false)
                scanIntervalRef.current = setTimeout(refresh, 5000)
            }
        }
    }

    refresh()

    return () => {
        cancelled = true
        clearTimeout(scanIntervalRef.current)
        scanIntervalRef.current = null
    }
  }, [canScan])

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

  const handleOpenModal = (opp) => {
    // Проверяем activeTrades — монета уже в позиции?
    const existingTrade = activeTrades.find(t => t.opp.id === opp.id)
    if (existingTrade) {
      setSelected(opp)
      setSelectedActiveTrade(existingTrade)
      return
    }

    // Проверяем activeCoins — есть в БД но нет в activeTrades?
    // Такое возможно в edge-case когда state рассинхронизировался.
    const bidEx = opp.bid_ex.replace(/_futures$|_spot$/, '')
    const askEx = opp.ask_ex.replace(/_futures$|_spot$/, '')
    const activeCoin = activeCoins.find(c =>
      c.symbol       === opp.symbol    &&
      c.bid_exchange === bidEx         &&
      c.ask_exchange === askEx         &&
      c.strategy     === opp.strategy
    )

    setSelected(opp)
    setSelectedActiveTrade(activeCoin ? {
      // Synthetic trade из activeCoins для передачи цен в DetailModal
      id:       `${opp.id}_restored`,
      opp,
      avgLong:  activeCoin.priceLong  != null ? String(activeCoin.priceLong)  : '',
      avgShort: activeCoin.priceShort != null ? String(activeCoin.priceShort) : '',
      openedAt: null,
    } : null)
  }
  const handleOpenActiveTrade = (trade) => { setSelected(trade.opp); setSelectedActiveTrade(trade) }
  const handleCloseModal      = ()      => { setSelected(null); setSelectedActiveTrade(null); setLiveOpp(null) }
  const handleSaveSettings = async () => {
    if (!auth.user?.userId) return

    // Лог старта сохранения настроек — userId и текущие фильтры
    aLog('group', `[APP] handleSaveSettings → userId=${auth.user.userId}`)
    aLog('log', `[APP] Текущие фильтры: exchanges=[${filters.exchanges.join(',')}] minSpread=${filters.minSpread} tradeAmount=${filters.tradeAmount}`)
    aLog('log', `[APP] strategy=ff:${filters.strategy.ff},sf:${filters.strategy.sf} | funding=pos:${filters.funding.positive},neg:${filters.funding.negative}`)

    setSaveStatus('saving')

    const result = await saveUserSettings(auth.user.userId, filters)

    if (result.ok) {
        // Лог успешного сохранения
        aLog('success', `[APP] handleSaveSettings ✅ настройки сохранены, обновляем auth.user`)
        // Обновляем auth.user в state — без перезагрузки
        setAuth(prev => ({ ...prev, user: result.user }))
        setSaveStatus('saved')
        // Через 2.5с сбрасываем статус обратно в null
        setTimeout(() => setSaveStatus(null), 2500)
    } else if (result.reason === 'unauthorized') {
        // Лог разлогина при сохранении
        aLog('warn', `[APP] handleSaveSettings → 401, cookie истекла — разлогиниваем`)
        // Cookie истекла — разлогиниваем
        clearSession()
        clearInterval(accessIntervalRef.current)
        accessIntervalRef.current = null
        setAuth({ status: 'unknown', user: null })
        setSaveStatus(null)
    } else {
        // Лог ошибки сохранения
        aLog('error', `[APP] handleSaveSettings ❌ ошибка: reason=${result.reason}`)
        // Ошибка сервера или сети
        setSaveStatus('error')
        setTimeout(() => setSaveStatus(null), 3000)
    }
    aLog('groupEnd')
  }

  // Включение/отключение Telegram уведомлений
  // Оптимистично обновляет UI сразу, откатывает если бэкенд вернул ошибку
  const handleToggleNotifications = async () => {
    const next = !activeNotifications
    setActiveNotifications(next) // оптимистичное обновление
    aLog('log', `[APP] handleToggleNotifications → active=${next}`)

    const result = await toggleNotifications(next)

    if (!result.ok) {
        setActiveNotifications(!next) // откат
        if (result.reason === 'unauthorized') {
            aLog('warn', `[APP] handleToggleNotifications → 401, разлогиниваем`)
            clearSession()
            clearInterval(accessIntervalRef.current)
            accessIntervalRef.current = null
            setAuth({ status: 'unknown', user: null })
        } else {
            aLog('error', `[APP] handleToggleNotifications ❌ ошибка: ${result.reason}`)
        }
    } else {
        aLog('success', `[APP] handleToggleNotifications ✅ activeNotifications=${next}`)
    }
  }

  // tradeError — уведомление при превышении лимита активных позиций (исчезает через 4с)
  const [tradeError, setTradeError] = useState(null)

  const handleTrade = (opp, avgLong, avgShort) => {
    // Проверка лимита — максимум 5 активных монет
    if (activeCoins.length >= 5) {
      setTradeError('Достигнут лимит активных позиций (5 монет). Закройте одну из текущих позиций.')
      setTimeout(() => setTradeError(null), 4000)
      // Не добавляем — кнопка "ТОРГОВАТЬ" не меняется на "ВЫХОД"
      return
    }
    const trade = { id: `${opp.id}_${Date.now()}`, opp, avgLong, avgShort, openedAt: new Date().toISOString() }
    addActiveTrade(trade)
    setSelectedActiveTrade(trade)

    // Синхронизируем с БД через activeCoins
    // Убираем суффикс _futures/_spot из bid_ex/ask_ex для хранения
    const bidEx = opp.bid_ex.replace(/_futures$|_spot$/, '')
    const askEx = opp.ask_ex.replace(/_futures$|_spot$/, '')
    addActiveCoin({
      symbol:       opp.symbol,
      bid_exchange: bidEx,
      ask_exchange: askEx,
      strategy:     opp.strategy,
      priceShort:   parseFloat(avgShort) || null,
      priceLong:    parseFloat(avgLong)  || null,
    })
  }

  // ── Funding-позиции (ИЗОЛИРОВАНЫ от futures activeCoins/activeTrades) ────────
  // Ключ localStorage 'fundingActiveTrades' — не пересекается с 'activeTrades'.
  // Нет синхронизации с БД (funding не требует серверного хранения, только localStorage).
  // Лимит: 5 позиций. Дедупликация по strategy:symbol:exchange_bid:exchange_ask.
  const [fundingActiveTrades, setFundingActiveTrades] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('fundingActiveTrades'))
      return Array.isArray(stored) ? stored : []
    } catch { return [] }
  })

  const [fundingTradeError, setFundingTradeError] = useState(null)

  const handleFundingTrade = (opp, avgBid, avgAsk, selectedSpotEx) => {
    if (fundingActiveTrades.length >= 5) {
      setFundingTradeError('Достигнут лимит позиций (5). Закройте одну из текущих.')
      setTimeout(() => setFundingTradeError(null), 4000)
      return
    }

    // Стабильный ключ дедупликации — не зависит от volatile DB id
    const key = `${opp.strategy}:${opp.symbol}:${opp.exchange_bid}:${selectedSpotEx || opp.exchange_ask || ''}`
    const isDupe = fundingActiveTrades.some(t => t.key === key)
    if (isDupe) {
      setFundingTradeError('Эта возможность уже добавлена в активные позиции.')
      setTimeout(() => setFundingTradeError(null), 3000)
      return
    }

    const trade = {
      id:             `${key}_${Date.now()}`,
      key,
      opp,
      selectedSpotEx: selectedSpotEx || null,
      avgBid,
      avgAsk,
      openedAt: new Date().toISOString(),
    }

    const next = [...fundingActiveTrades, trade]
    setFundingActiveTrades(next)
    localStorage.setItem('fundingActiveTrades', JSON.stringify(next))
  }

  const removeFundingTrade = (id) => {
    const next = fundingActiveTrades.filter(t => t.id !== id)
    setFundingActiveTrades(next)
    localStorage.setItem('fundingActiveTrades', JSON.stringify(next))
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
        ) : activePage === 'training' ? (
          <TrainingPage />
        ) : activePage === 'api' ? (
          <ApiPage />
        ) : activePage === 'funding' ? (
          <>
            <FundingPage
              tradeAmount={filters.tradeAmount}
              exchanges={filters.exchanges}
              minSpread={filters.minSpread}
              onOpenFilters={() => setFilterOpen(true)}
              isAdmin={auth.status === 'ready' && auth.user?.isAdmin === true}
              fundingActiveTrades={fundingActiveTrades}
              onFundingTrade={handleFundingTrade}
              onRemoveFundingTrade={removeFundingTrade}
              fundingTradeError={fundingTradeError}
            />
            <FilterDrawer
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                filters={filters}
                onFilters={setFilters}
                defaultFilters={DEFAULT_FILTERS}
                onSaveSettings={handleSaveSettings}
                canSave={auth.status === 'ready' && !!auth.user}
                saveStatus={saveStatus}
                mode="funding"
                activeNotifications={activeNotifications}
                onToggleNotifications={handleToggleNotifications}
            />
          </>
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
                isLoading={isLoading}
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
                  onSaveSettings={handleSaveSettings}
                  canSave={auth.status === 'ready' && !!auth.user}
                  saveStatus={saveStatus}
                  showAllTransfer={showAllTransfer}
                  onShowAllTransfer={setShowAllTransfer}
                  activeNotifications={activeNotifications}
                  onToggleNotifications={handleToggleNotifications}
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
            onHide={() => { toggleHidden((liveOpp || selected).id); handleCloseModal() }}
            onTrade={handleTrade}
            tradeError={tradeError}
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
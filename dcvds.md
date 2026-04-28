ПЛАН РЕАЛИЗАЦИИ
Шаг 1 — Перемести FinalData.json в public/
Файл public/FinalData.json, будет доступен через fetch('/FinalData.json').

Шаг 2 — Добавить parseExchange в utils.js

export function parseExchange(str) {
    const idx = str.lastIndexOf('_')
    return { id: str.slice(0, idx), market: str.slice(idx + 1) }
}
// "gate_futures" → { id: "gate", market: "futures" }
// "mexc_spot"   → { id: "mexc", market: "spot" }
Шаг 3 — Обновить fetchGate в api.js
Уже читает контракт. Добавить multiplier в результат:


multiplier: Math.abs(parseFloat(contract.multiplier ?? 1)) || 1
Шаг 4 — Переписать enrichOpportunities в api.js
Принимает raw-записи из FinalData.json. Для каждой записи:

Парсит bid_ex/ask_ex через parseExchange
Параллельно запрашивает данные биржей через FETCHERS[bidEx.id] и FETCHERS[askEx.id]
Извлекает Gate multiplier (только если exchange === 'gate' && market === 'futures')
Вызывает calcVwap(rec.bid, tradeAmount) и делит на bidMultiplier → bid_price
Вызывает calcVwap(rec.ask, tradeAmount) и делит на askMultiplier → ask_price
Считает spread = (ask_price - bid_price) / bid_price * 100
Сохраняет raw_bid, raw_ask, bid_multiplier, ask_multiplier в объекте — для пересчёта при смене tradeAmount
Возвращает полный объект в существующем формате + поля bid_market, ask_market
Сигнатура: enrichOpportunities(rawRecords) → но теперь rawRecords из БД.

Шаг 5 — Обновить App.jsx
Убрать import { mockData }
На mount: fetch('/FinalData.json') → data.opportunities → setRawData(records)
enrichOpportunities(rawData) запускается когда rawData готов (как сейчас)
Каждые 60s: enrichOpportunities(rawData) — пересчитывает funding/volume/transfer (raw_bid/ask в liveData остаются, множители кешируются)
В useMemo opportunities: при изменении tradeAmount — пересчитывает bid_price, ask_price, spread из raw_bid/raw_ask через calcVwap (это быстро, без API)
Фильтр по биржам: opp.bid_ex теперь = "gate" (просто id), константы в EXCHANGES используют те же ключи ✅
Шаг 6 — Обновить DetailModal.jsx
WS подключение использует opp.strategy для определения рынка:


// Текущий код:
const bidMarket = opp.strategy === 'sf' ? 'spot' : 'futures'
// Заменить на:
const bidMarket = opp.bid_market || (opp.strategy === 'sf' ? 'spot' : 'futures')
const askMarket = opp.ask_market || 'futures'
Что НЕ меняется
enrichSingleOpportunity — работает с уже адаптированными записями ✅
Все фильтры, сортировка, избранное, скрытые ✅
CSS, компоненты, constants.js ✅
Существующие fetch-функции в api.js (только fetchGate получает +1 поле)
Вопрос перед началом: Какое значение по умолчанию использовать для VWAP при первом enrichOpportunities? Предлагаю использовать filters.tradeAmount (1000$ по умолчанию) — и пересчитывать в useMemo при изменении. Согласен?
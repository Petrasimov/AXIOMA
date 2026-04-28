# DetailModal.jsx — Полный разбор архитектуры

> Уровень: учитель → ученик. Читай сверху вниз — каждый раздел опирается на предыдущий.

---

## 1. Что такое DetailModal и зачем он нужен

Когда пользователь кликает на карточку арбитражной возможности в `OpportunityGrid`, открывается `DetailModal` — полноэкранная панель с детальной информацией.

Если `OpportunityCard` — это "визитка" (краткое резюме), то `DetailModal` — это "терминал трейдера":
- Видны обе биржи с ценами, фандингом, объёмами
- Живой график с историей цен (обновляется каждые 2 сек)
- Калькулятор P&L для расчёта прибыли/убытка
- Управление: избранное, скрытие, переход в терминал биржи

---

## 2. Структура файла (карта)

```
DetailModal.jsx
│
├── ИМПОРТЫ
│
├── КОНСТАНТЫ
│   ├── STRATEGY_LABEL      — словарь: ff → "FUTURES / FUTURES"
│   ├── STRATEGY_COLOR      — словарь: ff → синий, sf → оранжевый .....!!!
│   └── CHART_MODES         — массив 4 режимов графика
│
├── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
│   ├── formatCountdown()   — число секунд → "HH:MM:SS"
│   ├── calcRisk()          — объект opp → число 0-10
│   ├── smoothPath()        — массив точек → SVG-путь кривыми Безье
│   ├── generateInitialHistory() — генерация начальной истории цен
│   └── makeYGrid()         — диапазон → массив значений для сетки
│
├── ПОДКОМПОНЕНТЫ
│   ├── DmExLogo            — логотип биржи (img или буква-заглушка)
│   ├── LiveChart           — SVG-график (4 режима внутри)
│   │   ├── YAxis           — внутренний: ось Y с сеткой
│   │   ├── TimeBar         — внутренний: метки времени внизу
│   │   ├── entry-prices    — режим 1: абсолютные цены входа
│   │   ├── entry-spread    — режим 2: спред входа в %
│   │   ├── exit-prices     — режим 3: цены vs уровни открытых позиций
│   │   └── exit-spread     — режим 4: спред выхода vs 0%
│   └── ExCard              — карточка биржи (короткая/длинная сторона)
│
├── CSS (строка `style`)    — все стили компонента
│
└── DetailModal             — главный компонент
    ├── STATE               — 5 переменных состояния
    ├── EFFECTS             — 3 побочных эффекта
    ├── DERIVED VALUES      — расчёты на основе state
    └── JSX                 — разметка (header / body / left+right)
```

---

## 3. Импорты и зачем они нужны

```javascript
import { useState, useEffect, useMemo } from 'react'
```
- `useState` — хранит изменяемые данные (режим графика, введённые цены и т.д.)
- `useEffect` — запускает код "по расписанию" (таймеры, обработчики клавиш)
- `useMemo` — кэширует вычисление, чтобы не пересчитывать на каждый рендер

```javascript
import { Star, Trash2 } from 'lucide-react'
```
Иконки звёздочки и корзины. Lucide — единственная разрешённая icon-библиотека в проекте.

```javascript
import { getExchangeInfo, getSpreadColor, formatPrice, formatVolume,
         formatAge, getTransferIcon } from '../utils.js'
```
Все вспомогательные функции живут в `utils.js`. В DetailModal мы их только используем, не переопределяем:
- `getExchangeInfo(id)` — по строке 'binance' возвращает `{ name, logo, color, futuresUrl, ... }`
- `getSpreadColor(spread)` — число → цвет (#00c97a / #7ecf5a / #f0a500 / #6a8fa8)
- `formatPrice(price)` — умная форматировка числа (3600.5 → "3,600.5")
- `formatVolume(val)` — 125000000 → "$125M"
- `formatAge(isoString)` — ISO-дата → "5м" / "2ч 30м"
- `getTransferIcon(bool)` — true → { icon: '✅' }, false → { icon: '🚫' }

---

## 4. Константы на уровне модуля

```javascript
const STRATEGY_LABEL = { ff: 'FUTURES / FUTURES', sf: 'SPOT / FUTURES' }
const STRATEGY_COLOR = { ff: 'var(--accent-bright)', sf: 'var(--warning)' }
```

**Почему словарь, а не if/else?**  
Словарь (объект-справочник) чище: `STRATEGY_LABEL[opp.strategy]` вместо `if(opp.strategy === 'ff') return '...'`.  
Добавить новую стратегию = добавить одну строку в словарь.

```javascript
const CHART_MODES = [
  { id: 'entry-prices', label: 'Цены входа' },
  { id: 'entry-spread', label: 'Спред входа' },
  { id: 'exit-prices',  label: 'Цены выхода' },
  { id: 'exit-spread',  label: 'Спред выхода' },
]
```

Массив используется в двух местах: для рендера кнопок-вкладок графика И для определения активного режима. Хранить в одном месте = не дублировать.

---

## 5. Вспомогательные функции

### 5.1 `formatCountdown(secs)`

```javascript
function formatCountdown(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2,'0')}:...`
}
```

Принимает **секунды** (например, 5400), возвращает строку "01:30:00".  
`padStart(2,'0')` добавляет ноль слева если число однозначное: 9 → "09".  
Используется в ExCard для таймера до следующего фандинга.

### 5.2 `calcRisk(opp)`

```javascript
function calcRisk(opp) {
  let s = 0
  if (opp.spread >= 1) s += 2   // базовые 2 очка за минимальный спред
  if (opp.spread >= 2) s += 1   // +1 за хороший спред
  if (opp.spread >= 3) s += 1   // +1 за отличный спред
  if (opp.bid_transfer?.deposit)  s += 1  // депозит на bid-бирже открыт
  if (opp.bid_transfer?.withdraw) s += 1  // вывод с bid-биржи открыт
  if (opp.ask_transfer?.deposit)  s += 1  // депозит на ask-бирже открыт
  if (opp.ask_transfer?.withdraw) s += 1  // вывод с ask-биржи открыт
  if ((opp.bid_volume || 0) > 10_000_000) s += 1  // достаточная ликвидность
  if ((opp.ask_volume || 0) > 10_000_000) s += 1  // достаточная ликвидность
  return Math.min(s, 10)
}
```

**Логика оценки риска:** чем БОЛЬШЕ очков — тем МЕНЬШЕ риск (шкала "надёжности").  
Максимум 10. Цвет: ≥7 зелёный, ≥5 оранжевый, <5 красный.

> ⚠️ Внимание: `?.` — это опциональная цепочка. `opp.bid_transfer?.deposit` вернёт `undefined` (не ошибку), если `bid_transfer` не существует. Всегда используй её при работе с данными из API.

### 5.3 `smoothPath(pts)`

```javascript
function smoothPath(pts) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0,y0] = pts[i-1], [x1,y1] = pts[i]
    const cx = (x0+x1)/2
    d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`
  }
  return d
}
```

Это сердце графика. Берёт массив точек `[[x,y], [x,y], ...]` и создаёт SVG-путь с плавными кривыми Безье вместо ломаных линий.

**Как работает кривая Безье (`C`)?**  
`C cx1,cy1 cx2,cy2 x,y` — кривая от текущей точки до `(x,y)` с двумя управляющими точками.  
Наш трюк: обе управляющие точки имеют одинаковый X = середина между двумя точками. Это даёт красивый S-образный переход.

```
Без smoothPath (ломаная):    С smoothPath (кривая):
    *                             *
   / \                           / ‾ \
  /   \                         /     \
 *     *                       *       *
```

### 5.4 `generateInitialHistory(bidPrice, askPrice, n = 50)`

```javascript
function generateInitialHistory(bidPrice, askPrice, n = 50) {
  const points = []
  let bid = bidPrice * 0.9985  // начинаем чуть ниже текущей цены
  for (let i = 0; i < n; i++) {
    const shared = (Math.random() - 0.5) * 0.0018  // общее движение рынка
    bid = bid * (1 + shared + (Math.random()-0.5)*0.0006)  // + уникальный шум
    points.push({ bid, ask })
  }
  points[n-1] = { bid: bidPrice, ask: askPrice }  // последняя точка = реальная цена
  return points
}
```

Генерирует "правдоподобную" историю цен. Это **симуляция** — реальных исторических данных нет.

**Ключевые моменты:**
- `shared` — общее движение для bid и ask (они коррелируют, как в реальности)
- Индивидуальный шум `(Math.random()-0.5)*0.0006` — небольшое расхождение
- Последняя точка всегда = реальной цене (чтобы график "приходил" к правде)

### 5.5 `makeYGrid(yMin, yMax, n = 5)`

```javascript
function makeYGrid(yMin, yMax, n = 5) {
  const step = (yMax - yMin) / (n - 1)
  return Array.from({ length: n }, (_, i) => yMin + i * step)
}
```

Возвращает `n` равномерно распределённых значений в диапазоне [yMin, yMax].  
Пример: `makeYGrid(100, 200, 5)` → `[100, 125, 150, 175, 200]`  
Используется для горизонтальных линий сетки на графике.

---

## 6. Подкомпонент DmExLogo

```javascript
function DmExLogo({ info }) {
  const [err, setErr] = useState(false)
  // ...
}
```

**Зачем нужен state `err`?**  
Логотипы биржи загружаются из интернета через Google Favicons API. Если загрузка не удалась (нет сети, биржа не нашлась), `onError` устанавливает `err = true` и компонент рендерит буквенную заглушку.

```
Успех:                    Ошибка:
[  BN logo img  ]         [ BN ] ← цветной прямоугольник с аббревиатурой
```

`info.color + '22'` — добавляет к HEX-цвету суффикс 22 (opacity 13%). Например, `#F3BA2F` → `#F3BA2F22`.

---

## 7. Подкомпонент LiveChart (самый сложный)

### 7.1 Система координат SVG

```javascript
const W = 500, H = 210        // ширина и высота холста
const PL = 12, PR = 56        // отступы: левый и правый
const PT = 14, PB = 24        // отступы: верхний и нижний
const cW = W - PL - PR        // 432px — ширина области рисования
const cH = H - PT - PB        // 172px — высота области рисования
```

**Важно понять:** SVG начинает отсчёт Y сверху вниз (0 = верх, 210 = низ).  
В графиках Y растёт вверх. Поэтому используем инверсию:

```javascript
const mkY = (v, yMin, yMax) => PT + (1 - (v - yMin) / (yMax - yMin)) * cH
```

Разберём формулу:
- `(v - yMin) / (yMax - yMin)` — нормализуем значение в диапазон 0..1 (0 = низ, 1 = верх)
- `1 - (...)` — инвертируем (теперь 0 = верх SVG, 1 = низ SVG)
- `PT + (...) * cH` — масштабируем на высоту и сдвигаем на верхний отступ

```
Значение 3700 (нижнее) → mkY → Y = 172 (внизу SVG) ✓
Значение 3800 (верхнее) → mkY → Y = 14 (вверху SVG) ✓
```

### 7.2 Функция tx — X-координата по индексу

```javascript
const tx = i => PL + (i / (n - 1)) * cW
```

Равномерно распределяет `n` точек по ширине графика.  
- `i = 0` → `tx = PL` (левый край)
- `i = n-1` → `tx = PL + cW` (правый край = NOW)

### 7.3 mkPath — конвертация массива значений в SVG-путь

```javascript
const mkPath = (values, yMin, yMax) => {
  const pts = values.map((v, i) => [tx(i), mkY(v, yMin, yMax)])
  return { path: smoothPath(pts), pts }
}
```

1. Каждое значение `v` переводим в координату `[x, y]`
2. Массив координат передаём в `smoothPath()` → получаем строку SVG-пути
3. Возвращаем и путь (для рисования линии), и точки (для живой точки в конце)

### 7.4 Внутренние компоненты YAxis и TimeBar

Эти компоненты определены **внутри LiveChart**. Это возможно в React, но нужно помнить: они пересоздаются на каждый рендер. Здесь это приемлемо, потому что они простые и не имеют state.

```javascript
const YAxis = ({ yMin, yMax, n: ng = 5, fmtFn }) => (
  <g>
    <line .../> {/* вертикальная линия-разделитель оси */}
    {makeYGrid(yMin, yMax, ng).map((v, i) => (
      <g key={i}>
        <line .../> {/* горизонтальная пунктирная линия сетки */}
        <text ...>{fmtFn(v)}</text> {/* подпись значения */}
      </g>
    ))}
  </g>
)
```

`fmtFn` — функция форматирования метки. Передаётся снаружи:
- Для ценовых графиков: `v => '$' + formatPrice(v)` → "$3,640.5"
- Для спред-графиков: `v => v.toFixed(2) + '%'` → "2.04%"

### 7.5 Четыре режима графика

Вместо `switch/case` используется цепочка `if`. Каждый `if` возвращает свой `<svg>`. Это называется "ранний возврат" — как только нашёл нужный режим, сразу вернул результат.

#### Режим 1: entry-prices (Цены входа)

**Что показывает:** живые цены bid (зелёная) и ask (красная).

```
$3,800 ─────────────────────────────────────── ask (красная)
$3,700 ─────────────────────────────────────── bid (зелёная)
      -2м              -1м               NOW
```

**Ценовые теги на Y-оси** — это прямоугольники (`<rect>`) с цветной обводкой, показывающие текущую цену прямо на оси. Горизонтальная засечка (`<line>`) соединяет линию с тегом.

**Анимация живой точки** — два круга `<circle>` с одинаковыми координатами:
1. Первый — статичный заполненный
2. Второй — пустой, с `<animate>` увеличивающим радиус и уменьшающим прозрачность  
Итог: пульсирующий эффект как в TradingView.

#### Режим 2: entry-spread (Спред входа)

**Что показывает:** текущий спред между биржами в % (ask - bid) / bid × 100.

```javascript
const spreads = history.map(p => (p.ask - p.bid) / p.bid * 100)
```

Пунктирная линия на уровне 0.30% — это минимальный рекомендуемый спред для торговли.

**Градиентная заливка** создаётся через:
1. `<linearGradient>` в `<defs>` — определяет переход цвета сверху вниз
2. `fill="url(#es-grad)"` на `<path>` — применяет градиент к фигуре
3. Путь заливки: `${path} L ${lastX},${tY} L ${PL},${tY} Z` — продолжает кривую вниз до линии 0.30%

#### Режим 3: exit-prices (Цены выхода)

**Что показывает:** живые цены + уровни входа пользователя + P&L зоны.

Это самый сложный режим. Ключевая логика — определить "в профите ли позиция":

```javascript
const longInProfit  = lastBid > avgLong   // текущая цена выше цены покупки → LONG в плюсе
const shortInProfit = lastAsk < avgShort  // текущая цена ниже цены продажи → SHORT в плюсе
```

**Заливка P&L** между текущей линией и уровнем входа:
```javascript
d={`${pathB} L ${W-PR},${avgLongY} L ${PL},${avgLongY} Z`}
```
Это замыкает кривую до горизонтального уровня входа, создавая закрашенную зону.

**clipPath** ограничивает заливку областью рисования — без него заливка вышла бы за границы графика:
```javascript
<clipPath id="xp-clip">
  <rect x={PL} y={PT} width={cW} height={cH}/>
</clipPath>
// ...
<path ... clipPath="url(#xp-clip)"/>
```

**Защита от некорректных значений:**
```javascript
const reasonable = v => v > 0 && Math.abs(v - center) < center * 0.4
```
Если пользователь введёт "3.5" вместо "3500" — функция вернёт `false` и масштаб не сломается. Граница ±40% от центра текущих цен.

#### Режим 4: exit-spread (Спред выхода)

**Что показывает:** обратный спред (bid - ask) / ask × 100.

Когда позиция открыта с прибыльным спредом, этот режим показывает насколько далеко текущий спред от нуля. Цель — дождаться когда линия поднимется выше 0 (закрыть с профитом).

```
+0.5% ─────────────────────────── зона профита
 0.0% ═══════════════════════════ цель выхода
-1.5% ─────────────────────────── зона убытка
-2.3% ────────────*──────────────── текущее значение
```

---

## 8. Подкомпонент ExCard

```javascript
function ExCard({ side, price, exInfo, funding, volume, transfer, symbol }) {
```

Принимает `side: 'long' | 'short'` и рендерит карточку биржи с соответствующими цветами.

**Цветовая логика:**
```javascript
const isBuy   = side === 'long'
const accent  = isBuy ? 'var(--success)' : 'var(--error)'    // зелёный / красный
const borderC = isBuy ? 'rgba(0,201,122,0.2)' : 'rgba(224,80,80,0.2)'
const bgC     = isBuy ? 'rgba(0,201,122,0.03)' : 'rgba(224,80,80,0.03)'
```

Рамка и фон имеют низкую прозрачность — 0.2 и 0.03. Это даёт едва заметный цветовой тон без яркого мигания.

**`useMemo` для обратного отсчёта:**
```javascript
const fundingSecs = useMemo(() => {
  const next = funding?.next_time  // unix timestamp в секундах
  if (!next) return null
  return Math.max(0, next - Math.floor(Date.now() / 1000))
}, [funding?.next_time])
```

`useMemo` пересчитывает только когда изменяется `funding.next_time` (зависимость в массиве). Без него пересчёт происходил бы на каждый рендер.

`Math.max(0, ...)` — защита от отрицательного значения (если время уже прошло).

**Клик на карточку** открывает терминал биржи:
```javascript
const handleOpen = (e) => {
  e.stopPropagation()  // ← важно! останавливает всплытие события
  if (exInfo.futuresUrl) window.open(exInfo.futuresUrl(sym), '_blank')
}
```

`e.stopPropagation()` нужен, потому что ExCard находится внутри `dm-overlay`, который закрывает модалку при клике. Без `stopPropagation` клик на карточку закрывал бы модалку.

---

## 9. CSS — архитектура стилей

Все стили хранятся в строке `const style = \`...\`` и вставляются через `<style>{style}</style>` при каждом рендере.

**Почему не CSS-файл?**  
Проект использует inline-стили в компонентах как architectural decision. Плюсы: компонент полностью самодостаточен, нет зависимости от внешних файлов. Минус: нет автодополнения в IDE.

### Иерархия блоков

```
.dm-overlay         ← полупрозрачная подложка поверх всей страницы
  └── .dm           ← само модальное окно (flex-column)
        ├── .dm-header         ← шапка (flex-row)
        │     ├── .dm-h-left   ← символ, стратегия, спред, время
        │     └── .dm-h-right  ← иконки + крестик
        ├── .dm-body           ← тело (grid: 400px | 1fr)
        │     ├── .dm-col-l    ← левая колонка
        │     │     ├── ExCard (SHORT)
        │     │     ├── .dm-sep + .dm-trade-btn
        │     │     └── ExCard (LONG)
        │     └── .dm-col-r    ← правая колонка
        │           ├── .dm-chart-wrap
        │           │     ├── .dm-chart-modes (4 вкладки)
        │           │     └── .dm-chart-inner (SVG)
        │           └── .dm-calc (калькулятор P&L)
        └── (footer удалён)
```

### Ключевые CSS-приёмы

**`flex-shrink: 0`** на `.dm-header` — запрещает шапке сжиматься когда контент тела переполняется. Без этого шапка "сплющивалась" бы при маленьком экране.

**`min-height: 0`** на `.dm-body` — в Flexbox потомки grid/flex могут переполнять контейнер. Это свойство исправляет баг с `overflow-y: auto` во вложенных flex-элементах.

**`overflow-y: auto`** на `.dm-col-l` и `.dm-col-r` — каждая колонка прокручивается независимо.

**`backdrop-filter: blur(5px)`** на `.dm-overlay` — размывает содержимое сзади. Работает только если браузер поддерживает (современные поддерживают).

---

## 10. Главный компонент DetailModal

### 10.1 Props (входные данные)

```javascript
function DetailModal({ opp, tradeAmount, onClose, isFavorite, onFavorite, onHide })
```

| Prop | Тип | Описание |
|------|-----|----------|
| `opp` | Object | Объект арбитражной возможности (вся данные о паре) |
| `tradeAmount` | Number | Сумма сделки из фильтров (для расчёта прибыли) |
| `onClose` | Function | Закрыть модалку (устанавливает `selected = null` в App) |
| `isFavorite` | Boolean | Находится ли в избранном |
| `onFavorite` | Function | Добавить/убрать из избранного |
| `onHide` | Function | Скрыть карточку из списка |

### 10.2 State (внутреннее состояние)

```javascript
const [chartMode, setChartMode] = useState('entry-prices')
```
Какая вкладка графика активна. По умолчанию — первая.

```javascript
const [avgLong,  setAvgLong]  = useState('')
const [avgShort, setAvgShort] = useState('')
```
Строки из инпутов калькулятора P&L. Строки (не числа) — потому что `<input>` возвращает строки. Конвертируются в числа позже через `parseFloat`.

```javascript
const [fundingSecs, setFundingSecs] = useState(() => {
  const next = opp.bid_funding?.next_time
  return next ? Math.max(0, next - Math.floor(Date.now() / 1000)) : 4 * 3600
})
```
Обратный отсчёт до следующего фандинга в секундах. Инициализация через функцию `() => {...}` — это "lazy initializer". React вызовет эту функцию только один раз (при создании). Без функции вычисление происходило бы на каждый рендер.

```javascript
const [liveHistory, setLiveHistory] = useState(() =>
  generateInitialHistory(opp.bid_price || 100, opp.ask_price || 101)
)
```
Массив из 50 точек `{bid, ask}`. Инициализируется симулированной историей. Далее пополняется каждые 2 секунды в эффекте.

### 10.3 Effects (побочные эффекты)

**Эффект 1 — клавиша Escape:**
```javascript
useEffect(() => {
  const h = e => { if (e.key === 'Escape') onClose() }
  document.addEventListener('keydown', h)
  return () => document.removeEventListener('keydown', h)  // ← cleanup!
}, [onClose])
```

`return () => removeEventListener(...)` — это функция "очистки". React вызывает её когда компонент исчезает. Без неё обработчик оставался бы в памяти навсегда (утечка памяти).

Зависимость `[onClose]` — эффект перезапустится если функция `onClose` изменится. На практике — никогда не изменится, но React требует явно указывать все зависимости.

**Эффект 2 — таймер фандинга:**
```javascript
useEffect(() => {
  const t = setInterval(() => setFundingSecs(s => s > 0 ? s - 1 : 0), 1000)
  return () => clearInterval(t)
}, [])
```

`setInterval` каждую секунду уменьшает счётчик на 1. Пустой массив `[]` = запустить только один раз при монтировании. `clearInterval(t)` — остановить таймер при закрытии модалки.

`s => s > 0 ? s - 1 : 0` — функциональное обновление (берёт предыдущее значение `s`). Надёжнее чем `setFundingSecs(fundingSecs - 1)`, потому что не зависит от замыкания.

**Эффект 3 — живые цены:**
```javascript
useEffect(() => {
  const t = setInterval(() => {
    setLiveHistory(prev => {
      const last = prev[prev.length - 1]  // последняя точка
      const shared = (Math.random() - 0.5) * 0.0018
      const newBid = Math.max(0.0001, last.bid * (1 + shared + ...))
      const newAsk = Math.max(0.0001, last.ask * (1 + shared + ...))
      return [...prev.slice(-60), { bid: newBid, ask: newAsk }]
    })
  }, 2000)
  return () => clearInterval(t)
}, [])
```

Каждые 2 секунды добавляет новую точку на основе предыдущей. `prev.slice(-60)` — хранит максимум 60 точек (120 секунд истории). Старые точки отбрасываются.

`Math.max(0.0001, ...)` — защита от нулевой или отрицательной цены.

### 10.4 Derived Values (производные вычисления)

```javascript
const bidEx = getExchangeInfo(opp.bid_ex)  // объект с данными о бирже LONG
const askEx = getExchangeInfo(opp.ask_ex)  // объект с данными о бирже SHORT
```

```javascript
const longVal  = parseFloat(avgLong)  || 0   // строка → число (или 0 если пусто)
const shortVal = parseFloat(avgShort) || 0
const bothFilled = longVal > 0 && shortVal > 0  // оба поля заполнены
```

**Расчёты калькулятора P&L:**

```javascript
// Спред при входе: насколько выше была цена SHORT относительно LONG
const userEntrySpread = bothFilled
  ? (shortVal - longVal) / longVal * 100
  : null

// Текущий "обратный" спред: насколько bid выше/ниже ask прямо сейчас
const currentExitSpread = last
  ? (last.bid - last.ask) / last.ask * 100
  : null

// Текущий профит = спред входа + текущий обратный спред
// Если entrySpread был +3.5% и сейчас exitSpread = -1.2%,
// то реализованный профит ≈ 3.5% - 1.2% = 2.3%
const profitNowPct = userEntrySpread != null && currentExitSpread != null
  ? userEntrySpread + currentExitSpread
  : null
```

```javascript
// Запрет вкладок exit-* если не введены оба значения
const exitChartDisabled = !bothFilled
```

---

## 11. Поток данных (Data Flow)

```
App.jsx
  │
  ├── selected (opp объект)  ──────────────────────┐
  ├── filters.tradeAmount    ──────────────────────┤
  ├── favorites.includes(id) ──────────────────────┤  props →  DetailModal
  ├── toggleFavorite         ──────────────────────┤
  ├── toggleHidden           ──────────────────────┤
  └── () => setSelected(null) ────────────────────┘
                                                    │
                                          DetailModal
                                            │
                                            ├── opp ──────────────────► ExCard (×2)
                                            ├── liveHistory ──────────► LiveChart
                                            ├── chartMode ────────────► LiveChart
                                            ├── avgLong/avgShort ─────► LiveChart + расчёты
                                            ├── bidEx/askEx ──────────► ExCard + LiveChart
                                            └── spreadColor ──────────► header + dm-sep
```

---

## 12. Частые вопросы

**Q: Почему CSS в строке, а не в отдельном файле?**  
A: Это архитектурный выбор проекта. Компонент полностью самодостаточен. Стили и JSX в одном файле.

**Q: Почему SVG, а не canvas или библиотека графиков?**  
A: SVG декларативный (как HTML), встраивается в React без проблем, поддерживает CSS-анимации, не требует зависимостей.

**Q: Почему история цен симулируется, а не берётся из API?**  
A: Исторические данные цен требуют отдельного дорогого API. Симуляция даёт "правдоподобную" картину для демонстрации. В будущем можно заменить реальными данными.

**Q: Что такое `?? 0` и `?.` в коде?**  
A: 
- `a ?? 0` — "если `a` равно `null` или `undefined`, использовать `0`"
- `obj?.prop` — "обратиться к `prop` только если `obj` существует, иначе вернуть `undefined`"
- Без них код падал бы при отсутствующих данных из API

**Q: Почему `exitChartDisabled` блокирует именно exit-вкладки?**  
A: Режимы exit-prices и exit-spread требуют знания цен входа пользователя (avgLong, avgShort). Без них показывать нечего — поэтому вкладки заблокированы до заполнения калькулятора.

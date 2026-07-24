const style = `
  .tv-wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    position: relative;
  }
  .tv-root {
    flex: 1;
    min-height: 0;
    width: 100%;
  }
  /* Пока точек меньше двух, рисовать нечего, но контейнер должен
     остаться в потоке: библиотека снимает с него размеры при создании.
     visibility прячет содержимое, не убирая элемент из раскладки —
     display:none обнулил бы размеры и график создался бы нулевым. */
  .tv-root.tv-hidden {
    visibility: hidden;
  }
  .tv-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--text-muted);
  }
`

import { useEffect, useRef } from 'react'
import {
  createChart, ColorType, LineStyle, LineType, CrosshairMode,
  LineSeries, AreaSeries, BaselineSeries,
} from 'lightweight-charts'
import { BandPrimitive } from './tvBandPrimitive.js'

/**
 * Читает цвета и шрифт из CSS-переменных index.css.
 *
 * Вход:  нет.
 * Выход: объект с цветами графика.
 * Побочных эффектов нет, но читает DOM — вызывать только внутри эффекта.
 *
 * Библиотека принимает цвета строками из JS, а не через CSS, поэтому
 * значения приходится доставать вручную. Фолбэки — на случай, если
 * переменной не окажется: график не должен оказаться чёрным по чёрному.
 */
function readTheme() {
  const css = getComputedStyle(document.documentElement)
  const v = (name, fallback) => (css.getPropertyValue(name) || '').trim() || fallback

  return {
    success: v('--success', '#00c97a'),
    error: v('--error', '#e03e3e'),
    accentBright: v('--accent-bright', '#3d87c0'),
    accent: v('--accent', '#2F6997'),
    grid: v('--chart-grid', '#0d1e30'),
    axis: v('--chart-axis', '#0e2a42'),
    label: v('--chart-label', '#3d506a'),
    panel: v('--bg-card', '#0d2033'),
    fontMono: v('--font-mono', "'JetBrains Mono', monospace"),
  }
}

/**
 * Добавляет прозрачность к цвету из палитры.
 *
 * Вход:  color — '#rgb', '#rrggbb' либо любая другая строка;
 *        alpha — доля от 0 до 1.
 * Выход: строка 'rgba(r, g, b, a)'. Не-hex значения возвращаются как есть.
 * Побочных эффектов нет.
 *
 * Нужна для градиентных заливок: токены палитры непрозрачные,
 * а заливка должна растворяться к краю графика.
 */
function withAlpha(color, alpha) {
  const hex = (color || '').trim()
  if (hex[0] !== '#') return color

  let r, g, b
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16)
    g = parseInt(hex.slice(3, 5), 16)
    b = parseInt(hex.slice(5, 7), 16)
  } else {
    return color
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Считает число знаков после запятой по разбросу значений.
 *
 * Вход:  min, max — границы диапазона.
 * Выход: целое число знаков.
 * Побочных эффектов нет.
 *
 * Формула перенесена один в один из самописного Chart (переменная dec),
 * чтобы подписи оси не изменились при переезде на библиотеку. Её задача —
 * не дать соседним делениям совпасть при узком диапазоне: у BTC разброс
 * в пару долларов при нулевой точности дал бы четыре одинаковых числа.
 */
function decimalsForRange(min, max) {
  const range = max - min
  if (range < 0.0005) return 6
  if (range < 0.005) return 5
  if (range < 0.5) return 4
  if (range < 50) return 3
  if (range < 500) return 2
  return 0
}

// Отступ цели от нуля, повторяет TARGET_EXIT из DetailModal.jsx.
// Дублируется, а не импортируется: DetailModal грузит TvChart лениво,
// статический импорт в обратную сторону затянул бы TvChart сразу.
const TARGET_EXIT = 0.30

/**
 * Готовит ряды под текущий режим.
 *
 * Вход:  mode — идентификатор режима;
 *        history — точки вида { t, bid, ask, bidExit, askExit };
 *        theme — результат readTheme();
 *        avgLong, avgShort — уровни входа пользователя (нужны только
 *        exit-режимам; для entry-* игнорируются).
 * Выход: { rows, decimals, priceLines } — rows это массив описаний рядов
 *        { key, type, data, options }, decimals — точность подписей оси,
 *        priceLines — горизонтальные уровни для первого ряда (может
 *        отсутствовать).
 * Побочных эффектов нет.
 */
function buildRows(mode, history, theme, avgLong, avgShort) {
  if (mode === 'exit-spread') {
    // ref — спред при входе пользователя. captured = ref - текущий спред:
    //   > 0 → спред сузился, позиция закрывается в профит
    //   = 0 → спред на уровне входа
    //   < 0 → спред ещё шире, чем при входе (рано закрывать)
    // Формула и стороны перенесены дословно из самописного Chart.
    const ref = (parseFloat(avgShort) - parseFloat(avgLong)) / parseFloat(avgShort) * 100

    const data = history.map(p => {
      const b = p.bidExit ?? p.bid
      const a = p.askExit ?? p.ask
      const spread = (b - a) / b * 100
      return { time: p.t, value: ref - spread }
    })

    // Уровень входа (0%) и цель захвата. Цель показываем только когда
    // она ниже нуля — то же условие goalY < zeroY, что в SVG.
    const priceLines = [{
      price: 0,
      color: theme.label,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      axisLabelVisible: true,
      title: 'УРОВЕНЬ ВХОДА 0%',
    }]
    const goal = ref - TARGET_EXIT
    if (goal < 0) {
      priceLines.push({
        price: goal,
        color: theme.accent,
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: true,
        title: 'ЦЕЛЬ ЗАХВАТА',
      })
    }

    return {
      decimals: 2,
      priceLines,
      rows: [{
        key: 'captured',
        type: BaselineSeries,
        data,
        options: {
          // Выше нуля — синяя зона (--accent-bright), ниже — красная.
          // SVG красил всю линию по последней точке; baseline делит по
          // каждому пересечению нуля — ближе к смыслу «сейчас в профите».
          baseValue: { type: 'price', price: 0 },
          topLineColor: theme.accentBright,
          topFillColor1: withAlpha(theme.accentBright, 0.4),
          topFillColor2: withAlpha(theme.accentBright, 0.02),
          bottomLineColor: theme.error,
          bottomFillColor1: withAlpha(theme.error, 0.02),
          bottomFillColor2: withAlpha(theme.error, 0.25),
          lineWidth: 2,
          lineType: LineType.Curved,
        },
      }],
    }
  }

  if (mode === 'entry-spread') {
    // Спред входа: (bid - ask) / bid * 100. Формула единая по проекту,
    // менять местами bid и ask запрещено (CLAUDE.md).
    const data = history.map(p => ({
      time: p.t,
      value: (p.bid - p.ask) / p.bid * 100,
    }))

    return {
      decimals: 2,
      rows: [{
        key: 'spread',
        type: BaselineSeries,
        data,
        options: {
          // Базовая линия по нулю: выше — зелёная зона, ниже — красная.
          // Самописный SVG рисовал линию зелёной всегда, даже при
          // отрицательном спреде; здесь смена цвета встроенная.
          baseValue: { type: 'price', price: 0 },
          topLineColor: theme.success,
          topFillColor1: withAlpha(theme.success, 0.4),
          topFillColor2: withAlpha(theme.success, 0.02),
          bottomLineColor: theme.error,
          bottomFillColor1: withAlpha(theme.error, 0.02),
          bottomFillColor2: withAlpha(theme.error, 0.3),
          lineWidth: 2,
          lineType: LineType.Curved,
        },
      }],
    }
  }

  // entry-prices: две цены входа на общей шкале.
  // bid — сторона SELL (дороже), ask — сторона BUY (дешевле).
  if (mode === 'exit-prices') {
    // Цены ВЫХОДА: bidExit — закрытие SHORT, askExit — закрытие LONG.
    // Заливка между линиями показывает, насколько цены сошлись.
    // Фолбэк на bid/ask повторяет самописный Chart.
    const bids = history.map(p => p.bidExit ?? p.bid)
    const asks = history.map(p => p.askExit ?? p.ask)
    const min = Math.min(...bids, ...asks)
    const max = Math.max(...bids, ...asks)

    return {
      decimals: decimalsForRange(min, max),
      // Точки для примитива заливки: top — bid, bottom — ask (как в SVG).
      band: {
        points: history.map(p => ({
          time: p.t,
          top: p.bidExit ?? p.bid,
          bottom: p.askExit ?? p.ask,
        })),
        colors: {
          // Градиент сверху красный, снизу зелёный — opacity 0.18 из SVG.
          top: withAlpha(theme.error, 0.18),
          bottom: withAlpha(theme.success, 0.18),
        },
      },
      rows: [
        {
          key: 'bid',
          type: LineSeries,
          data: history.map(p => ({ time: p.t, value: p.bidExit ?? p.bid })),
          options: { color: theme.error, lineWidth: 2, lineType: LineType.Curved },
        },
        {
          key: 'ask',
          type: LineSeries,
          data: history.map(p => ({ time: p.t, value: p.askExit ?? p.ask })),
          options: { color: theme.success, lineWidth: 2, lineType: LineType.Curved },
        },
      ],
    }
  }

  // entry-prices: две цены входа на общей шкале.
  // bid — сторона SELL (дороже), ask — сторона BUY (дешевле).
  const asks = history.map(p => p.ask)
  const min = Math.min(...bids, ...asks)
  const max = Math.max(...bids, ...asks)

  return {
    decimals: decimalsForRange(min, max),
    rows: [
      {
        // Под bid идёт градиентная заливка — как в самописной версии.
        key: 'bid',
        type: AreaSeries,
        data: history.map(p => ({ time: p.t, value: p.bid })),
        options: {
          lineColor: theme.error,
          topColor: withAlpha(theme.error, 0.3),
          bottomColor: withAlpha(theme.error, 0),
          lineWidth: 2,
          lineType: LineType.Curved,
        },
      },
      {
        key: 'ask',
        type: LineSeries,
        data: history.map(p => ({ time: p.t, value: p.ask })),
        options: {
          color: theme.success,
          lineWidth: 2,
          lineType: LineType.Curved,
        },
      },
    ],
  }
}

/**
 * График котировок на TradingView Lightweight Charts.
 *
 * Вход:  mode — 'entry-prices' | 'entry-spread' | 'exit-spread';
 *        history — массив точек { t, bid, ask, bidExit, askExit }, где
 *        t в unix-секундах и строго возрастает (порядок обеспечивает
 *        DetailModal);
 *        avgLong, avgShort — уровни входа пользователя. Нужны только
 *        exit-режимам; без них график выхода не считается.
 * Выход: JSX.
 * Побочные эффекты: создаёт canvas и ResizeObserver в DOM,
 * снимает их при размонтировании.
 */
function TvChart({ mode, history, avgLong, avgShort }) {
  const boxRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef({})
  // Примитив заливки между линиями — только для exit-prices. Хранится
  // отдельно от серий: он крепится к серии, но живёт своим циклом.
  const bandRef = useRef(null)
  // Что уже отдано в график. Нужно, чтобы отличить дорисовку хвоста от
  // полной перерисовки: setData на каждом тике сбрасывал бы пользователю
  // масштаб, который он выставил колесом или пальцем.
  const appliedRef = useRef(null)

  // exit-режимы считаются от уровней входа — без них рисовать нечего.
  // Условие повторяет calcFilled из DetailModal (оба > 0).
  const isExit = mode === 'exit-spread'
  const hasAvg = parseFloat(avgLong) > 0 && parseFloat(avgShort) > 0
  const hasData = history.length >= 2 && (!isExit || hasAvg)

  // ── Создание графика ────────────────────────────────────────────────────
  // Пустые зависимости: график живёт от монтирования компонента до
  // закрытия модалки. Серии внутри пересоздаёт отдельный эффект.
  useEffect(() => {
    if (!boxRef.current) return

    const theme = readTheme()
    const chart = createChart(boxRef.current, {
      // Прозрачный фон обязателен: под графиком стеклянная панель
      // модалки, сплошная заливка перекрыла бы её.
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: theme.label,
        fontFamily: theme.fontMono,
        fontSize: 10,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: theme.grid },
        horzLines: { color: theme.grid },
      },
      rightPriceScale: {
        borderColor: theme.axis,
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: theme.axis,
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 3,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: theme.label,
          style: LineStyle.Dashed,
          labelBackgroundColor: theme.panel,
        },
        horzLine: {
          color: theme.label,
          style: LineStyle.Dashed,
          labelBackgroundColor: theme.panel,
        },
      },
      // Вертикальное перетаскивание пальцем оставляем странице: на
      // телефоне модалка скроллится целиком (MOBILE_PLAN.md), и если бы
      // график перехватывал вертикальный свайп, пользователь не смог бы
      // проскроллить страницу, начав жест на графике.
      handleScroll: { vertTouchDrag: false },
      autoSize: true,
    })

    chartRef.current = chart

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = {}
      bandRef.current = null
      appliedRef.current = null
    }
  }, [])

  // ── Серии и данные ──────────────────────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !hasData) return

    const theme = readTheme()
    const { rows, decimals, priceLines, band } = buildRows(mode, history, theme, avgLong, avgShort)
    const applied = appliedRef.current

    // Оба спред-режима показывают ось в процентах.
    const isPercent = mode === 'entry-spread' || mode === 'exit-spread'

    // Полная перерисовка нужна, когда сменился режим, изменилась точность
    // подписей, сдвинулись уровни входа (exit-режим пересчитал ref),
    // история укоротилась (сработал slice(-60)) или сдвинулось её начало.
    // В остальных случаях дорисовываем хвост.
    const needsReset =
      !applied ||
      applied.mode !== mode ||
      applied.decimals !== decimals ||
      applied.avgLong !== avgLong ||
      applied.avgShort !== avgShort ||
      history.length < applied.len ||
      history[0]?.t !== applied.firstT

    if (needsReset) {
      // Примитив заливки снимаем перед удалением серий: он прикреплён
      // к bid-серии и без явного detach оставил бы висящий рендерер.
      if (bandRef.current && seriesRef.current.bid) {
        seriesRef.current.bid.detachPrimitive(bandRef.current)
      }
      bandRef.current = null

      // Серии снимаем явно: смена режима меняет и набор рядов, и смысл
      // шкалы, переиспользовать их нельзя.
      Object.values(seriesRef.current).forEach(s => chart.removeSeries(s))
      seriesRef.current = {}

      // Подписи оси: у цен — знаки по разбросу, у спредов — процент.
      // Формат повторяет самописный Chart, чтобы вид оси не изменился.
      chart.applyOptions({
        localization: {
          priceFormatter: isPercent
            ? v => v.toFixed(2) + '%'
            : v => v.toFixed(decimals),
        },
      })

      rows.forEach((row, idx) => {
        const series = chart.addSeries(row.type, {
          ...row.options,
          priceFormat: {
            type: 'price',
            precision: decimals,
            minMove: Math.pow(10, -decimals),
          },
        })
        series.setData(row.data)
        // Горизонтальные уровни (вход/цель) вешаем на первый ряд.
        if (idx === 0 && priceLines) {
          priceLines.forEach(pl => series.createPriceLine(pl))
        }
        seriesRef.current[row.key] = series
      })

      // Заливка между линиями (exit-prices): крепим к bid-серии, даём
      // ссылку на ask-серию и первичные точки. Примитив рисуется под
      // линиями за счёт zOrder 'bottom' внутри примитива.
      if (band && seriesRef.current.bid && seriesRef.current.ask) {
        const primitive = new BandPrimitive(band.colors)
        seriesRef.current.bid.attachPrimitive(primitive)
        primitive.setBottomSeries(seriesRef.current.ask)
        primitive.setData(band.points)
        bandRef.current = primitive
      }

      chart.timeScale().fitContent()
    } else {
      // Дорисовка хвоста. Начинаем с предпоследней применённой точки:
      // последняя в прошлый раз была «живой» и с тех пор могла
      // зафиксироваться с уточнённым значением.
      rows.forEach(row => {
        const series = seriesRef.current[row.key]
        if (!series) return
        for (let i = Math.max(applied.len - 1, 0); i < row.data.length; i++) {
          series.update(row.data[i])
        }
      })
      // Примитиву заливки отдаём весь массив точек заново — он дешёвый
      // и сам решает, что видно в текущем окне.
      if (band && bandRef.current) {
        bandRef.current.setData(band.points)
      }
    }

    appliedRef.current = {
      mode,
      decimals,
      avgLong,
      avgShort,
      len: history.length,
      firstT: history[0]?.t,
    }
  }, [mode, history, hasData, avgLong, avgShort])

  return (
    <>
      <style>{style}</style>
      <div className="tv-wrap">
        <div className={`tv-root ${hasData ? '' : 'tv-hidden'}`} ref={boxRef} />
        {!hasData && <div className="tv-empty">Собираем данные...</div>}
      </div>
    </>
  )
}

export default TvChart
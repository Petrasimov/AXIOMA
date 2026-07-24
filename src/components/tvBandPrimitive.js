/**
 * tvBandPrimitive.js — заливка области между двумя линиями графика.
 *
 * Lightweight Charts не умеет заливать пространство между двумя сериями
 * штатно (официальная позиция — делать это плагином). Режим exit-prices
 * в самописном SVG рисовал такую заливку двухцветным градиентом как
 * индикатор схождения цен bid и ask — этот примитив повторяет её на canvas.
 *
 * Реализует интерфейс ISeriesPrimitive: primitive держит state (точки
 * двух линий), view пересчитывает экранные координаты, renderer рисует.
 * Имена интерфейсов в библиотеке асимметричны: view — IPrimitivePaneView,
 * renderer — IPrimitivePaneRenderer (без «Pane»).
 */

/**
 * Рендерер: получает готовые экранные координаты и заливает область.
 *
 * Вход через конструктор: data — { top: [{x,y}], bottom: [{x,y}] },
 *   colors — { top, bottom } (rgba-строки заливки сверху и снизу).
 * Побочный эффект: рисует на переданном canvas.
 */
class BandRenderer {
  constructor() {
    this._data = null
    this._colors = null
  }

  update(data, colors) {
    this._data = data
    this._colors = colors
  }

  // target — CanvasRenderingTarget2D из fancy-canvas.
  draw(target) {
    const data = this._data
    if (!data || data.top.length < 2) return

    // useBitmapCoordinateSpace даёт координаты в реальных пикселях
    // устройства — линии остаются чёткими на HiDPI-экранах. Библиотека
    // сама сохраняет и восстанавливает контекст вокруг колбэка.
    target.useBitmapCoordinateSpace(scope => {
      const ctx = scope.context
      const hr = scope.horizontalPixelRatio
      const vr = scope.verticalPixelRatio
      const { top, bottom } = data

      // Контур области: по верхней линии вперёд, по нижней назад — замкнутый
      // многоугольник между двумя кривыми.
      ctx.beginPath()
      ctx.moveTo(top[0].x * hr, top[0].y * vr)
      for (let i = 1; i < top.length; i++) {
        ctx.lineTo(top[i].x * hr, top[i].y * vr)
      }
      for (let i = bottom.length - 1; i >= 0; i--) {
        ctx.lineTo(bottom[i].x * hr, bottom[i].y * vr)
      }
      ctx.closePath()

      // Вертикальный градиент от цвета верхней линии к цвету нижней —
      // повторяет linearGradient g-conv из SVG. Границы берём по всему
      // диапазону Y обеих линий, чтобы переход шёл по высоте области.
      let minY = Infinity
      let maxY = -Infinity
      for (const p of top) { if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y }
      for (const p of bottom) { if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y }

      const grad = ctx.createLinearGradient(0, minY * vr, 0, maxY * vr)
      grad.addColorStop(0, this._colors.top)
      grad.addColorStop(1, this._colors.bottom)

      ctx.fillStyle = grad
      ctx.fill()
    })
  }
}

/**
 * View: пересчитывает данные в экранные координаты перед отрисовкой.
 *
 * Хранит ссылку на primitive (source), чтобы дотянуться до серий и
 * актуальных точек. renderer() возвращает рендерер с готовыми
 * координатами либо null, если рисовать нечего.
 */
class BandPaneView {
  constructor(source) {
    this._source = source
    this._renderer = new BandRenderer()
  }

  // Вызывается библиотекой при любом изменении вьюпорта (зум, пан, ресайз)
  // и при обновлении данных — здесь координаты пересчитываются заново.
  update() {
    const src = this._source
    const chart = src._chart
    const topSeries = src._topSeries
    const bottomSeries = src._bottomSeries
    const points = src._points

    if (!chart || !topSeries || !bottomSeries || !points || points.length < 2) {
      this._renderer.update(null, null)
      return
    }

    const ts = chart.timeScale()
    const top = []
    const bottom = []

    // Координаты берём только через публичное API: X из времени, Y из цены.
    // Точки вне видимого диапазона дают null — пропускаем их.
    for (const p of points) {
      const x = ts.timeToCoordinate(p.time)
      const yTop = topSeries.priceToCoordinate(p.top)
      const yBottom = bottomSeries.priceToCoordinate(p.bottom)
      if (x === null || yTop === null || yBottom === null) continue
      top.push({ x, y: yTop })
      bottom.push({ x, y: yBottom })
    }

    this._renderer.update({ top, bottom }, src._colors)
  }

  renderer() {
    return this._renderer
  }

  // Заливка идёт под линиями и сеткой — как в SVG (opacity 0.18, линии
  // сверху). Без этого примитив рисовался бы поверх линий по порядку
  // добавления. Значения zOrder: 'bottom' | 'normal' | 'top'.
  zOrder() {
    return 'bottom'
  }
}

/**
 * Примитив заливки между линиями bid и ask.
 *
 * Использование:
 *   const band = new BandPrimitive(colors)
 *   topSeries.attachPrimitive(band)        // вешается на верхнюю серию
 *   band.setData(points)                    // [{ time, top, bottom }]
 *   band.setBottomSeries(bottomSeries)      // ссылка на нижнюю серию
 *
 * Вход конструктора: colors — { top, bottom } rgba-строки заливки.
 */
export class BandPrimitive {
  constructor(colors) {
    this._colors = colors
    this._points = []
    this._chart = null
    this._topSeries = null
    this._bottomSeries = null
    this._paneViews = [new BandPaneView(this)]
    this._requestUpdate = null
  }

  // Библиотека зовёт при attachPrimitive: сюда приходят chart и та серия,
  // к которой примитив прикреплён (верхняя). requestUpdate — способ
  // попросить библиотеку перерисовать пейн после смены данных.
  attached({ chart, series, requestUpdate }) {
    this._chart = chart
    this._topSeries = series
    this._requestUpdate = requestUpdate
  }

  detached() {
    this._chart = null
    this._topSeries = null
    this._requestUpdate = null
  }

  // Ссылка на нижнюю серию: примитив висит на верхней, но Y нижней линии
  // берёт из её собственной ценовой шкалы (шкала общая, но API — на серии).
  setBottomSeries(series) {
    this._bottomSeries = series
  }

  // points — [{ time, top, bottom }]. Обновляем state и просим перерисовку.
  setData(points) {
    this._points = points
    if (this._requestUpdate) this._requestUpdate()
  }

  // Библиотека забирает вью через этот геттер.
  paneViews() {
    return this._paneViews
  }

  // Вызывается библиотекой перед отрисовкой — обновляем координаты во вью.
  updateAllViews() {
    this._paneViews.forEach(v => v.update())
  }
}
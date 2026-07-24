import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Хелпер для test-функций групп чанков. Нормализует путь модуля
// (на Windows слеши обратные) и проверяет вхождение каталога пакета
// по ГРАНИЦАМ '/node_modules/имя/', а не по подстроке. Простое
// id.includes('react') поймало бы и lucide-react, и любой будущий
// @scope/react-*, и молча утянуло бы их в чужой чанк.
//
// Вход:  id — абсолютный путь к модулю; dir — имя каталога пакета.
// Выход: true, если модуль принадлежит этому пакету.
// Побочных эффектов нет.
const inPkg = (id, dir) => id.replace(/\\/g, '/').includes(`/node_modules/${dir}/`)

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    // Vite 8 работает на Rolldown, а не на Rollup. Ключ output.manualChunks
    // из Rollup здесь не действует (Rolldown его игнорирует), поэтому
    // ручное разбиение задаётся через codeSplitting.groups. Каждая группа —
    // { name, test, priority }; test это функция (id) => boolean, priority
    // выше = группа выбирается раньше при совпадении нескольких.
    // (Ключ раньше назывался advancedChunks — переименован в codeSplitting.)
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // lightweight-charts и его единственная зависимость fancy-canvas.
            // Отдельный чанк обязателен: без него библиотека попала бы в
            // общий vendor, который грузится при первой отрисовке, и
            // lazy-импорт в DetailModal.jsx перестал бы что-либо откладывать.
            {
              name: 'lwc',
              priority: 30,
              test: id => inPkg(id, 'lightweight-charts') || inPkg(id, 'fancy-canvas'),
            },

            // Иконки отдельно от React: lucide-react меняется при каждом
            // добавлении иконки в интерфейс, react — раз в несколько месяцев.
            // Раздельные чанки избавляют пользователя от перекачивания React
            // из-за одной новой иконки.
            {
              name: 'lucide',
              priority: 20,
              test: id => inPkg(id, 'lucide-react'),
            },

            // React, react-dom и их внутренняя зависимость scheduler — вместе.
            {
              name: 'react',
              priority: 10,
              test: id => inPkg(id, 'react') || inPkg(id, 'react-dom') || inPkg(id, 'scheduler'),
            },

            // Всё остальное из node_modules — общий vendor. Самый низкий
            // приоритет: срабатывает только если модуль не попал в группы выше.
            {
              name: 'vendor',
              priority: 0,
              test: id => id.replace(/\\/g, '/').includes('/node_modules/'),
            },
          ],
        },
      },
    },
  },
  // В production Vite proxy не работает — его роль берёт на себя Nginx.
  // Nginx повторяет все 11 proxy правил из vite.config.js один в один:
  //
  //   /binance-api/...   → https://api.binance.com/...
  //   /binance-fapi/...  → https://fapi.binance.com/...
  //   /bybit-api/...     → https://api.bybit.com/...
  //   /okx-api/...       → https://www.okx.com/...
  //   /gate-api/...      → https://api.gateio.ws/...
  //   /kucoin-api/...    → https://api-futures.kucoin.com/...
  //   /kucoin-spot-api/. → https://api.kucoin.com/...
  //   /mexc-api/...      → https://contract.mexc.com/...
  //   /mexc-spot-api/... → https://api.mexc.com/...
  //   /bingx-api/...     → https://open-api.bingx.com/...
  //   /bitget-api/...    → https://api.bitget.com/...
  //   /api/...           → http://localhost:5000/... (C# бэкенд)
  //
  // Браузер шлёт запросы на свой домен (axiomascan.com/binance-api/...)
  // Nginx перехватывает и проксирует к бирже — CORS не возникает.
  // coinStatus запросы с HMAC подписью работают так же — Nginx передаёт
  // подпись как есть, биржа проверяет.
  // WebSocket к биржам (wss://...) идут напрямую — CORS не применяется.
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          lucide: ['lucide-react'],
        }
      }
    }
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
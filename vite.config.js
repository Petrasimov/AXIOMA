import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/gate-api': {
        target: 'https://api.gateio.ws',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gate-api/, '')
      },
      '/bingx-api': {
        target: 'https://open-api.bingx.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bingx-api/, '')
      },
      '/mexc-api': {
        target: 'https://contract.mexc.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mexc-api/, '')
      },
      '/kucoin-api': {
        target: 'https://api-futures.kucoin.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kucoin-api/, '')
      },
      '/mexc-spot-api': {
        target: 'https://api.mexc.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mexc-spot-api/, '')
      },
      '/kucoin-spot-api': {
        target: 'https://api.kucoin.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kucoin-spot-api/, '')
      },
      '/binance-api': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/binance-api/, '')
      },
      '/binance-fapi': {
        target: 'https://fapi.binance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/binance-fapi/, '')
      },
      '/bybit-api': {
        target: 'https://api.bybit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bybit-api/, '')
      },
      '/bybit-api': {
        target: 'https://api.bybit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bybit-api/, '')
      },
      // ← ДОБАВИТЬ ПОСЛЕ ЭТОГО БЛОКА:
      '/okx-api': {
        target: 'https://www.okx.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/okx-api/, '')
      },
      '/bitget-api': {
        target: 'https://api.bitget.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bitget-api/, '')
      },
    }
  },
})

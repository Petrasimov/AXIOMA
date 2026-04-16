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
    }
  },
})

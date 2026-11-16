import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function quietProxy(ws = false): ProxyOptions {
  return {
    target: 'http://localhost:5000',
    changeOrigin: true,
    ws,
    configure(proxy) {
      const ignore = (error: NodeJS.ErrnoException) => {
        const code = error.code || ''
        if (code === 'ECONNABORTED' || code === 'ECONNRESET' || code === 'EPIPE') return
        console.warn('[vite] proxy', error.message)
      }
      proxy.on('error', ignore)
      proxy.on('proxyReqWs', (_req, _incoming, socket) => {
        socket.on('error', ignore)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': quietProxy(),
      '/socket.io': quietProxy(true),
    },
  },
})

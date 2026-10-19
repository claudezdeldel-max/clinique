import path from "path"
import { existsSync, readFileSync, watchFile, unwatchFile } from 'node:fs'
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const networkConfigPath = process.env.NETWORK_CONFIG_PATH || path.resolve(__dirname, 'server/network-settings.local.json')
const networkPort = existsSync(networkConfigPath) ? Number(JSON.parse(readFileSync(networkConfigPath, 'utf8')).port) : 3001

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'cima-local-network-config',
    configureServer(server) {
      const changed = () => { void server.restart().catch(err => server.config.logger.error(String(err))) }
      watchFile(networkConfigPath, { interval: 1000 }, changed)
      server.httpServer?.once('close', () => unwatchFile(networkConfigPath, changed))
    },
  }],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_BASENAME': JSON.stringify(process.env.VITE_BASENAME || ''),
  },
  server: {
    // The copied Finance document is built alongside the React application.
    host: true,
    // Database, uploads and verification artifacts must not reload an open editor.
    watch: { ignored: ['**/server/**', '**/scratch/**', '**/test-results/**'] },
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || `http://localhost:${process.env.PORT || networkPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: { app: path.resolve(__dirname, 'index.html'), finance: path.resolve(__dirname, 'finance-reference.html') },
    },
  },
})

// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@components": path.resolve(__dirname, "./src/components")
    },
  },
  server: {
    port: 5173,            // o 5174/5175 se usi un’altra porta
    proxy: {
      // instrada queste chiamate al backend Flask
      '/cdrs': 'http://127.0.0.1:8001',
      '/nicknames': 'http://127.0.0.1:8001',
      '/playground': 'http://127.0.0.1:8001',
      '/stats': 'http://127.0.0.1:8001',
      '/canvas': 'http://127.0.0.1:8001',
      '/norme': 'http://127.0.0.1:8001',
      '/weights': 'http://127.0.0.1:8001',
      '/valuta': {
        target: 'http://localhost:8001', // porta del backend Flask
        changeOrigin: true,
      },
      '/valuta/dettaglio': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      
    },
  },
})

import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

// On GitHub Pages we live at /ufrgs-med/ — set VITE_BASE=/ufrgs-med/ at build time.
// Locally (npm run dev / build) base is '/'.
const BASE = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base: BASE,
  plugins: [
    TanStackRouterVite({ routesDirectory: 'src/routes', generatedRouteTree: 'src/routeTree.gen.ts' }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'UFRGS Med',
        short_name: 'UFRGS Med',
        description: 'Estudo dirigido para Medicina UFRGS',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})

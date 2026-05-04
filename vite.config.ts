import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      tailwindcss(), 
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        devOptions: {
          enabled: true
        },
        includeAssets: ['icon.png', 'logo.png', 'apple-touch-icon.png', 'pwa-72x72.png', 'pwa-96x96.png', 'pwa-128x128.png', 'pwa-144x144.png', 'pwa-152x152.png', 'pwa-168x168.png', 'pwa-180x180.png', 'pwa-192x192.png', 'pwa-384x384.png', 'pwa-512x512.png', 'pwa-1024x1024.png'],
        manifest: {
          name: 'FLUX - Sistema de Vendas e Catálogo Online',
          short_name: 'FLUX',
          description: 'FLUX - Sistema de gestão e vendas B2B/B2C',
          theme_color: '#137fec',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          categories: ['business', 'productivity', 'shopping'],
          icons: [
            {
              src: 'icon.png',
              sizes: '16x16 24x24 32x32 48x48 64x64',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-72x72.png',
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-96x96.png',
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-128x128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-144x144.png',
              sizes: '144x144',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-152x152.png',
              sizes: '152x152',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-168x168.png',
              sizes: '168x168',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-180x180.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-384x384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'pwa-1024x1024.png',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          screenshots: [],
          shortcuts: [
            {
              name: 'Painel',
              short_name: 'Painel',
              description: 'Acessar o painel principal',
              url: '/',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
            },
            {
              name: 'Pedidos',
              short_name: 'Pedidos',
              description: 'Ver todos os pedidos',
              url: '/#/orders',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
            }
          ]
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        }
      })
    ],
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true'
    },
    preview: {
      host: true,
      port: 3000,
      strictPort: true
    },
    base: '/',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});

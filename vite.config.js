import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/CheckSheet/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 現場の負担ゼロ：バックグラウンドで自動更新
      includeAssets: ['favicon.ico', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: '測量前チェックシステム',
        short_name: '測量チェック',
        description: '測量現場で手軽に使えるチャット型チェックシート',
        theme_color: '#12b886',
        background_color: '#ebfbee',
        display: 'standalone', // フルスクリーン（ネイティブアプリ表示）
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // オフラインキャッシュの対象
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
}))

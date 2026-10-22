import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createAppVersionDefine } from './config/app-version'

/**
 * ブラウザ単体開発用の Vite 設定。
 * Electronを起動せず、レンダラー（Vue 3アプリ）だけをブラウザで動作確認する。
 * `window.api` 等のElectron専用APIは利用側（platformサービス）が存在チェックして分岐する。
 */
export default defineConfig({
  root: 'src/renderer',
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  define: createAppVersionDefine(),
  plugins: [vue()],
  server: {
    port: 5174
  },
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true
  }
})

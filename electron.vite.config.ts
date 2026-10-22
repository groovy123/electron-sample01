import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { createAppVersionDefine } from './config/app-version'

/**
 * electron-vite の設定。
 * main / preload / renderer の3プロセスをまとめてビルドする。
 */
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    define: createAppVersionDefine(),
    plugins: [vue()]
  }
})

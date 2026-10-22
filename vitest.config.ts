import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { createAppVersionDefine } from './config/app-version'

/**
 * Vitest の設定。
 * レンダラープロセス（Vueコンポーネント・コンポーザブル）のユニットテストを対象とする。
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@renderer': fileURLToPath(new URL('./src/renderer/src', import.meta.url))
    }
  },
  define: createAppVersionDefine(),
  test: {
    environment: 'jsdom',
    // Vuetifyはコンポーネント内でCSSを直接importしているため、
    // Viteの変換パイプラインを通すよう外部化対象から除外する
    server: {
      deps: {
        inline: ['vuetify']
      }
    },
    setupFiles: ['./src/renderer/src/test/setup.ts'],
    include: ['src/renderer/src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/renderer/src/**/*.{ts,vue}'],
      exclude: [
        'src/renderer/src/**/*.spec.ts',
        'src/renderer/src/test/**',
        'src/renderer/src/main.ts',
        'src/renderer/src/env.d.ts',
        'src/renderer/src/router/**',
        'src/renderer/src/plugins/**'
      ]
    }
  }
})

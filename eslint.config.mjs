// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

/**
 * ESLint Flat Config。
 * Vue 3 + TypeScript 用のルールセットを main/preload/renderer すべてに適用する。
 */
export default tseslint.config(
  {
    ignores: ['out/**', 'dist/**', 'dist-web/**', 'dist-electron/**', 'node_modules/**', 'coverage/**', '**/*.d.ts']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue']
      }
    }
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      // 単語1つのコンポーネント名（App, Homeなど）を許可する
      'vue/multi-word-component-names': 'off'
    }
  }
)

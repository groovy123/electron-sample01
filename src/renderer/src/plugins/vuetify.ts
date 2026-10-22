import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

/**
 * アプリ全体で使用する Vuetify インスタンス。
 * UIコンポーネントとテーマを提供する。
 */
export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          background: '#F7F8FA',
          surface: '#FFFFFF',
          primary: '#1976D2'
        }
      }
    }
  }
})

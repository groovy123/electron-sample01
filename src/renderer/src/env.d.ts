/// <reference types="vite/client" />

import type { ElectronAPI } from '@electron-toolkit/preload'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare global {
  interface Window {
    // Electron実行時のみpreloadスクリプトが注入する。
    // ブラウザ単体で開いた場合は存在しないため、利用側は platform サービス経由で
    // 存在チェックしてからアクセスすること。
    electron?: ElectronAPI
    api?: {
      /** メインプロセスからアプリのバージョンを取得する */
      getAppVersion: () => Promise<string>
      /** メインプロセス経由で外部API（イベント一覧）のレスポンスJSONを取得する */
      fetchEvents: (limit: number) => Promise<unknown>
    }
  }

  /** ビルド時に埋め込まれるアプリバージョン（package.jsonのversion）。ブラウザ単体実行時に使用する */
  const __APP_VERSION__: string
}

export {}

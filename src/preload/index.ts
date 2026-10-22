import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * レンダラープロセスへ公開するAPI。
 * メインプロセスとの安全な通信窓口（アプリバージョンの取得など）を提供する。
 */
const api = {
  /**
   * メインプロセスからアプリのバージョンを取得する。
   * @returns アプリバージョン文字列
   */
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),

  /**
   * メインプロセス経由で外部API（イベント一覧）のレスポンスJSONを取得する。
   * @param limit 取得件数
   * @returns レスポンスJSON
   */
  fetchEvents: (limit: number): Promise<unknown> => ipcRenderer.invoke('external-api:fetch-events', limit)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // contextIsolation が無効な場合のフォールバック
  // @ts-expect-error (型定義は renderer 側の env.d.ts で行う)
  window.electron = electronAPI
  // @ts-expect-error (型定義は renderer 側の env.d.ts で行う)
  window.api = api
}

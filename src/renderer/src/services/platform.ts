/**
 * 実行環境（Electron / ブラウザ）の差異を吸収するサービス。
 * レンダラーのコンポーネントがElectron専用APIへ直接依存しないようにするための窓口。
 */

/**
 * Electronのレンダラープロセスとして実行されているかを判定する。
 * preloadスクリプトが `window.api` を注入していることを目印にする。
 * @returns Electron環境であればtrue、ブラウザ単体実行であればfalse
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && typeof window.api !== 'undefined'
}

/**
 * アプリのバージョンを取得する。
 * Electron環境ではメインプロセスからIPC経由で取得し、
 * ブラウザ単体実行時はビルド時に埋め込まれた値（package.jsonのversion）を返す。
 * @returns アプリバージョン文字列
 */
export async function getAppVersion(): Promise<string> {
  if (isElectron()) {
    return window.api!.getAppVersion()
  }
  return __APP_VERSION__
}

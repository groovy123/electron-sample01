import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** package.json の version フィールドの型 */
interface PackageJson {
  version: string
}

/**
 * package.json の version を読み取り、Vite の `define` 用オブジェクトを生成する。
 * レンダラーのビルド時に `__APP_VERSION__` としてソースコードへ埋め込むために使用する
 * （Electron / ブラウザ単体実行の両方の Vite 設定から共通で利用する）。
 * @returns Vite の `define` オプションにそのまま渡せるオブジェクト
 */
export function createAppVersionDefine(): Record<string, string> {
  const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url))
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson
  return { __APP_VERSION__: JSON.stringify(pkg.version) }
}

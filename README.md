# Electron + Vue 3 + TypeScript サンプルアプリ

Electron / Vue.js 3 (Composition API) / TypeScript / Vue Router / Vuetify を使用したサンプルアプリです。

## セットアップ

```bash
npm install
cp .env.example .env
```

## 開発

### Electronアプリとして開発

```bash
npm run dev
```

### ブラウザ単体で開発（Electron不要・高速イテレーション向け）

`src/renderer` は通常のVue 3 + Viteアプリとして構成されているため、Electronを起動せず
ブラウザだけで開発できます。Electron専用API（`window.api` 等）は
[`src/renderer/src/services/platform.ts`](src/renderer/src/services/platform.ts) が
存在チェックして分岐するため、ブラウザで開いても壊れません。

```bash
npm run dev:web
# http://localhost:5174 をブラウザで開く
```

## ビルド

### Electronアプリとしてビルド（main/preload/renderer）

```bash
npm run build
```

### ブラウザ向け静的ファイルとしてビルド

```bash
npm run build:web
# dist-web/ に出力される
npm run preview:web  # ビルド結果をローカルで確認
```

## Lint / 型チェック / テスト

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
```

## E2Eテスト（WebdriverIO + wdio-electron-service）

`e2e/*.e2e.ts` を、ビルド済みの Electron アプリ（`out/main/index.js`）を実際に起動して実行します。

```bash
npm run test:e2e
```

- 実行前に `npm run build` を自動で行います。
- ディスプレイのない環境（CI・SSH）では `xvfb-run -a npm run test:e2e` で実行します。
- root 実行などで Chromium のサンドボックスが使えない場合は `E2E_NO_SANDBOX=1` を付けます。
- 外部APIは `browser.electron.execute` でメインプロセスのIPCハンドラを差し替えており、通信なしで動作します。
- 設定は `wdio.conf.ts` です。

### オフライン環境で実行する（ドライバーの事前配置）

通常は初回実行時に Electron 用の Chromedriver が一時ディレクトリ（`os.tmpdir()` 配下の `chromedriver/`）へ自動ダウンロードされます。
ネットワークが使えない環境では、ドライバーを事前に用意して `CHROMEDRIVER_PATH` で指定するとダウンロードを行いません。

1. ネットワークが使える環境で、使用する Electron と同じバージョン（`node_modules/electron/package.json` の `version`）のドライバーを入手する。
   - 例: `https://github.com/electron/electron/releases/download/v45.0.0/chromedriver-v45.0.0-linux-x64.zip`（OS・CPUに合うものを選ぶ）
   - または、一度E2Eを実行した環境の `C:\Users\<自分の名前>\AppData\Local\Temp\chromedriver` 配下にできたファイルをコピーする。
2. zip を展開した `chromedriver`（Windows は `chromedriver.exe`）を、オフライン環境の任意の場所へ置き、実行権限を付ける。
3. パスを指定して実行する。

```bash
CHROMEDRIVER_PATH=/opt/drivers/chromedriver xvfb-run -a npm run test:e2e
```

- Electron のバージョンを上げたときは、ドライバーも同じバージョンに入れ替えてください（バージョンが合わないと起動に失敗します）。
- キャッシュ先を変えたい場合は `WEBDRIVER_CACHE_DIR` を指定します。

## Git hooks（Husky + lint-staged）

このリポジトリをgit管理下に置く場合、`npm install` 実行時に `prepare` スクリプトが
Husky のフックを自動セットアップします（コミット前に `lint-staged` でステージ済みファイルをLintします）。

## 構成

```
src/
├── main/        # Electron メインプロセス
├── preload/     # プリロードスクリプト（contextBridge経由のAPI公開）
└── renderer/    # Vue 3 アプリ本体
    └── src/
        ├── composables/  # Composition API のロジック
        ├── plugins/      # Vuetify などのプラグイン初期化
        ├── router/       # Vue Router 定義
        ├── services/     # Electron / ブラウザ差異を吸収するサービス層
        ├── test/         # Vitest セットアップ
        └── views/        # 画面コンポーネント
```

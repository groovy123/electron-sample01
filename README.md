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

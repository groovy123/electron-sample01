# Development GuideLines


## 基本的なルール
- NEVER: パスワードやAPIキーをハードコーディングしない

- YOU MUST: 日本語でやり取りすること


## 技術スタック
- **言語**: Vue.js 3 (Composition API), Typescript, Vue Router, Electron
- **CSS**: Vuetify
- **主要ツール**: npm (パッケージ管理), ESLint (リント・フォーマット), Vitest, Vue Test Utils
- **パッケージ管理**: npm
- **リンター/フォーマッター**: ESLint (Flat Config: `eslint.config.mjs`)
- **テストフレームワーク**: Vitest, Vue Test Utils, vitest/ui, vitest/coverage-v8
- **自動化**: Husky, lint-staged, GitHub Actions


## Core Development Rules
1.  パッケージ管理
    - `npm`のみを使用する

2. コード品質
   - すべてのコードに型ヒントを必須とする
   - パブリックAPIには必ずドキュメンテーション文字列（docstring）を付ける
   - 関数は集中して小さく保つこと
   - 既存のパターンを正確に踏襲すること
   - コードを変更した際はESLintを実行してエラーがない状態にする

3. テスト要件
   - カバレッジはエッジケースやエラーも含めてテストすること
   - 新機能には必ずテストを追加すること
   - バグ修正にはユニットテストを追加すること
   - コードを変更した際はVitestを実行してエラーがない状態にする

4. 環境変数
   - @.envファイルから対象のものを使用すること


## Vitest 3と関連パッケージ
```bash
# Vitest 3 と関連パッケージ
npm install -D vitest@latest @vue/test-utils@latest jsdom @vitest/ui happy-dom

# カバレッジ取得用
npm install -D @vitest/coverage-v8
```

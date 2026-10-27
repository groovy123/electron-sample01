import type { Options } from '@wdio/types'

/**
 * WebdriverIO の設定（Electron アプリのE2Eテスト用）。
 * `npm run build` で生成した out/main/index.js を wdio-electron-service で起動する。
 * root 実行など Chromium のサンドボックスが使えない環境向けに、E2E_NO_SANDBOX=1 で --no-sandbox を付ける。
 */
export const config: Options.Testrunner & { capabilities: WebdriverIO.Capabilities[] } = {
  runner: 'local',
  specs: ['./e2e/**/*.e2e.ts'],
  maxInstances: 1,
  capabilities: [
    {
      browserName: 'electron',
      'wdio:electronServiceOptions': {
        appEntryPoint: './out/main/index.js',
        appArgs: process.env.E2E_NO_SANDBOX ? ['--no-sandbox'] : []
      }
    }
  ],
  services: ['electron'],
  framework: 'mocha',
  reporters: ['spec'],
  logLevel: 'warn',
  mochaOpts: { ui: 'bdd', timeout: 60000 }
}

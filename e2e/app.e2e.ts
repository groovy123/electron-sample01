import { $, browser, expect } from '@wdio/globals'

/** サイドメニューの項目を押して画面を切り替える */
async function openMenu(title: string): Promise<void> {
  await $(`//a[.//*[normalize-space()="${title}"]]`).click()
}

/**
 * ページングの「次へ」を押す。ライセンスキー未設定（評価版）では透かしがボタンに重なりクリックできないため、
 * DOM のクリックを直接発火する。
 */
async function clickNextPage(): Promise<void> {
  await browser.execute(() => document.querySelector<HTMLElement>('.facility-grid [data-ref="btNext"]')?.click())
}

describe('Electron アプリ', () => {
  it('ウィンドウが表示され、ホーム画面が開く', async () => {
    await expect(browser).toHaveTitle(expect.stringContaining('Electron'))
    await expect($('.v-navigation-drawer')).toBeDisplayed()
  })

  it('メインプロセスのAPIでアプリ名を取得できる', async () => {
    const name = await browser.electron.execute((electron) => electron.app.getName())
    expect(name).toBeTruthy()
  })

  it('サイドメニューからイベント一覧（AG Grid）へ遷移し、サイドバーが表示される', async () => {
    await openMenu('イベント一覧（AG Grid）')
    await expect($('h1')).toHaveText('イベント一覧（AG Grid）')
    await expect($('.ag-root-wrapper')).toBeDisplayed()
    await expect($('.ag-side-bar')).toBeDisplayed()
  })

  it('取得ボタンでイベントを取得してAG Gridに表示する（外部APIはスタブ）', async () => {
    await browser.electron.execute((electron) => {
      electron.ipcMain.removeHandler('external-api:fetch-events')
      electron.ipcMain.handle('external-api:fetch-events', () => [
        [{ ID: { 識別値: 'E2E-1' }, 名称: [{ 表記: 'E2Eテストイベント' }] }],
        {}
      ])
    })
    await $('button.fetch-events').click()
    const cell = $('.ag-row[row-index="0"] .ag-cell[col-id="イベント名"]')
    await cell.waitForDisplayed()
    await expect(cell).toHaveText('E2Eテストイベント')
  })

  it('行をダブルクリックするとイベント詳細画面へ遷移する', async () => {
    await $('.ag-row[row-index="0"] .ag-cell[col-id="イベント名"]').doubleClick()
    await browser.waitUntil(async () => (await browser.getUrl()).endsWith('#/events/0'))
  })

  it('公共施設一覧は1ページ20件でページングして表示する（外部APIはスタブ）', async () => {
    await browser.electron.execute((electron) => {
      electron.ipcMain.removeHandler('external-api:fetch-facilities')
      electron.ipcMain.handle('external-api:fetch-facilities', () => [
        Array.from({ length: 45 }, (_, i) => ({ ID: { 識別値: String(i) }, 名称: { 表記: `施設${i}` } })),
        {}
      ])
    })
    await openMenu('公共施設一覧')
    await expect($('h1')).toHaveText('公共施設一覧')
    await $('button.fetch-facilities').click()
    await expect($('.facility-count')).toHaveText('全45件')
    await expect($('.facility-grid .ag-side-bar')).toBeDisplayed()
    await expect($('.facility-grid .ag-grid-pinned-bottom-rows-container .ag-row')).toExist()
    const summary = $('.facility-grid .ag-paging-row-summary-panel')
    await expect(summary).toHaveText('1 to 20 of 45')
    await clickNextPage()
    await expect(summary).toHaveText('21 to 40 of 45')
    await clickNextPage()
    await expect(summary).toHaveText('41 to 45 of 45')
    // 合計行のセルが列幅からはみ出さない（はみ出すと右寄せの数字が切れる）
    const widths = await browser.execute(() => {
      const grid = document.querySelector('.facility-grid')!
      const width = (selector: string): number => grid.querySelector(selector)!.getBoundingClientRect().width
      return [
        width('.ag-grid-pinned-bottom-rows-container .ag-cell[col-id="施設名"]'),
        width('.ag-row[row-index="40"] .ag-cell[col-id="施設名"]')
      ]
    })
    expect(widths[0]).toBe(widths[1])
    // 合計行は最終ページでも固定表示される
    await expect($('.facility-grid .ag-grid-pinned-bottom-rows-container .ag-row')).toExist()
  })
})

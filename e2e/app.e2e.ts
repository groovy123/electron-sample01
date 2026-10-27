import { $, browser, expect } from '@wdio/globals'

/** サイドメニューの項目を押して画面を切り替える */
async function openMenu(title: string): Promise<void> {
  await $(`//a[.//*[normalize-space()="${title}"]]`).click()
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
    const cell = $('.ag-cell[col-id="イベント名"]')
    await cell.waitForDisplayed()
    await expect(cell).toHaveText('E2Eテストイベント')
  })

  it('行をダブルクリックするとイベント詳細画面へ遷移する', async () => {
    await $('.ag-cell[col-id="イベント名"]').doubleClick()
    await browser.waitUntil(async () => (await browser.getUrl()).endsWith('#/events/0'))
  })
})

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

/** イベント一覧API（東京都）のURL */
const EVENT_API_URL = 'https://api.data.metro.tokyo.lg.jp/v1/Event'

/**
 * イベント一覧APIからデータを取得する（CORSの影響を受けないようメインプロセスで実行する）。
 * @param _event IPCイベント
 * @param limit 取得件数
 * @returns レスポンスJSON
 * @throws 件数が不正な場合・HTTPエラー時
 */
async function fetchEvents(_event: unknown, limit: number): Promise<unknown> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('取得件数が不正です')
  const res = await fetch(`${EVENT_API_URL}?limit=${limit}`)
  if (!res.ok) throw new Error(`外部APIの取得に失敗しました (HTTP ${res.status})`)
  return res.json()
}

/**
 * メインウィンドウを生成する。
 * @returns 作成した BrowserWindow インスタンス
 */
function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

void app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.example.electron-vue-ts-sample')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // レンダラーからアプリのバージョンを取得するためのIPCハンドラ
  ipcMain.handle('app:get-version', () => app.getVersion())

  ipcMain.handle('external-api:fetch-events', fetchEvents)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

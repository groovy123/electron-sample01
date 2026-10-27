import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

/** 東京都オープンデータAPIのベースURL */
const TOKYO_API_BASE_URL = 'https://api.data.metro.tokyo.lg.jp/v1'
/** イベント一覧API（東京都）のURL */
const EVENT_API_URL = `${TOKYO_API_BASE_URL}/Event`
/** 公共施設一覧API（東京都）のURL */
const FACILITY_API_URL = `${TOKYO_API_BASE_URL}/PublicFacility`
/** 公共施設一覧の取得件数（APIの上限。全件を1回で取得する） */
const FACILITY_FETCH_LIMIT = 1000

/**
 * 外部APIからデータを取得する（CORSの影響を受けないようメインプロセスで実行する）。
 * @param baseUrl APIのURL
 * @param limit 取得件数
 * @returns レスポンスJSON
 * @throws 件数が不正な場合・HTTPエラー時
 */
async function fetchApi(baseUrl: string, limit: number): Promise<unknown> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('取得件数が不正です')
  const res = await fetch(`${baseUrl}?limit=${limit}`)
  if (!res.ok) throw new Error(`外部APIの取得に失敗しました (HTTP ${res.status})`)
  return res.json()
}

/**
 * イベント一覧APIからデータを取得する。
 * @param _event IPCイベント
 * @param limit 取得件数
 * @returns レスポンスJSON
 */
function fetchEvents(_event: unknown, limit: number): Promise<unknown> {
  return fetchApi(EVENT_API_URL, limit)
}

/**
 * 公共施設一覧APIから全件のデータを取得する。
 * @returns レスポンスJSON
 */
function fetchFacilities(): Promise<unknown> {
  return fetchApi(FACILITY_API_URL, FACILITY_FETCH_LIMIT)
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
  ipcMain.handle('external-api:fetch-facilities', fetchFacilities)

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

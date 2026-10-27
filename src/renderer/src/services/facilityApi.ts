/**
 * 外部API（東京都 公共施設一覧）の取得とAG Grid用データへの変換。
 */
import { isElectron } from './platform'

/** 公共施設一覧APIのURL */
export const FACILITY_API_URL = 'https://api.data.metro.tokyo.lg.jp/v1/PublicFacility'

/** 取得件数（APIの上限。全件を1回で取得し、画面側でページングする） */
export const FACILITY_FETCH_LIMIT = 1000

/** 1ページに表示する件数 */
export const FACILITY_PAGE_SIZE = 20

/**
 * 公共施設一覧APIのURLを作る。
 * @returns 取得件数を付与したURL文字列
 */
export function buildFacilityUrl(): string {
  return `${FACILITY_API_URL}?limit=${FACILITY_FETCH_LIMIT}`
}

/** APIが返す1件分の公共施設データ（必要な項目のみ型付けする） */
export interface FacilityRecord {
  ID?: { 識別値?: string }
  名称?: { 表記?: string; カナ表記?: string }
  住所?: { 表記?: string; 郵便番号?: string }
  連絡先?: { 電話番号?: string }
  利用可能時間?: { 開始時間?: string; 終了時間?: string; 種別?: string }
  設備?: { バリアフリー?: string }
  アクセス?: { 備考?: string }
  説明?: string[]
  備考?: string
}

/** 表示する列の定義（列名・幅と、施設から表示値を取り出す関数） */
export const FACILITY_COLUMNS: readonly { name: string; width: number; pick: (f: FacilityRecord) => string | undefined }[] = [
  { name: 'ID', width: 120, pick: (f) => f.ID?.識別値 },
  { name: '施設名', width: 240, pick: (f) => f.名称?.表記 },
  { name: 'カナ', width: 260, pick: (f) => f.名称?.カナ表記 },
  { name: '郵便番号', width: 110, pick: (f) => f.住所?.郵便番号 },
  { name: '住所', width: 280, pick: (f) => f.住所?.表記 },
  { name: '電話番号', width: 130, pick: (f) => f.連絡先?.電話番号 },
  { name: '利用可能時間', width: 150, pick: openingHours },
  { name: '利用可能日', width: 130, pick: (f) => f.利用可能時間?.種別 },
  { name: 'アクセス', width: 360, pick: (f) => f.アクセス?.備考 },
  { name: '説明', width: 360, pick: (f) => f.説明?.find((t) => t.trim()) }
]

/**
 * 利用可能時間を「開始〜終了」の形式にする（どちらも空なら undefined）。
 * @param f 施設データ
 * @returns 利用可能時間の表示文字列
 */
function openingHours(f: FacilityRecord): string | undefined {
  const { 開始時間: from, 終了時間: to } = f.利用可能時間 ?? {}
  return from || to ? `${from ?? ''}〜${to ?? ''}` : undefined
}

/**
 * APIのレスポンスから施設配列を取り出す。
 * レスポンスは `[施設配列, ページ情報]` の形式。
 * @param json レスポンスJSON
 * @returns 施設配列
 * @throws 形式が想定外の場合
 */
export function extractFacilities(json: unknown): FacilityRecord[] {
  const facilities = Array.isArray(json) ? json[0] : undefined
  if (!Array.isArray(facilities)) throw new Error('外部APIのレスポンス形式が不正です')
  return facilities as FacilityRecord[]
}

/**
 * 公共施設一覧を全件取得する。
 * Electron ではメインプロセス経由（CORS回避）、ブラウザ単体では直接 fetch する。
 * @returns 施設データの配列
 * @throws 通信失敗・HTTPエラー・形式不正の場合
 */
export async function fetchFacilities(): Promise<FacilityRecord[]> {
  if (isElectron()) return extractFacilities(await window.api!.fetchFacilities())
  const res = await fetch(buildFacilityUrl())
  if (!res.ok) throw new Error(`外部APIの取得に失敗しました (HTTP ${res.status})`)
  return extractFacilities(await res.json())
}

/**
 * 施設データをグリッドの行（列定義と同じ並びの文字列配列）に変換する。
 * @param records 施設データ
 * @returns 行ごとの文字列配列
 */
export function toFacilityRows(records: readonly FacilityRecord[]): string[][] {
  return records.map((rec) => FACILITY_COLUMNS.map(({ pick }) => (pick(rec) ?? '').trim()))
}

/** 来場者数を表示する月（2026年1月〜6月）の列名 */
export const VISITOR_COLUMNS: readonly string[] = ['2026/1', '2026/2', '2026/3', '2026/4', '2026/5', '2026/6'].map(
  (month) => `${month}来場者数`
)

/** 来場者数の最大値（この値以下のランダムな整数を作る） */
export const VISITOR_MAX = 9999

/**
 * 月ごとの来場者数をランダムに作る（APIに来場者数のデータがないためのダミー値）。
 * @param random 0以上1未満の乱数を返す関数（テストで差し替える）
 * @returns 来場者数の列名をキーにした数値（0〜VISITOR_MAX）
 */
export function randomVisitors(random: () => number = Math.random): Record<string, number> {
  return Object.fromEntries(VISITOR_COLUMNS.map((name) => [name, Math.floor(random() * (VISITOR_MAX + 1))]))
}

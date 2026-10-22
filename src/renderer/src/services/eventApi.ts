/**
 * 外部API（東京都 イベント一覧）の取得とExcelGrid用データへの変換。
 */
import { isElectron } from './platform'
import type { ColumnDefinition } from '../composables/useExcelGrid'

/** イベント一覧APIのURL（取得件数は limit で指定する） */
export const EVENT_API_BASE_URL = 'https://api.data.metro.tokyo.lg.jp/v1/Event'

/** 取得件数の選択肢 */
export const EVENT_LIMIT_OPTIONS: readonly number[] = [5, 10, 20, 50, 100]

/** 取得件数の初期値 */
export const DEFAULT_EVENT_LIMIT = 10

/**
 * 取得件数を指定したイベント一覧APIのURLを作る。
 * @param limit 取得件数
 * @returns URL文字列
 */
export function buildEventUrl(limit: number): string {
  return `${EVENT_API_BASE_URL}?limit=${limit}`
}

/** APIが返す1件分のイベントデータ（必要な項目のみ型付けする） */
export interface EventRecord {
  名称?: { 表記?: string }[]
  ID?: { 識別値?: string }
  説明?: string
  期間?: { 開始日?: string; 終了日?: string; 開始時間?: string; 終了時間?: string; 説明?: string }
  料金?: { 金額?: { 数値?: string }; 説明?: string }
  人数?: string
  開催場所?: {
    表記?: string
    住所?: { 表記?: string; 郵便番号?: string }
    アクセス?: { 備考?: string }
    地理座標?: { 緯度?: string; 経度?: string }
  }
  連絡先?: { 表記?: string; 電話番号?: string }
}

/** 表示する列の定義（グリッド上の列定義と、イベントから表示値を取り出す関数） */
export const EVENT_COLUMNS: readonly { column: ColumnDefinition; pick: (e: EventRecord) => string | undefined }[] = [
  { column: { name: 'ID', type: 'string', width: 110 }, pick: (e) => e.ID?.識別値 },
  { column: { name: 'イベント名', type: 'string', width: 320 }, pick: eventName },
  { column: { name: '開始日', type: 'string', width: 110 }, pick: (e) => e.期間?.開始日 },
  { column: { name: '終了日', type: 'string', width: 110 }, pick: (e) => e.期間?.終了日 },
  { column: { name: '開始時間', type: 'string', width: 90 }, pick: (e) => e.期間?.開始時間 },
  { column: { name: '終了時間', type: 'string', width: 90 }, pick: (e) => e.期間?.終了時間 },
  { column: { name: '開催場所', type: 'string', width: 240 }, pick: (e) => e.開催場所?.表記 },
  { column: { name: '住所', type: 'string', width: 260 }, pick: (e) => e.開催場所?.住所?.表記 },
  { column: { name: '人数', type: 'string', width: 70 }, pick: (e) => e.人数 },
  { column: { name: '料金', type: 'string', width: 90 }, pick: (e) => e.料金?.金額?.数値 },
  { column: { name: '連絡先', type: 'string', width: 300 }, pick: (e) => e.連絡先?.表記 },
  { column: { name: '電話番号', type: 'string', width: 120 }, pick: (e) => e.連絡先?.電話番号 }
]

/**
 * イベント名を取り出す（英語名など空の表記を除いた最初の表記）。
 * @param e イベントデータ
 * @returns イベント名。なければ undefined
 */
function eventName(e: EventRecord): string | undefined {
  return e.名称?.find((n) => n.表記)?.表記
}

/**
 * APIのレスポンスからイベント配列を取り出す。
 * レスポンスは `[イベント配列, ページ情報]` の形式。
 * @param json レスポンスJSON
 * @returns イベント配列
 * @throws 形式が想定外の場合
 */
export function extractEvents(json: unknown): EventRecord[] {
  const events = Array.isArray(json) ? json[0] : undefined
  if (!Array.isArray(events)) throw new Error('外部APIのレスポンス形式が不正です')
  return events as EventRecord[]
}

/**
 * IDが空のイベントを表示対象から除く。
 * @param records イベントデータ
 * @returns IDのあるイベントのみの配列
 */
export function excludeEmptyId(records: readonly EventRecord[]): EventRecord[] {
  return records.filter((e) => (e.ID?.識別値 ?? '').trim() !== '')
}

/**
 * イベント一覧を取得する。IDが空のデータは除く。
 * Electron ではメインプロセス経由（CORS回避）、ブラウザ単体では直接 fetch する。
 * @param limit 取得件数
 * @returns イベントデータの配列
 * @throws 通信失敗・HTTPエラー・形式不正の場合
 */
export async function fetchEvents(limit: number = DEFAULT_EVENT_LIMIT): Promise<EventRecord[]> {
  if (isElectron()) return excludeEmptyId(extractEvents(await window.api!.fetchEvents(limit)))
  const res = await fetch(buildEventUrl(limit))
  if (!res.ok) throw new Error(`外部APIの取得に失敗しました (HTTP ${res.status})`)
  return excludeEmptyId(extractEvents(await res.json()))
}

/**
 * イベントデータをExcelGridの初期値（列定義と同じ並びの文字列配列）に変換する。
 * @param records イベントデータ
 * @returns 行ごとの文字列配列
 */
export function toEventGridData(records: readonly EventRecord[]): string[][] {
  return records.map((rec) => EVENT_COLUMNS.map(({ pick }) => (pick(rec) ?? '').trim()))
}

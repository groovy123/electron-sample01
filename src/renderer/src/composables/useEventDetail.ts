import type { EventRecord } from '../services/eventApi'
import type { PropertyRow, PropertyType } from './usePropertyGrid'

/** 詳細画面の1項目の定義 */
interface EventField {
  key: string
  type: PropertyType
  /** 編集可否（省略時は編集可） */
  editable?: boolean
  /** イベントから値を取り出すオブジェクト内のパス */
  path: readonly string[]
}

/** 詳細画面のカテゴリ（1カード＝1カテゴリ） */
export interface EventCategory {
  title: string
  fields: readonly EventField[]
}

/** 詳細画面のカテゴリ定義 */
export const EVENT_CATEGORIES: readonly EventCategory[] = [
  {
    title: '基本情報',
    fields: [
      { key: 'ID', type: 'string', editable: false, path: ['ID', '識別値'] },
      { key: 'イベント名', type: 'string', path: ['名称', '*', '表記'] },
      { key: '説明', type: 'string', path: ['説明'] },
      { key: '人数', type: 'number', path: ['人数'] }
    ]
  },
  {
    title: '期間',
    fields: [
      { key: '開始日', type: 'date', path: ['期間', '開始日'] },
      { key: '終了日', type: 'date', path: ['期間', '終了日'] },
      { key: '開始時間', type: 'string', path: ['期間', '開始時間'] },
      { key: '終了時間', type: 'string', path: ['期間', '終了時間'] },
      { key: '期間の説明', type: 'string', path: ['期間', '説明'] }
    ]
  },
  {
    title: '開催場所',
    fields: [
      { key: '開催場所', type: 'string', path: ['開催場所', '表記'] },
      { key: '郵便番号', type: 'string', path: ['開催場所', '住所', '郵便番号'] },
      { key: '住所', type: 'string', path: ['開催場所', '住所', '表記'] },
      { key: 'アクセス', type: 'string', path: ['開催場所', 'アクセス', '備考'] },
      { key: '緯度', type: 'number', path: ['開催場所', '地理座標', '緯度'] },
      { key: '経度', type: 'number', path: ['開催場所', '地理座標', '経度'] }
    ]
  },
  {
    title: '料金・連絡先',
    fields: [
      { key: '料金', type: 'string', path: ['料金', '金額', '数値'] },
      { key: '料金の説明', type: 'string', path: ['料金', '説明'] },
      { key: '連絡先', type: 'string', path: ['連絡先', '表記'] },
      { key: '電話番号', type: 'string', path: ['連絡先', '電話番号'] }
    ]
  }
]

type Node = Record<string, unknown>

/**
 * パスの '*' を実際のキーに解決する。名称は配列なので、空でない最初の表記の添字（なければ末尾）を使う。
 * @param record イベント
 * @param path 元のパス
 * @returns 解決後のパス
 */
function resolvePath(record: EventRecord, path: readonly string[]): string[] {
  return path.map((p) => {
    if (p !== '*') return p
    const names = record.名称 ?? []
    const i = names.findIndex((n) => n.表記)
    return String(i >= 0 ? i : names.length)
  })
}

/**
 * パスの位置の値を文字列で取り出す。
 * @param record イベント
 * @param path パス
 * @returns 値（なければ空文字）
 */
function getValue(record: EventRecord, path: readonly string[]): string {
  let cur: unknown = record
  for (const p of resolvePath(record, path)) {
    if (cur == null || typeof cur !== 'object') return ''
    cur = (cur as Node)[p]
  }
  return typeof cur === 'string' || typeof cur === 'number' ? String(cur) : ''
}

/**
 * パスの位置に値を設定する。途中のオブジェクトがなければ作る。
 * @param record イベント（直接書き換える）
 * @param path パス
 * @param value 設定する値
 */
function setValue(record: EventRecord, path: readonly string[], value: string): void {
  const keys = resolvePath(record, path)
  let cur = record as unknown as Node
  keys.slice(0, -1).forEach((k, i) => {
    cur[k] ??= /^\d+$/.test(keys[i + 1]) ? [] : {}
    cur = cur[k] as Node
  })
  cur[keys[keys.length - 1]] = value
}

/**
 * カテゴリの項目をPropertyGridの行に変換する。
 * @param record イベント
 * @param category カテゴリ
 * @returns PropertyGridの行
 */
export function eventToPropertyRows(record: EventRecord, category: EventCategory): PropertyRow[] {
  return category.fields.map((f) => ({ key: f.key, type: f.type, value: getValue(record, f.path), editable: f.editable !== false }))
}

/**
 * PropertyGridでの変更をイベントに反映する。
 * @param record イベント（直接書き換える）
 * @param category 変更のあったカテゴリ
 * @param index カテゴリ内の行インデックス
 * @param value 新しい値
 */
export function applyEventChange(record: EventRecord, category: EventCategory, index: number, value: string): void {
  const field = category.fields[index]
  if (field && field.editable !== false) setValue(record, field.path, value)
}

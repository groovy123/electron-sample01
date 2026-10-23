import type { ColumnDefinition } from './useExcelGrid'
import type { PropertyRow, PropertyType } from './usePropertyGrid'

/** サンプル画面で共通の列定義（ソート・フィルタは含めない） */
export const SAMPLE_COLUMNS: readonly ColumnDefinition[] = [
  { name: '名前(文字列)', type: 'string', width: 140 },
  { name: '数量(数値)', type: 'number', width: 110 },
  { name: '期限(日付)', type: 'date', width: 140 },
  { name: '状態(選択)', type: 'string', width: 120, options: ['未着手', '進行中', '完了'] },
  { name: '確認済(スイッチ)', type: 'boolean', width: 130 }
]

/** サンプル画面で共通の初期データ（列定義と同じ並び） */
export const SAMPLE_DATA: readonly (readonly string[])[] = [
  ['りんご', '120', '2026-11-01', '未着手', 'true'],
  ['みかん', '35.5', '2026-10-15', '進行中', 'false'],
  ['ぶどう', '-8', '2026-12-24', '完了', 'true'],
  ['もも', '0', '2027-01-05', '進行中', 'false'],
  ['メロン', '9', '2026-09-30', '完了', 'true']
]

/**
 * 列定義をPropertyGridの行の型に変換する（選択肢のある列はセレクト）。
 * @param column 列定義
 * @returns PropertyGridの行の型
 */
function toPropertyType(column: ColumnDefinition): PropertyType {
  return column.options ? 'select' : column.type
}

/**
 * サンプルの1レコードをPropertyGridの行に変換する。
 * @param record 列定義と同じ並びの値
 * @returns PropertyGridの行（毎回新しいオブジェクト）
 */
export function toPropertyRows(record: readonly string[]): PropertyRow[] {
  return SAMPLE_COLUMNS.map((column, i) => ({
    key: column.name,
    type: toPropertyType(column),
    value: record[i] ?? '',
    ...(column.options ? { options: [...column.options] } : {})
  }))
}

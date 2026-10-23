/** ExcelGridサンプルでON/OFFできる機能 */
export interface SampleOptions {
  readonly: boolean
  allowAddRow: boolean
  allowExport: boolean
  sortable: boolean
  filterable: boolean
  highlight: boolean
}

/** サンプル画面で使えるUIライブラリ */
export type UiLibrary = 'vuetify' | 'element'

/** チェックボックスの定義（キー・表示ラベル） */
export const SAMPLE_OPTION_ITEMS: readonly { key: keyof SampleOptions; label: string }[] = [
  { key: 'readonly', label: '読み取り専用 (readonly)' },
  { key: 'allowAddRow', label: '行追加ボタン (allowAddRow)' },
  { key: 'allowExport', label: 'Excel出力・コピー (allowExport)' },
  { key: 'sortable', label: 'ソート (sortable)' },
  { key: 'filterable', label: 'フィルタ (filterable)' },
  { key: 'highlight', label: 'セルの強調 (changedCells)' }
]

/**
 * 初期状態のオプションを返す。
 * @returns 既定のオプション
 */
export function defaultSampleOptions(): SampleOptions {
  return { readonly: false, allowAddRow: true, allowExport: true, sortable: true, filterable: true, highlight: false }
}

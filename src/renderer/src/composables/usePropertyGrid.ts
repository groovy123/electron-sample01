/** PropertyGridの値の型 */
export type PropertyType = 'string' | 'number' | 'select' | 'date' | 'boolean'

/** PropertyGridの1行 */
export interface PropertyRow {
  /** キー（項目名） */
  key: string
  /** 値の型 */
  type: PropertyType
  /** 値（boolean は 'true' / 'false'、空はOFF扱い） */
  value: string
  /** セレクトの選択肢 */
  options?: string[]
  /** 編集可否（省略時は編集可） */
  editable?: boolean
}

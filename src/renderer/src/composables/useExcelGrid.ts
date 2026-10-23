import { computed, ref, type ComputedRef, type Ref } from 'vue'

/** 選択中のセル位置 */
export interface CellPosition {
  row: number
  col: number
}

/** 列に指定できる型（文字列・数値のみ・日付・ON/OFF） */
export type ColumnType = 'string' | 'number' | 'date' | 'boolean'

/** セルの表示位置 */
export type ColumnAlign = 'left' | 'center' | 'right'

/** ON/OFF列でONを表す値（OFFは 'false' または空） */
export const BOOLEAN_TRUE = 'true'
/** ON/OFF列でOFFを表す値 */
export const BOOLEAN_FALSE = 'false'

/** グリッド初期化時に指定する列定義 */
export interface ColumnDefinition {
  /** 列名（ヘッダーに表示） */
  name: string
  /** 列の型 */
  type: ColumnType
  /** 初期幅(px)。省略時は既定値、最小幅未満は最小幅に丸める */
  width?: number
  /** セルの表示位置。省略時は数値列が右寄せ、ON/OFF列が中央、それ以外は左寄せ */
  align?: ColumnAlign
  /** 選択肢。指定した列はセレクトボックスになり、選択肢以外の値は入力できない */
  options?: string[]
  /** ソート可能か（省略時は不可。可の列はヘッダーにソートボタンを表示する） */
  sortable?: boolean
  /** フィルタ可能か（省略時は不可。可の列はヘッダー下にフィルタ入力欄を表示する） */
  filterable?: boolean
}

/** 列幅の既定値(px) */
export const DEFAULT_COLUMN_WIDTH = 96
/** 列幅の最小値(px) */
export const MIN_COLUMN_WIDTH = 40

/**
 * 入力途中を含め、その型として入力してよい値か判定する。
 * @param type 列の型
 * @param value 判定する値
 * @returns 許可される値なら true
 */
export function isValidInput(type: ColumnType, value: string): boolean {
  if (value === '' || type === 'string') return true
  if (type === 'boolean') return value === BOOLEAN_TRUE || value === BOOLEAN_FALSE
  if (type === 'number') return /^-?\d*\.?\d*$/.test(value)
  return /^\d{0,4}(-\d{0,2}(-\d{0,2})?)?$/.test(value)
}

/**
 * 確定してよい完全な値か判定する（空は常に可）。
 * @param type 列の型
 * @param value 判定する値
 * @returns 完全な値なら true
 */
export function isValidValue(type: ColumnType, value: string): boolean {
  if (value === '' || type === 'string') return true
  if (type === 'boolean') return value === BOOLEAN_TRUE || value === BOOLEAN_FALSE
  if (type === 'number') return /^-?(\d+\.?\d*|\.\d+)$/.test(value)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

/** ソート方向 */
export type SortDirection = 'asc' | 'desc'

/** 現在のソート状態 */
export interface SortState {
  col: number
  direction: SortDirection
}

/** useExcelGrid が返す状態と操作 */
export interface UseExcelGridReturn {
  /** セルの値（rows × cols の2次元配列） */
  cells: Ref<string[][]>
  /** 列名 */
  columnNames: Ref<string[]>
  /** 列ごとの型 */
  columnTypes: Ref<ColumnType[]>
  /** 列ごとの選択肢（選択式でない列は null） */
  columnOptions: Ref<(string[] | null)[]>
  /** 列ごとの表示位置 */
  columnAligns: Ref<ColumnAlign[]>
  /** 列ごとの幅(px) */
  columnWidths: Ref<number[]>
  /** 列幅を変更する（最小幅未満は最小幅に丸める） */
  setColumnWidth: (col: number, width: number) => void
  /** 選択中のセル（未選択は null） */
  selected: Ref<CellPosition | null>
  /** セルの値を更新する（列の型に合わない値は拒否して false を返す） */
  setCell: (row: number, col: number, value: string) => boolean
  /** 行ごとの元の行番号（初期表示・追加順の通し番号。ソートしても行に付いて動く） */
  rowIds: Ref<number[]>
  /** 列ごとにソート可能か */
  columnSortable: Ref<boolean[]>
  /** 現在のソート状態（未ソートは null） */
  sortState: Ref<SortState | null>
  /** 列のソートを切り替える（昇順→降順→元の順）。ソート不可の列は無視する */
  toggleSort: (col: number) => void
  /** 列ごとにフィルタ可能か */
  columnFilterable: Ref<boolean[]>
  /** 列ごとのフィルタ文字列（空は絞り込みなし） */
  filters: Ref<string[]>
  /** 列のフィルタ文字列を設定する（フィルタ不可の列は無視。選択は解除する） */
  setFilter: (col: number, value: string) => void
  /** フィルタに一致する行のインデックス（cells 上の位置。昇順） */
  visibleRows: ComputedRef<number[]>
  /** 行を末尾に追加する */
  addRow: () => void
  /** セルを選択する */
  select: (row: number, col: number) => void
  /** 選択を移動する（範囲外は無視） */
  move: (dRow: number, dCol: number) => void
}

/**
 * 列の表示位置を決める（指定がなければ型に応じた既定値）。
 * @param column 列定義
 * @returns 表示位置
 */
export function resolveAlign(column: ColumnDefinition): ColumnAlign {
  if (column.align) return column.align
  if (column.type === 'number') return 'right'
  return column.type === 'boolean' ? 'center' : 'left'
}

/**
 * 列番号をExcel形式の列名に変換する（0→A, 25→Z, 26→AA）。
 * @param index 0始まりの列番号
 * @returns 列名
 */
export function columnLabel(index: number): string {
  let n = index + 1
  let label = ''
  while (n > 0) {
    const r = (n - 1) % 26
    label = String.fromCharCode(65 + r) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

/**
 * 空文字で埋めた2次元配列を生成する。
 * @param rows 行数
 * @param cols 列数
 * @returns 空のセル配列
 */
export function createEmptyCells(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''))
}

/**
 * Excelグリッド画面用の状態管理コンポーザブル。
 * @param columns 列定義（名前・型・初期幅）
 * @param rows 初期行数（初期データがこれを超える場合は初期データの行数に拡張する）
 * @param initialData 初期値（行ごとの文字列配列。足りない列は空、はみ出す列は無視する）
 * @returns セル・選択状態と操作
 */
export function useExcelGrid(columns: readonly ColumnDefinition[], rows = 20, initialData: readonly (readonly string[])[] = []): UseExcelGridReturn {
  const cols = columns.length
  const cells = ref<string[][]>(createEmptyCells(Math.max(rows, initialData.length), cols))
  initialData.forEach((record, r) => {
    for (let c = 0; c < cols; c++) cells.value[r][c] = record[c] ?? ''
  })
  const columnNames = ref<string[]>(columns.map((c) => c.name))
  const columnTypes = ref<ColumnType[]>(columns.map((c) => c.type))
  const columnOptions = ref<(string[] | null)[]>(columns.map((c) => c.options ?? null))
  const columnAligns = ref<ColumnAlign[]>(columns.map(resolveAlign))
  const columnWidths = ref<number[]>(
    columns.map((c) => (c.width !== undefined && Number.isFinite(c.width) ? Math.max(MIN_COLUMN_WIDTH, Math.round(c.width)) : DEFAULT_COLUMN_WIDTH))
  )
  const columnSortable = ref<boolean[]>(columns.map((c) => c.sortable === true))
  const rowIds = ref<number[]>(cells.value.map((_, i) => i))
  const sortState = ref<SortState | null>(null)
  const columnFilterable = ref<boolean[]>(columns.map((c) => c.filterable === true))
  const filters = ref<string[]>(columns.map(() => ''))
  const visibleRows = computed<number[]>(() => {
    const active = filters.value.map((f) => f.trim().toLowerCase())
    const rowsOut: number[] = []
    cells.value.forEach((row, r) => {
      if (active.every((f, c) => f === '' || row[c].toLowerCase().includes(f))) rowsOut.push(r)
    })
    return rowsOut
  })
  const selected = ref<CellPosition | null>(null)

  const inRange = (row: number, col: number): boolean =>
    row >= 0 && row < cells.value.length && col >= 0 && col < cols

  const setCell = (row: number, col: number, value: string): boolean => {
    if (!inRange(row, col) || !isValidInput(columnTypes.value[col], value)) return false
    const options = columnOptions.value[col]
    if (options && value !== '' && !options.includes(value)) return false
    cells.value[row][col] = value
    return true
  }

  const setColumnWidth = (col: number, width: number): void => {
    if (col < 0 || col >= columnWidths.value.length || !Number.isFinite(width)) return
    columnWidths.value[col] = Math.max(MIN_COLUMN_WIDTH, Math.round(width))
  }

  const addRow = (): void => {
    cells.value.push(Array.from({ length: cols }, () => ''))
    rowIds.value.push(rowIds.value.length)
  }

  /** 型に応じた比較（空は方向に関わらず末尾にするため呼び出し側で扱う） */
  const compare = (col: number, a: string, b: string): number =>
    columnTypes.value[col] === 'number' ? Number(a) - Number(b) : a.localeCompare(b, 'ja')

  const toggleSort = (col: number): void => {
    if (!columnSortable.value[col]) return
    const cur = sortState.value
    const next: SortState | null =
      cur?.col !== col ? { col, direction: 'asc' } : cur.direction === 'asc' ? { col, direction: 'desc' } : null
    const order = cells.value.map((_, i) => i)
    order.sort((x, y) => {
      if (!next) return rowIds.value[x] - rowIds.value[y]
      const [a, b] = [cells.value[x][col], cells.value[y][col]]
      if (a === '' || b === '') return a === b ? x - y : a === '' ? 1 : -1
      return (next.direction === 'asc' ? 1 : -1) * compare(col, a, b) || x - y
    })
    cells.value = order.map((i) => cells.value[i])
    rowIds.value = order.map((i) => rowIds.value[i])
    sortState.value = next
    selected.value = null
  }

  const select = (row: number, col: number): void => {
    if (inRange(row, col)) selected.value = { row, col }
  }

  const setFilter = (col: number, value: string): void => {
    if (!columnFilterable.value[col]) return
    filters.value[col] = value
    selected.value = null
  }

  const move = (dRow: number, dCol: number): void => {
    const visible = visibleRows.value
    const cur = selected.value ?? { row: visible[0] ?? 0, col: 0 }
    const pos = visible.indexOf(cur.row) + dRow
    if (pos < 0 || pos >= visible.length) return
    select(visible[pos], cur.col + dCol)
  }

  return { cells, rowIds, columnFilterable, filters, setFilter, visibleRows, columnSortable, sortState, toggleSort, columnNames, columnTypes, columnOptions, columnAligns, columnWidths, setColumnWidth, selected, setCell, addRow, select, move }
}

<script setup lang="ts">
/**
 * Excelグリッドコンポーネント。
 * 列名と行番号を持つ編集可能な表を表示し、矢印キー・Enterでセル移動できる。
 * フォーカス中のセルは色が変わり、ダブルクリック・F2・直接入力で編集モードになる。
 * 列の名前・型(文字列・数値・日付)・初期幅は初期化時に columns で指定し、
 * その型に合わない値は入力できない（画面上で型は変更できない）。
 * 列定義に options を指定した列はセレクトボックスで選択する。
 * 日付型の列はカレンダー(日付ピッカー)で選択する。
 * 「Excelダウンロード」「コピー」ボタンで、フィルタ・ソート後に表示中の内容を出力できる。
 */
import { computed, nextTick, ref } from 'vue'
import { DEFAULT_COLUMN_WIDTH, isValidValue, useExcelGrid, type ColumnDefinition } from '../composables/useExcelGrid'
import { copyTable, downloadXlsx, type GridTable } from '../services/gridExport'

const props = withDefaults(defineProps<{
  /** 列定義（名前・型・初期幅） */
  columns: ColumnDefinition[]
  /** 初期行数 */
  rows?: number
  /** 初期値（行ごとの文字列配列） */
  initialData?: string[][]
  /** 「行を追加」ボタンを表示するか */
  allowAddRow?: boolean
  /** true の場合、すべてのセルを編集不可にする（選択・移動のみ可能） */
  readonly?: boolean
  /** 背景色で強調するセル（行・列の並びは initialData と同じ。範囲外は強調なし） */
  changedCells?: boolean[][]
  /** 「Excelダウンロード」「コピー」ボタンを表示するか */
  allowExport?: boolean
  /** ダウンロードするExcelの拡張子を除いたファイル名 */
  fileName?: string
}>(), { rows: 20, initialData: () => [], allowAddRow: true, readonly: false, changedCells: () => [], allowExport: true, fileName: 'excel-grid' })

const emit = defineEmits<{
  /** セルがダブルクリックされたとき（行インデックス。0始まり） */
  rowDblclick: [row: number]
}>()

const root = ref<HTMLElement | null>(null)

/**
 * セルが強調対象か判定する。
 * @param row 行番号
 * @param col 列番号
 * @returns 強調対象なら true
 */
function isChanged(row: number, col: number): boolean {
  return props.changedCells[rowIds.value[row]]?.[col] === true
}

/**
 * 列のソートを切り替える。編集中の内容は確定してから並べ替える。
 * @param col 列番号
 */
function toggleSort(col: number): void {
  stopEdit()
  toggleColumnSort(col)
}

/** 出力対象の表（ヘッダーと、フィルタ・ソート後に表示中の行） */
const exportTable = computed<GridTable>(() => ({
  headers: columnNames.value,
  types: columnTypes.value,
  rows: visibleRows.value.map((r) => cells.value[r])
}))
/** 出力操作の結果メッセージ */
const exportMessage = ref('')

/**
 * Excelファイルとしてダウンロードする。
 */
async function onDownload(): Promise<void> {
  try {
    await downloadXlsx(exportTable.value, props.fileName)
    exportMessage.value = 'Excelをダウンロードしました'
  } catch {
    exportMessage.value = 'Excelのダウンロードに失敗しました'
  }
}

/**
 * 表示中の内容をタブ区切りでクリップボードにコピーする。
 */
async function onCopy(): Promise<void> {
  try {
    await copyTable(exportTable.value)
    exportMessage.value = 'クリップボードにコピーしました'
  } catch {
    exportMessage.value = 'コピーに失敗しました'
  }
}

/**
 * 列のフィルタ入力を反映する。編集中の内容は確定してから絞り込む。
 * @param col 列番号
 * @param e 入力イベント
 */
function onFilter(col: number, e: Event): void {
  stopEdit()
  setFilter(col, (e.target as HTMLInputElement).value)
}

/**
 * 列のソートボタンのアイコンを返す。
 * @param col 列番号
 * @returns mdi アイコン名
 */
function sortIcon(col: number): string {
  if (sortState.value?.col !== col) return 'mdi-sort'
  return sortState.value.direction === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'
}
const { cells, rowIds, columnFilterable, filters, setFilter, visibleRows, columnSortable, sortState, toggleSort: toggleColumnSort, columnNames, columnTypes, columnOptions, columnWidths, setColumnWidth, selected, setCell, addRow, select, move } = useExcelGrid(props.columns, props.rows, props.initialData)
/** 編集中のセル位置と編集開始時の値（未編集は null） */
const editing = ref<{ row: number; col: number; original: string } | null>(null)

/**
 * 指定セルが編集中か判定する。
 * @param row 行番号
 * @param col 列番号
 * @returns 編集中なら true
 */
function isEditing(row: number, col: number): boolean {
  return editing.value?.row === row && editing.value?.col === col
}

/**
 * セルを編集モードにする。
 * @param row 行番号
 * @param col 列番号
 * @param e 発生元のイベント(入力欄にフォーカスを移すために使用)
 */
async function startEdit(row: number, col: number, e: Event): Promise<void> {
  emit('rowDblclick', rowIds.value[row])
  if (props.readonly) return
  const input = e.target as HTMLInputElement
  editing.value = { row, col, original: cells.value[row][col] }
  await nextTick()
  input.focus()
  input.select()
}

/**
 * 編集モードを終了する。
 * @param cancel true の場合は編集開始時の値に戻す
 */
function stopEdit(cancel = false): void {
  const cur = editing.value
  if (!cur) return
  if (cancel || !isValidValue(columnTypes.value[cur.col], cells.value[cur.row][cur.col])) {
    setCell(cur.row, cur.col, cur.original)
  }
  editing.value = null
}

/**
 * 非編集中の文字入力で編集を開始し、セルの内容を入力文字で置き換える。
 * @param row 行番号
 * @param col 列番号
 * @param e 発生元のキーボードイベント
 */
function startTyping(row: number, col: number, e: KeyboardEvent): void {
  const input = e.target as HTMLInputElement
  editing.value = { row, col, original: cells.value[row][col] }
  input.readOnly = false
  input.value = ''
  setCell(row, col, '')
}

/**
 * 通常の文字入力(IME含む)か判定する。
 * @param e キーボードイベント
 * @returns 文字入力なら true
 */
function isTypingKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  return e.key.length === 1 || e.key === 'Process'
}

/**
 * 選択位置の入力欄へフォーカスを移す。
 */
async function focusSelected(): Promise<void> {
  await nextTick()
  const el = root.value?.querySelector<HTMLElement>('.excel-cell.selected')
  el?.focus()
}

/**
 * キー入力に応じてセルを移動する。
 * @param e キーボードイベント
 */
async function onKeydown(e: KeyboardEvent): Promise<void> {
  const pos = selected.value
  if (editing.value) {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault()
      stopEdit(e.key === 'Escape')
      if (e.key === 'Enter') move(1, 0)
      await focusSelected()
    }
    return
  }
  if (props.readonly && (e.key === 'F2' || e.key === ' ' || e.key === 'Delete' || e.key === 'Backspace')) {
    e.preventDefault()
    return
  }
  if (e.key === 'F2' && pos && !columnOptions.value[pos.col]) {
    e.preventDefault()
    await startEdit(pos.row, pos.col, e)
    return
  }
  if ((e.key === 'F2' || e.key === ' ') && pos && (columnOptions.value[pos.col] || columnTypes.value[pos.col] === 'date')) {
    e.preventDefault()
    ;(e.target as HTMLSelectElement | HTMLInputElement).showPicker?.()
    return
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && pos && columnTypes.value[pos.col] === 'date') {
    e.preventDefault()
    setCell(pos.row, pos.col, '')
    return
  }
  const delta: Record<string, [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    Enter: [1, 0]
  }
  const d = delta[e.key]
  if (!d) {
    if (pos && !columnOptions.value[pos.col] && columnTypes.value[pos.col] !== 'date' && !props.readonly && isTypingKey(e)) startTyping(pos.row, pos.col, e)
    return
  }
  e.preventDefault()
  move(d[0], d[1])
  await focusSelected()
}

/**
 * セルの入力値を反映する。
 * @param row 行番号
 * @param col 列番号
 * @param e 入力イベント
 */
function onInput(row: number, col: number, e: Event): void {
  const input = e.target as HTMLInputElement
  if (!setCell(row, col, input.value)) input.value = cells.value[row][col]
}

/**
 * セレクトボックスの選択値を反映する。
 * @param row 行番号
 * @param col 列番号
 * @param e change イベント
 */
function onSelect(row: number, col: number, e: Event): void {
  const select = e.target as HTMLSelectElement
  if (!setCell(row, col, select.value)) select.value = cells.value[row][col]
}

/**
 * カレンダーで選択した日付を反映する。
 * @param row 行番号
 * @param col 列番号
 * @param e change イベント
 */
function onDate(row: number, col: number, e: Event): void {
  const input = e.target as HTMLInputElement
  if (!setCell(row, col, input.value)) input.value = cells.value[row][col]
}

/** 行番号列の幅(px) */
const ROW_HEADER_WIDTH = 40

/**
 * 列幅のドラッグ変更を開始する。
 * @param col 列番号
 * @param e ハンドルの mousedown イベント
 */
function startResize(col: number, e: MouseEvent): void {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = columnWidths.value[col] ?? DEFAULT_COLUMN_WIDTH
  const onMove = (ev: MouseEvent): void => setColumnWidth(col, startWidth + ev.clientX - startX)
  const onUp = (): void => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

/**
 * ハンドルのダブルクリックで列幅を既定値に戻す。
 * @param col 列番号
 */
function resetWidth(col: number): void {
  setColumnWidth(col, DEFAULT_COLUMN_WIDTH)
}
</script>

<template>
  <div
    ref="root"
    class="excel-grid-root"
  >
    <div
      v-if="allowAddRow || allowExport"
      class="d-flex align-center ga-2 mb-2"
    >
      <v-btn
        v-if="allowAddRow"
        class="add-row"
        size="small"
        prepend-icon="mdi-table-row-plus-after"
        @click="addRow"
      >
        行を追加
      </v-btn>
      <template v-if="allowExport">
        <v-btn
          class="download-xlsx"
          size="small"
          prepend-icon="mdi-file-excel"
          @click="onDownload"
        >
          Excelダウンロード
        </v-btn>
        <v-btn
          class="copy-table"
          size="small"
          prepend-icon="mdi-content-copy"
          @click="onCopy"
        >
          コピー
        </v-btn>
        <span
          v-if="exportMessage"
          class="export-message text-caption"
          role="status"
        >
          {{ exportMessage }}
        </span>
      </template>
    </div>
    <div class="excel-wrapper">
      <table
        class="excel-grid"
        :style="{ width: `${ROW_HEADER_WIDTH + columnWidths.reduce((a, b) => a + b, 0)}px` }"
      >
        <colgroup>
          <col :style="{ width: `${ROW_HEADER_WIDTH}px` }">
          <col
            v-for="(w, c) in columnWidths"
            :key="c"
            :style="{ width: `${w}px` }"
          >
        </colgroup>
        <thead>
          <tr>
            <th class="corner" />
            <th
              v-for="(name, c) in columnNames"
              :key="c"
              class="col-header"
            >
              <span class="col-label">{{ name }}</span>
              <button
                v-if="columnSortable[c]"
                type="button"
                class="sort-btn"
                :class="{ active: sortState?.col === c }"
                :aria-label="`${name}を並べ替え`"
                @click="toggleSort(c)"
              >
                <v-icon
                  :icon="sortIcon(c)"
                  size="small"
                />
              </button>
              <span
                class="resize-handle"
                role="separator"
                :aria-label="`${columnNames[c]}列の幅を変更`"
                @mousedown="startResize(c, $event)"
                @dblclick="resetWidth(c)"
              />
            </th>
          </tr>
          <tr v-if="columnFilterable.some(Boolean)">
            <th class="corner filter-corner" />
            <th
              v-for="(name, c) in columnNames"
              :key="c"
              class="filter-cell"
            >
              <input
                v-if="columnFilterable[c]"
                type="search"
                class="filter-input"
                :value="filters[c]"
                :aria-label="`${name}のフィルタ`"
                placeholder="フィルタ"
                @input="onFilter(c, $event)"
              >
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in visibleRows"
            :key="r"
          >
            <th
              class="row-header"
              :class="{ changed: changedCells[rowIds[r]]?.some(Boolean) }"
            >
              {{ r + 1 }}
            </th>
            <td
              v-for="(value, c) in cells[r]"
              :key="c"
            >
              <select
                v-if="columnOptions[c]"
                class="excel-cell"
                :class="{ selected: selected?.row === r && selected?.col === c, changed: isChanged(r, c) }"
                :value="value"
                :disabled="readonly"
                :aria-label="`${columnNames[c]}${r + 1}`"
                @focus="select(r, c)"
                @change="onSelect(r, c, $event)"
                @keydown="onKeydown"
              >
                <option value="" />
                <option
                  v-for="opt in columnOptions[c]"
                  :key="opt"
                  :value="opt"
                >
                  {{ opt }}
                </option>
              </select>
              <input
                v-else-if="columnTypes[c] === 'date'"
                type="date"
                class="excel-cell"
                :class="{ selected: selected?.row === r && selected?.col === c, changed: isChanged(r, c) }"
                :value="value"
                :readonly="readonly"
                :aria-label="`${columnNames[c]}${r + 1}`"
                @focus="select(r, c)"
                @change="onDate(r, c, $event)"
                @keydown="onKeydown"
              >
              <input
                v-else
                class="excel-cell"
                :class="{ selected: selected?.row === r && selected?.col === c, editing: isEditing(r, c), changed: isChanged(r, c) }"
                :value="value"
                :readonly="!isEditing(r, c)"
                :aria-label="`${columnNames[c]}${r + 1}`"
                @focus="select(r, c)"
                @dblclick="startEdit(r, c, $event)"
                @blur="stopEdit()"
                @input="onInput(r, c, $event)"
                @keydown="onKeydown"
              >
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-if="visibleRows.length === 0 && cells.length > 0"
        class="no-match"
      >
        条件に一致するデータがありません。
      </p>
    </div>
  </div>
</template>

<style scoped>
.excel-wrapper {
  overflow: auto;
  max-height: calc(100vh - 180px);
  border: 1px solid #d0d0d0;
}
.excel-grid {
  border-collapse: collapse;
  table-layout: fixed;
}
.excel-grid th,
.excel-grid td {
  border: 1px solid #d0d0d0;
  padding: 0;
}
.col-header,
.row-header,
.corner {
  background: #f3f3f3;
  color: #555;
  font-weight: 500;
  text-align: center;
  user-select: none;
}
.col-header {
  position: sticky;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  top: 0;
  z-index: 1;
}
.col-header {
  height: 28px;
}
.filter-cell {
  position: sticky;
  top: 28px;
  z-index: 1;
  background: #f3f3f3;
  padding: 2px 4px !important;
}
.filter-corner {
  top: 28px;
}
.filter-input {
  width: 100%;
  height: 24px;
  padding: 0 6px;
  font-weight: 400;
  background: #fff;
  border: 1px solid #d0d0d0;
  outline: none;
}
.filter-input:focus {
  border-color: #1976d2;
}
.no-match {
  padding: 8px;
  color: #777;
}
.sort-btn {
  margin-left: 4px;
  vertical-align: middle;
  opacity: 0.5;
}
.sort-btn:hover,
.sort-btn.active {
  opacity: 1;
}
.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
}
.resize-handle:hover {
  background: #1976d2;
}
.row-header {
  position: sticky;
  left: 0;
  z-index: 1;
}
.corner {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 2;
}
.excel-cell {
  width: 100%;
  height: 28px;
  padding: 0 6px;
  outline: none;
  background: transparent;
  cursor: cell;
}
.excel-cell.selected {
  background: #e3f2fd;
  outline: 2px solid #1976d2;
  outline-offset: -2px;
}
.excel-cell.changed,
.excel-cell.changed.selected {
  background: var(--changed-bg);
}
.row-header.changed {
  background: var(--changed-row-header-bg);
  color: var(--changed-row-header-color);
}
.excel-cell.editing {
  background: #fff;
  cursor: text;
  outline-color: #ef6c00;
}
</style>

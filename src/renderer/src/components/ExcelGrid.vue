<script setup lang="ts">
/**
 * Excelグリッドコンポーネント。
 * 列名と行番号を持つ編集可能な表を表示し、矢印キー・Enterでセル移動できる。
 * フォーカス中のセルは色が変わり、ダブルクリック・F2・直接入力で編集モードになる。
 * 列の名前・型(文字列・数値・日付)・初期幅は初期化時に columns で指定し、
 * その型に合わない値は入力できない（画面上で型は変更できない）。
 * 列定義に options を指定した列はオートコンプリート(v-autocomplete)で選択する。
 * 数値型の列は v-number-input（既定で右寄せ）、ON/OFF型(boolean)の列は v-switch で入力する。
 * 日付型の列はカレンダー(日付ピッカー)で選択する。
 * 「Excelダウンロード」「コピー」ボタンで、フィルタ・ソート後に表示中の内容を出力できる。
 */
import { computed, nextTick, ref } from 'vue'
import { BOOLEAN_FALSE, BOOLEAN_TRUE, DEFAULT_COLUMN_WIDTH, isValidValue, useExcelGrid, type ColumnDefinition } from '../composables/useExcelGrid'
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
  rows: visibleRows.value.map((r) => cells.value[r].map((v, c) => (columnTypes.value[c] === 'boolean' && v === '' ? BOOLEAN_FALSE : v)))
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
const { cells, rowIds, columnFilterable, filters, setFilter, visibleRows, columnSortable, sortState, toggleSort: toggleColumnSort, columnNames, columnTypes, columnOptions, columnAligns, columnWidths, setColumnWidth, selected, setCell, addRow, select, move } = useExcelGrid(props.columns, props.rows, props.initialData)
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
 * イベント発生元から、セル内の入力欄を取得する（Vuetify部品は内側の input）。
 * @param target イベントの発生元
 * @returns 入力欄（見つからなければ null）
 */
function inputOf(target: EventTarget | null): HTMLInputElement | null {
  const el = target as HTMLElement | null
  if (el?.matches('input')) return el as HTMLInputElement
  return el?.closest('.excel-cell')?.querySelector('input') ?? null
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
  const input = inputOf(e.target)
  editing.value = { row, col, original: cells.value[row][col] }
  await nextTick()
  input?.focus()
  input?.select()
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
  const input = inputOf(e.target)
  editing.value = { row, col, original: cells.value[row][col] }
  if (input) {
    input.readOnly = false
    input.value = ''
  }
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
  const target = el?.matches('input,select') ? el : el?.querySelector<HTMLElement>('input')
  target?.focus()
}

/** キーと移動量（行, 列）の対応 */
const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  Enter: [1, 0]
}

/**
 * 移動キーならセルを移動する。
 * @param e キーボードイベント
 * @returns 移動キーとして処理したら true
 */
async function navigate(e: KeyboardEvent): Promise<boolean> {
  const d = MOVE_KEYS[e.key]
  if (!d) return false
  e.preventDefault()
  move(d[0], d[1])
  await focusSelected()
  return true
}

/**
 * 文字入力で直接編集する列(選択式でない文字列・数値)か判定する。
 * @param col 列番号
 * @returns 直接編集する列なら true
 */
function isTextual(col: number): boolean {
  return !columnOptions.value[col] && (columnTypes.value[col] === 'string' || columnTypes.value[col] === 'number')
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
  if (e.key === 'F2' && pos && columnTypes.value[pos.col] !== 'boolean') {
    e.preventDefault()
    await startEdit(pos.row, pos.col, e)
    return
  }
  if (e.key === ' ' && pos && columnTypes.value[pos.col] === 'date') {
    e.preventDefault()
    ;(e.target as HTMLInputElement).showPicker?.()
    return
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && pos && ['date', 'boolean'].includes(columnTypes.value[pos.col])) {
    e.preventDefault()
    setCell(pos.row, pos.col, columnTypes.value[pos.col] === 'boolean' ? BOOLEAN_FALSE : '')
    return
  }
  if (await navigate(e)) return
  if (pos && isTextual(pos.col) && !props.readonly && isTypingKey(e)) startTyping(pos.row, pos.col, e)
}

/**
 * 数値セルのキー入力を先に処理する。
 * 非編集中の上下キーは v-number-input の増減ではなくセル移動にする。
 * @param e キーボードイベント
 */
function onNumberKeydown(e: KeyboardEvent): void {
  if (editing.value || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
  e.stopImmediatePropagation()
  void onKeydown(e)
}

/** メニューを開いている選択セルの位置（なければ null） */
const openMenu = ref<{ row: number; col: number } | null>(null)

/**
 * 選択セルのメニュー開閉状態を判定する。
 * @param row 行番号
 * @param col 列番号
 * @returns 開いていれば true
 */
function isMenuOpen(row: number, col: number): boolean {
  return openMenu.value?.row === row && openMenu.value?.col === col
}

/**
 * 選択セルのメニュー開閉を記録する。
 * @param row 行番号
 * @param col 列番号
 * @param open 開いたら true
 */
function setMenu(row: number, col: number, open: boolean): void {
  if (open) openMenu.value = { row, col }
  else if (isMenuOpen(row, col)) openMenu.value = null
}

/**
 * 選択セルのキー入力を先に処理する。
 * メニューが閉じている間は移動キーでセルを移動し、F2・Spaceでメニューを開く。
 * メニュー表示中と文字入力(絞り込み)は v-autocomplete に任せる。
 * @param row 行番号
 * @param col 列番号
 * @param e キーボードイベント
 */
async function onPickerKeydown(row: number, col: number, e: KeyboardEvent): Promise<void> {
  if (isMenuOpen(row, col)) return
  const clear = e.key === 'Delete' || e.key === 'Backspace'
  if (!(e.key in MOVE_KEYS) && e.key !== 'F2' && e.key !== ' ' && !clear) return
  e.stopImmediatePropagation()
  if (e.key in MOVE_KEYS) {
    await navigate(e)
    return
  }
  e.preventDefault()
  if (props.readonly) return
  if (clear) setCell(row, col, '')
  else openMenu.value = { row, col }
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
 * 数値入力の値を反映する。
 * @param row 行番号
 * @param col 列番号
 * @param value 入力された数値（空は null）
 */
function onNumber(row: number, col: number, value: number | null): void {
  setCell(row, col, value === null ? '' : String(value))
}

/**
 * オートコンプリートの選択値を反映する。
 * @param row 行番号
 * @param col 列番号
 * @param value 選択された値（未選択は null）
 */
function onPick(row: number, col: number, value: string | null): void {
  if (props.readonly) return
  setCell(row, col, value ?? '')
}

/**
 * スイッチの切り替えを反映する。
 * @param row 行番号
 * @param col 列番号
 * @param value ONなら true
 */
function onSwitch(row: number, col: number, value: boolean | null): void {
  if (props.readonly) return
  setCell(row, col, value ? BOOLEAN_TRUE : BOOLEAN_FALSE)
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
              <v-autocomplete
                v-if="columnOptions[c]"
                class="excel-cell excel-picker"
                :class="[`align-${columnAligns[c]}`, { selected: selected?.row === r && selected?.col === c, changed: isChanged(r, c) }]"
                :model-value="value || null"
                :items="columnOptions[c] ?? []"
                :menu="isMenuOpen(r, c)"
                :readonly="readonly"
                :aria-label="`${columnNames[c]}${r + 1}`"
                variant="plain"
                density="compact"
                single-line
                hide-details
                hide-no-data
                auto-select-first
                :clearable="!readonly"
                @focus="select(r, c)"
                @update:menu="setMenu(r, c, $event)"
                @update:model-value="onPick(r, c, $event)"
                @keydown.capture="onPickerKeydown(r, c, $event)"
                @dblclick="emit('rowDblclick', rowIds[r])"
              />
              <v-switch
                v-else-if="columnTypes[c] === 'boolean'"
                class="excel-cell excel-switch"
                :class="[`align-${columnAligns[c]}`, { selected: selected?.row === r && selected?.col === c, changed: isChanged(r, c) }]"
                :model-value="value === BOOLEAN_TRUE"
                :readonly="readonly"
                :aria-label="`${columnNames[c]}${r + 1}`"
                color="primary"
                density="compact"
                hide-details
                @focus="select(r, c)"
                @update:model-value="onSwitch(r, c, $event)"
                @keydown="onKeydown"
                @dblclick="emit('rowDblclick', rowIds[r])"
              />
              <v-number-input
                v-else-if="columnTypes[c] === 'number'"
                class="excel-cell excel-number"
                :class="[`align-${columnAligns[c]}`, { selected: selected?.row === r && selected?.col === c, editing: isEditing(r, c), changed: isChanged(r, c) }]"
                :model-value="value === '' ? null : Number(value)"
                :readonly="!isEditing(r, c)"
                :precision="null"
                :aria-label="`${columnNames[c]}${r + 1}`"
                control-variant="hidden"
                variant="plain"
                density="compact"
                single-line
                hide-details
                @focus="select(r, c)"
                @update:model-value="onNumber(r, c, $event)"
                @dblclick="startEdit(r, c, $event)"
                @blur="stopEdit()"
                @keydown.capture="onNumberKeydown"
                @keydown="onKeydown"
              />
              <input
                v-else-if="columnTypes[c] === 'date'"
                type="date"
                class="excel-cell"
                :class="{ selected: selected?.row === r && selected?.col === c, changed: isChanged(r, c) }"
                :style="{ textAlign: columnAligns[c] }"
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
                :style="{ textAlign: columnAligns[c] }"
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
/* 色・フォントは Vuetify のテーマ変数に合わせる（テーマ変更・ダークテーマに追従する） */
.excel-grid-root {
  --grid-border: rgba(var(--v-border-color), var(--v-border-opacity));
  --grid-header-bg: rgba(var(--v-theme-on-surface), 0.04);
  --grid-header-color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  font-size: 0.875rem;
}
.excel-wrapper {
  overflow: auto;
  max-height: calc(100vh - 180px);
  border: 1px solid var(--grid-border);
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
}
.excel-grid {
  border-collapse: collapse;
  table-layout: fixed;
}
.excel-grid th,
.excel-grid td {
  border: 1px solid var(--grid-border);
  padding: 0;
}
.col-header,
.row-header,
.corner {
  background: rgb(var(--v-theme-surface));
  background-image: linear-gradient(var(--grid-header-bg), var(--grid-header-bg));
  color: var(--grid-header-color);
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
  background: rgb(var(--v-theme-surface));
  background-image: linear-gradient(var(--grid-header-bg), var(--grid-header-bg));
  padding: 2px 4px !important;
}
.filter-corner {
  top: 28px;
}
.filter-input {
  width: 100%;
  height: 24px;
  padding: 0 6px;
  font: inherit;
  font-weight: 400;
  color: inherit;
  background: rgb(var(--v-theme-surface));
  border: 1px solid var(--grid-border);
  border-radius: 4px;
  outline: none;
}
.filter-input:focus {
  border-color: rgb(var(--v-theme-primary));
}
.no-match {
  padding: 8px;
  color: var(--grid-header-color);
}
.sort-btn {
  margin-left: 4px;
  vertical-align: middle;
  opacity: 0.5;
}
.sort-btn:hover,
.sort-btn.active {
  opacity: 1;
  color: rgb(var(--v-theme-primary));
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
  background: rgb(var(--v-theme-primary));
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
  font: inherit;
  color: inherit;
  outline: none;
  background: transparent;
  cursor: cell;
}
.excel-cell.selected {
  background: rgba(var(--v-theme-primary), 0.12);
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
.excel-cell.changed,
.excel-cell.changed.selected {
  background: var(--changed-bg);
  color: #212121;
}
.row-header.changed {
  background: var(--changed-row-header-bg);
  color: var(--changed-row-header-color);
}
.excel-cell.editing {
  background: rgb(var(--v-theme-surface));
  cursor: text;
  outline-color: rgb(var(--v-theme-warning));
}
.excel-cell:disabled {
  opacity: var(--v-disabled-opacity);
}
/* Vuetify部品のセルは高さ・余白をセルに合わせて詰める */
.excel-cell.v-input {
  --v-input-control-height: 28px;
  --v-input-padding-top: 0;
  --v-field-padding-top: 0;
  --v-field-padding-bottom: 0;
  --v-field-input-padding-top: 0;
  --v-field-input-padding-bottom: 0;
  --v-field-padding-start: 6px;
  --v-field-padding-end: 6px;
  height: 28px;
  cursor: cell;
}
.excel-cell.v-input.align-left {
  text-align: left;
}
.excel-cell.v-input.align-center {
  text-align: center;
}
.excel-cell.v-input.align-right {
  text-align: right;
}
.excel-cell.v-input :deep(.v-field__input) {
  min-height: 28px;
  padding: 0 !important;
  text-align: inherit;
}
.excel-cell.v-input :deep(input) {
  text-align: inherit;
}
.excel-cell.v-input :deep(.v-input__control),
.excel-cell.v-input :deep(.v-field) {
  height: 28px;
}
.excel-cell.excel-picker :deep(.v-field__append-inner),
.excel-cell.excel-picker :deep(.v-field__clearable) {
  padding: 0;
  align-items: center;
}
.excel-cell.excel-switch :deep(.v-selection-control) {
  min-height: 28px;
  height: 28px;
}
.excel-cell.excel-switch :deep(.v-input__control) {
  height: 28px;
  justify-content: center;
}
.excel-cell.excel-switch.align-left :deep(.v-selection-control) {
  justify-content: flex-start;
  padding-left: 6px;
}
.excel-cell.excel-switch.align-center :deep(.v-selection-control) {
  justify-content: center;
}
.excel-cell.excel-switch.align-right :deep(.v-selection-control) {
  justify-content: flex-end;
  padding-right: 6px;
}
.excel-cell.excel-number.editing :deep(.v-field) {
  background: rgb(var(--v-theme-surface));
}
</style>

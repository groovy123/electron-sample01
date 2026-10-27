<script setup lang="ts">
/**
 * イベント一覧画面（AG Grid Enterprise版）。
 * イベント一覧画面と同じ仕様で、取得件数を選んで「取得」ボタンを押すと東京都のイベント一覧APIから
 * データを取得して表示する。全列をソート・フィルタでき、行のダブルクリックで詳細画面へ遷移する。
 * 詳細画面で編集したセルは黄色で強調する。Excel出力はAG Grid Enterpriseの機能を使う。
 */
import { computed, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { AgGridVue } from 'ag-grid-vue3'
import type { CellClassParams, ColDef, GridApi, GridReadyEvent, RowDoubleClickedEvent } from 'ag-grid-community'
import { useEventStore } from '../composables/useEventStore'
import {
  buildEventUrl,
  DEFAULT_EVENT_LIMIT,
  EVENT_COLUMNS,
  EVENT_LIMIT_OPTIONS,
  EVENT_NUMERIC_COLUMNS,
  fetchEvents,
  toEventGridData,
  toNumberOrZero
} from '../services/eventApi'

/** グリッドの1行分（indexはストア上の元の位置。並べ替えても詳細画面で正しい行を開くために持つ） */
interface EventRow {
  index: number
  cells: string[]
}

const router = useRouter()
const { events, originals, setEvents } = useEventStore()
const gridApi = shallowRef<GridApi<EventRow>>()
const limit = ref(DEFAULT_EVENT_LIMIT)
const loading = ref(false)
const error = ref('')

/** 詳細画面から戻ったときも前回の取得結果を表示する */
const rowData = computed<EventRow[]>(() => toEventGridData(events.value).map((cells, index) => ({ index, cells })))
/** 取得時点から値が変わったセル（詳細画面で編集した箇所） */
const changedCells = computed(() => {
  const before = toEventGridData(originals.value)
  return toEventGridData(events.value).map((row, r) => row.map((v, c) => v !== before[r]?.[c]))
})
/** 取得に使うURL（選択中の件数を反映） */
const url = computed(() => buildEventUrl(limit.value))

/** 数値列（人数・料金）用の列定義。空欄は 0 として扱い、合計・平均なども選べる */
const NUMERIC_COL_DEF: ColDef<EventRow> = {
  type: 'numericColumn',
  filter: 'agNumberColumnFilter',
  defaultAggFunc: 'sum',
  allowedAggFuncs: ['sum', 'avg', 'min', 'max', 'count']
}

/** 全列をソート・フィルタ可能にした列定義（人数・料金は数値列） */
const columnDefs: ColDef<EventRow>[] = EVENT_COLUMNS.map(({ column }, i) => {
  const numeric = EVENT_NUMERIC_COLUMNS.includes(column.name)
  return {
    headerName: column.name,
    colId: column.name,
    width: column.width,
    valueGetter: (p) => {
      const text = p.data?.cells[i] ?? ''
      return numeric ? toNumberOrZero(text) : text
    },
    filter: 'agSetColumnFilter',
    ...(numeric ? NUMERIC_COL_DEF : {}),
    cellClassRules: { changed: (p: CellClassParams<EventRow>) => !!p.data && !!changedCells.value[p.data.index]?.[i] }
  }
})

/**
 * 全列共通の設定（ソート・フィルタ・リサイズ・読み取り専用・行グループ化と集計の許可）。
 * 文字列列の集計は件数・先頭・末尾のみ選べるようにする（初期値は件数）。数値列は列定義側で上書きする。
 */
const defaultColDef: ColDef<EventRow> = {
  sortable: true,
  resizable: true,
  floatingFilter: true,
  editable: false,
  enableRowGroup: true,
  enableValue: true,
  defaultAggFunc: 'count',
  allowedAggFuncs: ['count', 'first', 'last']
}
/** データがないときの表示文言 */
const localeText = { noRowsToShow: '「取得」ボタンでイベントを取得してください' }

/** グリッド準備完了時にAPIを保持する */
function onGridReady(e: GridReadyEvent<EventRow>): void {
  gridApi.value = e.api
}

/** 選択中の件数でデータを取得して表示用に反映する */
async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    setEvents(await fetchEvents(limit.value))
  } catch (e) {
    error.value = e instanceof Error ? e.message : '外部APIの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

/** 表示中の内容をExcelファイルに出力する（絞り込み・並べ替えを反映） */
function exportExcel(): void {
  gridApi.value?.exportDataAsExcel({ fileName: 'イベント一覧.xlsx' })
}

/**
 * 行のダブルクリックで詳細画面へ遷移する。
 * @param e 行ダブルクリックイベント
 */
function openDetail(e: RowDoubleClickedEvent<EventRow>): void {
  if (e.data) void router.push(`/events/${e.data.index}`)
}
</script>

<template>
  <h1 class="text-h5 mb-4">
    イベント一覧（AG Grid）
  </h1>
  <v-alert
    type="info"
    variant="tonal"
    class="mb-4"
  >
    東京都のイベント一覧を取得します。URLは「{{ url }}」です。
  </v-alert>
  <div class="d-flex align-center ga-4 mb-4">
    <v-select
      v-model="limit"
      :items="EVENT_LIMIT_OPTIONS"
      label="取得件数"
      density="compact"
      hide-details
      :disabled="loading"
      style="max-width: 160px"
    />
    <v-btn
      color="primary"
      class="fetch-events"
      :disabled="loading"
      @click="load"
    >
      取得
    </v-btn>
    <v-btn
      class="export-excel"
      prepend-icon="mdi-file-excel"
      :disabled="rowData.length === 0"
      @click="exportExcel"
    >
      Excel出力
    </v-btn>
  </div>
  <p class="text-caption mb-2">
    <span class="changed-legend" />
    黄色のセルは詳細画面で編集した箇所です。
  </p>
  <v-progress-linear
    v-if="loading"
    indeterminate
    class="mb-4"
  />
  <v-alert
    v-else-if="error"
    type="error"
    variant="tonal"
    class="mb-4"
  >
    {{ error }}
  </v-alert>
  <AgGridVue
    class="event-grid"
    style="height: 500px"
    :row-data="rowData"
    :column-defs="columnDefs"
    :default-col-def="defaultColDef"
    :row-numbers="true"
    grand-total-row="bottom"
    :locale-text="localeText"
    :cell-selection="true"
    :side-bar="['columns', 'filters']"
    @grid-ready="onGridReady"
    @row-double-clicked="openDetail"
  />
</template>

<style scoped>
.changed-legend {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 4px;
  vertical-align: middle;
  background: var(--changed-bg);
  border: 1px solid #d0d0d0;
}

.event-grid :deep(.ag-cell.changed) {
  background: var(--changed-bg);
}
</style>

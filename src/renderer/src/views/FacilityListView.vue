<script setup lang="ts">
/**
 * 公共施設一覧画面（AG Grid Enterprise）。
 * 「取得」ボタンで東京都の公共施設一覧APIから全件を取得し、1ページ20件でページングして表示する。
 * 全列をソート・フィルタでき、Excel出力もできる。詳細画面はない。
 * 2026年1月〜6月の来場者数（ランダムなダミー値）を数値列として持ち、Valuesに指定して集計できる。
 * 全体の集計結果は、ページを切り替えても見えるようグリッド最下部の合計行に固定表示する。
 */
import { computed, ref, shallowRef } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import type { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community'
import {
  buildFacilityUrl,
  FACILITY_COLUMNS,
  FACILITY_PAGE_SIZE,
  fetchFacilities,
  randomVisitors,
  toFacilityRows,
  VISITOR_COLUMNS
} from '../services/facilityApi'

/** グリッドの1行分（列名をキーにした表示値。来場者数の列は数値） */
type FacilityRow = Record<string, string | number>

const gridApi = shallowRef<GridApi<FacilityRow>>()
const rowData = ref<FacilityRow[]>([])
const loading = ref(false)
const error = ref('')
/** 取得に使うURL */
const url = buildFacilityUrl()
/** 取得済みかどうか（取得後にデータが0件でも「該当なし」を区別するため） */
const fetched = ref(false)
const count = computed(() => rowData.value.length)

/** 来場者数列の定義。数値列で、Valuesに指定して合計・平均などを集計できる */
const visitorColumnDefs: ColDef<FacilityRow>[] = VISITOR_COLUMNS.map((name) => ({
  field: name,
  headerName: name,
  width: 150,
  type: 'numericColumn',
  filter: 'agNumberColumnFilter',
  enableRowGroup: false,
  enableValue: true,
  defaultAggFunc: 'sum',
  allowedAggFuncs: ['sum', 'avg', 'min', 'max', 'count']
}))

/** 列定義（施設の項目は全列をセットフィルタで絞り込み可能にし、末尾に来場者数列を並べる） */
const columnDefs: ColDef<FacilityRow>[] = [
  ...FACILITY_COLUMNS.map(({ name, width }) => ({
    field: name,
    headerName: name,
    width,
    filter: 'agSetColumnFilter'
  })),
  ...visitorColumnDefs
]
/** 全列共通の設定（ソート・フィルタ・リサイズ・読み取り専用・行グループ化の許可） */
const defaultColDef: ColDef<FacilityRow> = {
  sortable: true,
  resizable: true,
  floatingFilter: true,
  editable: false,
  enableRowGroup: true
}
/** データがないときの表示文言 */
const localeText = { noRowsToShow: '「取得」ボタンで公共施設を取得してください' }

/** グリッド準備完了時にAPIを保持する */
function onGridReady(e: GridReadyEvent<FacilityRow>): void {
  gridApi.value = e.api
}

/** 公共施設を全件取得して表示用に反映する */
async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    rowData.value = toFacilityRows(await fetchFacilities()).map((cells) => ({
      ...Object.fromEntries(FACILITY_COLUMNS.map(({ name }, i) => [name, cells[i]])),
      ...randomVisitors()
    }))
    fetched.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : '外部APIの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

/** 表示中の内容をExcelファイルに出力する（絞り込み・並べ替えを反映。全ページが対象） */
function exportExcel(): void {
  gridApi.value?.exportDataAsExcel({ fileName: '公共施設一覧.xlsx' })
}
</script>

<template>
  <h1 class="text-h5 mb-4">
    公共施設一覧
  </h1>
  <v-alert
    type="info"
    variant="tonal"
    class="mb-4"
  >
    東京都の公共施設一覧を取得します。URLは「{{ url }}」です。
  </v-alert>
  <div class="d-flex align-center ga-4 mb-4">
    <v-btn
      color="primary"
      class="fetch-facilities"
      :disabled="loading"
      @click="load"
    >
      取得
    </v-btn>
    <v-btn
      class="export-excel"
      prepend-icon="mdi-file-excel"
      :disabled="count === 0"
      @click="exportExcel"
    >
      Excel出力
    </v-btn>
    <span
      v-if="fetched"
      class="text-body-2 facility-count"
    >全{{ count }}件</span>
  </div>
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
    class="facility-grid"
    style="height: 640px"
    :row-data="rowData"
    :column-defs="columnDefs"
    :default-col-def="defaultColDef"
    :locale-text="localeText"
    :side-bar="['columns', 'filters']"
    grand-total-row="pinnedBottom"
    :pagination="true"
    :pagination-page-size="FACILITY_PAGE_SIZE"
    :pagination-page-size-selector="false"
    @grid-ready="onGridReady"
  />
</template>

<style scoped>
/* 固定表示の合計行のセルが content-box になり、列幅より余白分(左右15px)広がって右端の数字が切れるため border-box にそろえる */
.facility-grid :deep(.ag-cell) {
  box-sizing: border-box;
}
</style>

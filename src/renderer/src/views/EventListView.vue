<script setup lang="ts">
/**
 * イベント一覧画面。
 * 初期表示では空のExcelGridと案内メッセージを表示し、
 * 取得件数を選んで「取得」ボタンを押すと東京都のイベント一覧APIからデータを取得して表示する。
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ExcelGrid from '../components/ExcelGrid.vue'
import { useEventStore } from '../composables/useEventStore'
import {
  buildEventUrl,
  DEFAULT_EVENT_LIMIT,
  EVENT_COLUMNS,
  EVENT_LIMIT_OPTIONS,
  fetchEvents,
  toEventGridData
} from '../services/eventApi'

/** すべての列をソート・フィルタ可能にする */
const columns = EVENT_COLUMNS.map((c) => ({ ...c.column, sortable: true, filterable: true }))
/** 初期表示の行数 */
const INITIAL_ROWS = 10
const router = useRouter()
const { events, originals, setEvents } = useEventStore()
/** 詳細画面から戻ったときも前回の取得結果を表示する */
const data = ref<string[][]>(toEventGridData(events.value))
/** ExcelGridは初期値を作成時にのみ反映するため、取得のたびに作り直すためのキー */
const gridKey = ref(0)
const limit = ref(DEFAULT_EVENT_LIMIT)
const loading = ref(false)
const error = ref('')
/** 取得時点から値が変わったセル（詳細画面で編集した箇所） */
const changedCells = computed(() => {
  const before = toEventGridData(originals.value)
  return toEventGridData(events.value).map((row, r) => row.map((v, c) => v !== before[r]?.[c]))
})
/** 取得に使うURL（選択中の件数を反映） */
const url = computed(() => buildEventUrl(limit.value))

/** 選択中の件数でデータを取得して表示用に反映する */
async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    setEvents(await fetchEvents(limit.value))
    data.value = toEventGridData(events.value)
    gridKey.value++
  } catch (e) {
    error.value = e instanceof Error ? e.message : '外部APIの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

/**
 * 行のダブルクリックで詳細画面へ遷移する（データのない空行は無視する）。
 * @param row 行インデックス
 */
function openDetail(row: number): void {
  if (row < events.value.length) void router.push(`/events/${row}`)
}
</script>

<template>
  <h1 class="text-h5 mb-4">
    イベント一覧
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
  <ExcelGrid
    :key="gridKey"
    :columns="columns"
    :initial-data="data"
    :rows="Math.max(INITIAL_ROWS, data.length)"
    :allow-add-row="false"
    file-name="イベント一覧"
    readonly
    :changed-cells="changedCells"
    @row-dblclick="openDetail"
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
</style>

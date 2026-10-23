<script setup lang="ts">
/**
 * ExcelGridサンプル画面。
 * ExcelGridのON/OFFできる機能（読み取り専用・行追加・Excel出力・ソート・フィルタ・変更セルの強調）を
 * チェックボックスで切り替えて試せる。列は文字列・数値(右寄せ)・日付・セレクト(オートコンプリート)・スイッチを用意している。
 */
import { computed, ref } from 'vue'
import ExcelGrid from '../components/ExcelGrid.vue'
import SampleOptionsElement from '../components/sample/SampleOptionsElement.vue'
import SampleOptionsVuetify from '../components/sample/SampleOptionsVuetify.vue'
import { SAMPLE_COLUMNS, SAMPLE_DATA } from '../composables/sampleData'
import type { ColumnDefinition } from '../composables/useExcelGrid'
import { defaultSampleOptions, type UiLibrary } from '../composables/useSampleOptions'

/** 強調表示のサンプル（2行目の数量と4行目の状態） */
const SAMPLE_CHANGED: boolean[][] = [[], [false, true], [], [false, false, false, true]]

const options = ref(defaultSampleOptions())
/** オプション欄に使うUIライブラリ */
const library = ref<UiLibrary>('vuetify')
const lastDblclick = ref('')

/** 列定義（ソート・フィルタのON/OFFを反映） */
const columns = computed<ColumnDefinition[]>(() =>
  SAMPLE_COLUMNS.map((c) => ({ ...c, sortable: options.value.sortable, filterable: options.value.filterable }))
)
/** 強調対象のセル（OFF時は空） */
const changedCells = computed<boolean[][]>(() => (options.value.highlight ? SAMPLE_CHANGED : []))
/** 列定義はグリッド作成時にのみ反映されるため、ソート・フィルタ切替時に作り直すためのキー */
const gridKey = computed(() => `${options.value.sortable}-${options.value.filterable}`)

/**
 * 行のダブルクリックを画面に表示する。
 * @param row 行インデックス（0始まり）
 */
function onRowDblclick(row: number): void {
  lastDblclick.value = `${row + 1}行目がダブルクリックされました`
}
</script>

<template>
  <h1 class="text-h5 mb-4">
    ExcelGridサンプル
  </h1>
  <v-card
    class="mb-4 px-4 py-2"
    variant="outlined"
  >
    <v-btn-toggle
      v-model="library"
      class="library-toggle mb-2"
      mandatory
      density="compact"
      color="primary"
    >
      <v-btn value="vuetify">
        Vuetify
      </v-btn>
      <v-btn value="element">
        Element Plus
      </v-btn>
    </v-btn-toggle>
    <SampleOptionsVuetify
      v-if="library === 'vuetify'"
      v-model="options"
    />
    <SampleOptionsElement
      v-else
      v-model="options"
    />
    <p class="text-caption mt-1">
      ※ ソート・フィルタを切り替えるとグリッドは初期状態に戻ります。列幅はヘッダー右端のドラッグで変更できます。
    </p>
  </v-card>
  <p
    v-if="lastDblclick"
    class="dblclick-message text-caption mb-2"
    role="status"
  >
    {{ lastDblclick }}
  </p>
  <ExcelGrid
    :key="gridKey"
    :columns="columns"
    :initial-data="SAMPLE_DATA.map((r) => [...r])"
    :rows="8"
    :allow-add-row="options.allowAddRow"
    :allow-export="options.allowExport"
    :readonly="options.readonly"
    :changed-cells="changedCells"
    file-name="excel-grid-sample"
    @row-dblclick="onRowDblclick"
  />
</template>

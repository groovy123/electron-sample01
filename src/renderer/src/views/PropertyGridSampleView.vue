<script setup lang="ts">
/**
 * PropertyGridサンプル画面。
 * ExcelGridサンプルと同じデータのうち先頭4件を、1件1枚のカード(PropertyGrid)で表示する。
 * PropertyGridのON/OFFできる機能（全行の編集不可・編集済み行の強調）をチェックボックスで切り替えられる。
 */
import { computed, ref } from 'vue'
import PropertyGrid from '../components/PropertyGrid.vue'
import { SAMPLE_DATA, toPropertyRows } from '../composables/sampleData'
import type { PropertyRow } from '../composables/usePropertyGrid'

/** カードの枚数 */
const CARD_COUNT = 4

/** カード1枚分（カードの見出しと行） */
interface SampleCard {
  title: string
  rows: PropertyRow[]
}

/**
 * サンプルのカードを新しく作る（編集で書き換わるため毎回別のオブジェクトにする）。
 * @returns 初期状態のカード
 */
function createCards(): SampleCard[] {
  return SAMPLE_DATA.slice(0, CARD_COUNT).map((record) => ({ title: `${record[0]}の情報`, rows: toPropertyRows(record) }))
}

const cards = ref<SampleCard[]>(createCards())
/** 比較用の初期値 */
const initialCards = createCards()
const readonly = ref(false)
const highlight = ref(true)
const lastChange = ref('')

/** 画面に渡すカード（全行編集不可の設定を反映する。初期の編集不可はそのまま維持する） */
const viewCards = computed(() =>
  cards.value.map((card, c) => ({
    title: card.title,
    rows: card.rows.map((row, i) => ({ ...row, editable: readonly.value ? false : initialCards[c].rows[i].editable })),
    changed: card.rows.map((row, i) => highlight.value && row.value !== initialCards[c].rows[i].value)
  }))
)

/**
 * 値の変更を保存して画面に表示する。
 * @param card カード番号
 * @param index 行インデックス
 * @param value 新しい値
 */
function onChange(card: number, index: number, value: string): void {
  const target = cards.value[card]
  target.rows[index].value = value
  lastChange.value = `${target.title}の「${target.rows[index].key}」を「${value}」に変更しました`
}

/** 値を初期状態に戻す */
function reset(): void {
  cards.value = createCards()
  lastChange.value = ''
}
</script>

<template>
  <h1 class="text-h5 mb-4">
    PropertyGridサンプル
  </h1>
  <v-card
    class="mb-4 px-4 py-2"
    variant="outlined"
  >
    <div class="d-flex flex-wrap align-center ga-4">
      <v-checkbox
        v-model="readonly"
        class="opt-readonly"
        label="全行を編集不可にする (editable)"
        density="compact"
        hide-details
      />
      <v-checkbox
        v-model="highlight"
        class="opt-highlight"
        label="編集済みの行を強調 (changed)"
        density="compact"
        hide-details
      />
      <v-btn
        class="reset"
        size="small"
        prepend-icon="mdi-restore"
        @click="reset"
      >
        初期値に戻す
      </v-btn>
    </div>
  </v-card>
  <p
    v-if="lastChange"
    class="change-message text-caption mb-2"
    role="status"
  >
    {{ lastChange }}
  </p>
  <v-row>
    <v-col
      v-for="(card, c) in viewCards"
      :key="card.title"
      cols="12"
      md="6"
    >
      <v-card
        class="property-card h-100"
        elevation="2"
      >
        <v-card-title class="text-subtitle-1">
          {{ card.title }}
        </v-card-title>
        <v-card-text>
          <PropertyGrid
            :rows="card.rows"
            :changed="card.changed"
            @change="(i, v) => onChange(c, i, v)"
          />
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

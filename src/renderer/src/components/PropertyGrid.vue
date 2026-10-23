<script setup lang="ts">
/**
 * PropertyGridコンポーネント。
 * 行番号・キー・値の3列固定の表で、行ごとに値の型（文字列/数値/セレクト/日付/スイッチ）と
 * 編集可否を指定できる。行の追加はできない。
 * 数値は v-number-input（右寄せ）、セレクトは v-autocomplete、日付はカレンダー入力、
 * boolean は v-switch で、ExcelGrid と同じ部品を使う。
 */
import type { PropertyRow } from '../composables/usePropertyGrid'

defineProps<{
  /** 表示する行 */
  rows: PropertyRow[]
  /** 編集済みの行（rows と同じ並び。true の行を背景色で強調する） */
  changed?: boolean[]
}>()

const emit = defineEmits<{
  /** 値が変更されたとき（行インデックスと新しい値） */
  change: [index: number, value: string]
}>()

/**
 * 値の変更を通知する。数値行は数値として許可される入力のみ受け付ける。
 * @param row 対象の行
 * @param index 行インデックス
 * @param value 入力値
 */
function onInput(row: PropertyRow, index: number, value: string): void {
  if (row.type === 'number' && !/^-?\d*\.?\d*$/.test(value)) return
  row.value = value
  emit('change', index, value)
}

/**
 * 数値入力の値を通知する。
 * @param row 対象の行
 * @param index 行インデックス
 * @param value 入力された数値（空は null）
 */
function onNumber(row: PropertyRow, index: number, value: number | null): void {
  onInput(row, index, value === null ? '' : String(value))
}

/**
 * スイッチの切り替えを通知する。
 * @param row 対象の行
 * @param index 行インデックス
 * @param value ONなら true
 */
function onSwitch(row: PropertyRow, index: number, value: boolean | null): void {
  onInput(row, index, value ? 'true' : 'false')
}
</script>

<template>
  <table class="property-grid">
    <thead>
      <tr>
        <th class="row-no" />
        <th>キー</th>
        <th>値</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(row, i) in rows"
        :key="row.key"
        :class="{ changed: changed?.[i] }"
      >
        <td class="row-no">
          {{ i + 1 }}
        </td>
        <td class="key">
          {{ row.key }}
        </td>
        <td class="value">
          <v-autocomplete
            v-if="row.type === 'select'"
            :model-value="row.value || null"
            :items="row.options ?? []"
            :disabled="row.editable === false"
            :aria-label="row.key"
            :clearable="row.editable !== false"
            variant="plain"
            density="compact"
            hide-details
            hide-no-data
            auto-select-first
            @update:model-value="onInput(row, i, $event ?? '')"
          />
          <v-number-input
            v-else-if="row.type === 'number'"
            class="number-input"
            :model-value="row.value === '' ? null : Number(row.value)"
            :precision="null"
            :disabled="row.editable === false"
            :aria-label="row.key"
            control-variant="hidden"
            variant="plain"
            density="compact"
            hide-details
            @update:model-value="onNumber(row, i, $event)"
          />
          <v-switch
            v-else-if="row.type === 'boolean'"
            :model-value="row.value === 'true'"
            :disabled="row.editable === false"
            :aria-label="row.key"
            color="primary"
            density="compact"
            hide-details
            @update:model-value="onSwitch(row, i, $event)"
          />
          <input
            v-else-if="row.type === 'date'"
            type="date"
            class="date-input"
            :value="row.value"
            :disabled="row.editable === false"
            :aria-label="row.key"
            @change="onInput(row, i, ($event.target as HTMLInputElement).value)"
          >
          <v-text-field
            v-else
            :model-value="row.value"
            :disabled="row.editable === false"
            :aria-label="row.key"
            variant="plain"
            density="compact"
            hide-details
            @update:model-value="onInput(row, i, $event ?? '')"
          />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.property-grid tr.changed td {
  background: var(--changed-bg);
}
.property-grid {
  width: 100%;
  border-collapse: collapse;
}
.property-grid th,
.property-grid td {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 0 8px;
  height: 40px;
  text-align: left;
}
.property-grid th {
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-weight: 500;
}
.row-no {
  width: 40px;
  text-align: center !important;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.key {
  width: 35%;
}
.number-input :deep(input) {
  text-align: right;
}
.date-input {
  width: 100%;
  height: 40px;
  font: inherit;
  color: inherit;
  outline: none;
}
.date-input:disabled {
  opacity: var(--v-disabled-opacity);
}
</style>

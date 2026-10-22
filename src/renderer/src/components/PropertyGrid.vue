<script setup lang="ts">
/**
 * PropertyGridコンポーネント。
 * 行番号・キー・値の3列固定の表で、行ごとに値の型（文字列/数値/セレクト/カレンダー）と
 * 編集可否を指定できる。行の追加はできない。
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
          <v-select
            v-if="row.type === 'select'"
            :model-value="row.value"
            :items="row.options ?? []"
            :disabled="row.editable === false"
            :aria-label="row.key"
            variant="plain"
            density="compact"
            hide-details
            @update:model-value="onInput(row, i, $event ?? '')"
          />
          <v-text-field
            v-else
            :model-value="row.value"
            :type="row.type === 'date' ? 'date' : 'text'"
            :inputmode="row.type === 'number' ? 'decimal' : undefined"
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
</style>

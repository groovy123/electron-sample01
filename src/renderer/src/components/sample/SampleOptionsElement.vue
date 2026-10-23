<script setup lang="ts">
/**
 * ExcelGridサンプルのオプション欄（Element Plus版）。
 */
import { ElCheckbox } from 'element-plus'
import 'element-plus/theme-chalk/el-checkbox.css'
import { SAMPLE_OPTION_ITEMS, type SampleOptions } from '../../composables/useSampleOptions'

/** 切り替え対象のオプション */
const options = defineModel<SampleOptions>({ required: true })

/**
 * オプションを1つ更新する。
 * @param key 対象のキー
 * @param value 新しい値
 */
function update(key: keyof SampleOptions, value: unknown): void {
  options.value = { ...options.value, [key]: value === true }
}
</script>

<template>
  <div class="d-flex flex-wrap ga-4">
    <ElCheckbox
      v-for="item in SAMPLE_OPTION_ITEMS"
      :key="item.key"
      :class="`opt-${item.key}`"
      :model-value="options[item.key]"
      :label="item.label"
      @update:model-value="update(item.key, $event)"
    />
  </div>
</template>

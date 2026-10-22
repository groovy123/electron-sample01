<script setup lang="ts">
/**
 * 上部バーのタイトル。クリックで編集でき、Enterで確定・Escでキャンセルする。
 */
import { nextTick, ref } from 'vue'
import { useHeaderTitle } from '../composables/useHeaderTitle'

const props = withDefaults(defineProps<{ defaultTitle?: string }>(), {
  defaultTitle: 'Electron + Vue 3 + TypeScript サンプル'
})

const { title, setTitle } = useHeaderTitle(props.defaultTitle)
const editing = ref(false)
const draft = ref('')
const input = ref<{ focus: () => void } | null>(null)

/** 編集モードを開始する */
async function startEdit(): Promise<void> {
  draft.value = title.value
  editing.value = true
  await nextTick()
  input.value?.focus()
}

/** 入力内容を確定する */
function commit(): void {
  if (!editing.value) return
  setTitle(draft.value)
  editing.value = false
}

/** 編集を取り消す */
function cancel(): void {
  editing.value = false
}
</script>

<template>
  <v-text-field
    v-if="editing"
    ref="input"
    v-model="draft"
    class="header-title-input"
    density="compact"
    variant="outlined"
    hide-details
    single-line
    aria-label="ヘッダータイトル"
    @keyup.enter="commit"
    @keyup.esc="cancel"
    @blur="commit"
  />
  <div
    v-else
    class="header-title d-flex align-center ga-1"
    role="button"
    tabindex="0"
    title="クリックして編集"
    @click="startEdit"
    @keyup.enter="startEdit"
  >
    <span class="header-title-text text-h6">{{ title }}</span>
    <v-icon
      size="small"
      class="text-medium-emphasis"
    >
      mdi-pencil-outline
    </v-icon>
  </div>
</template>

<style scoped>
.header-title {
  cursor: pointer;
}

.header-title-input {
  max-width: 480px;
}
</style>

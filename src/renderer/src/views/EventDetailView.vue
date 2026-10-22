<script setup lang="ts">
/**
 * イベント詳細画面。
 * 一覧で選んだイベントを4つのカテゴリ（基本情報・期間・開催場所・料金・連絡先）のカードに分け、
 * PropertyGridで値を更新できる。更新は一覧にも反映される。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PropertyGrid from '../components/PropertyGrid.vue'
import { applyEventChange, EVENT_CATEGORIES, eventToPropertyRows } from '../composables/useEventDetail'
import { useEventStore } from '../composables/useEventStore'

const route = useRoute()
const router = useRouter()
const { events, originals } = useEventStore()

const record = computed(() => events.value[Number(route.params.index)])
const cards = computed(() => {
  const current = record.value
  if (!current) return []
  const original = originals.value[Number(route.params.index)] ?? {}
  return EVENT_CATEGORIES.map((category) => {
    const rows = eventToPropertyRows(current, category)
    const before = eventToPropertyRows(original, category)
    return { category, rows, changed: rows.map((r, i) => r.value !== before[i].value) }
  })
})
</script>

<template>
  <div class="d-flex align-center mb-4">
    <v-btn
      class="back"
      variant="text"
      prepend-icon="mdi-arrow-left"
      @click="router.push('/events')"
    >
      一覧に戻る
    </v-btn>
    <h1 class="text-h5 ml-2">
      イベント詳細
    </h1>
  </div>
  <v-alert
    v-if="!record"
    type="warning"
    variant="tonal"
  >
    イベントが見つかりません。一覧から選び直してください。
  </v-alert>
  <p
    v-else
    class="text-caption mb-2"
  >
    <span class="changed-legend" />
    黄色の行は編集済みです。
  </p>
  <v-row v-if="record">
    <v-col
      v-for="card in cards"
      :key="card.category.title"
      cols="12"
      md="6"
    >
      <v-card
        class="property-card h-100"
        elevation="2"
      >
        <v-card-title class="text-subtitle-1">
          {{ card.category.title }}
        </v-card-title>
        <v-card-text>
          <PropertyGrid
            :rows="card.rows"
            :changed="card.changed"
            @change="(i, v) => applyEventChange(record, card.category, i, v)"
          />
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
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

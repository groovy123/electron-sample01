<script setup lang="ts">
/**
 * ホーム画面（ダッシュボード）。
 * サマリーカード・週次推移・最近のアクティビティと、アプリバージョンを表示する。
 */
import { computed, onMounted, ref } from 'vue'
import { formatChange, toBarHeight, useDashboard } from '../composables/useDashboard'
import { getAppVersion, isElectron } from '../services/platform'

const { summary, weekly, activities } = useDashboard()

const maxWeekly = computed<number>(() => Math.max(...weekly.map((w) => w.value)))

const appVersion = ref<string>('')
const versionError = ref<string>('')
const runningInElectron = isElectron()

/**
 * 変化率に応じた文字色を返す。
 * @param change 変化率（%）
 */
function changeColor(change: number): string {
  if (change > 0) return 'success'
  if (change < 0) return 'error'
  return 'medium-emphasis'
}

onMounted(async () => {
  try {
    appVersion.value = await getAppVersion()
  } catch (error) {
    versionError.value = 'バージョン情報の取得に失敗しました'
    console.error(error)
  }
})
</script>

<template>
  <h1 class="text-h5 mb-4">
    ダッシュボード
  </h1>

  <v-row>
    <v-col
      v-for="item in summary"
      :key="item.label"
      cols="12"
      sm="6"
      md="3"
    >
      <v-card
        class="summary-card"
        elevation="2"
      >
        <v-card-text class="d-flex align-center">
          <v-avatar
            :color="item.color"
            variant="tonal"
            size="48"
            class="mr-4"
          >
            <v-icon :icon="item.icon" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">
              {{ item.label }}
            </div>
            <div class="text-h6">
              {{ item.value }}
            </div>
            <div
              class="text-caption change"
              :class="`text-${changeColor(item.change)}`"
            >
              {{ formatChange(item.change) }}
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>

  <v-row>
    <v-col
      cols="12"
      md="8"
    >
      <v-card elevation="2">
        <v-card-title>週次推移</v-card-title>
        <v-card-text>
          <div
            class="d-flex align-end justify-space-between"
            style="height: 200px"
          >
            <div
              v-for="point in weekly"
              :key="point.day"
              class="bar-col d-flex flex-column align-center justify-end flex-grow-1"
              style="height: 100%"
            >
              <span class="text-caption">{{ point.value }}</span>
              <div
                class="bar bg-primary rounded-t"
                :style="{ height: `${toBarHeight(point.value, maxWeekly) * 0.8}%`, width: '60%' }"
              />
              <span class="text-caption text-medium-emphasis mt-1">{{ point.day }}</span>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col
      cols="12"
      md="4"
    >
      <v-card elevation="2">
        <v-card-title>最近のアクティビティ</v-card-title>
        <v-list lines="two">
          <v-list-item
            v-for="activity in activities"
            :key="activity.id"
            :prepend-icon="activity.icon"
            :title="activity.title"
            :subtitle="activity.time"
          />
        </v-list>
      </v-card>
    </v-col>
  </v-row>

  <v-alert
    v-if="!versionError"
    class="mt-4"
    type="info"
    variant="tonal"
  >
    アプリバージョン: {{ appVersion || '取得中...' }}
    <span v-if="!runningInElectron">（ブラウザモードで実行中）</span>
  </v-alert>
  <v-alert
    v-else
    class="mt-4"
    type="error"
    variant="tonal"
  >
    {{ versionError }}
  </v-alert>
</template>

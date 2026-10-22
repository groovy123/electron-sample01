<script setup lang="ts">
/**
 * 上部バー右端に配置するアラート通知・ユーザー名。
 * アラートはメニューで一覧表示する。
 */
import { useHeaderActions, type AlertItem } from '../composables/useHeaderActions'

/** 仮のアラートデータ */
const initialAlerts: readonly AlertItem[] = [
  { id: 1, message: '新しいイベントが登録されました', read: false },
  { id: 2, message: 'イベント情報が更新されました', read: false },
  { id: 3, message: '月次レポートが作成されました', read: false }
]

const { userName, alerts, alertCount, hasAlerts, markRead, markAllRead } = useHeaderActions('山田 太郎', initialAlerts)
</script>

<template>
  <div class="header-actions d-flex align-center ga-2 mr-4">
    <v-menu
      :close-on-content-click="false"
      location="bottom end"
    >
      <template #activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          icon
          variant="text"
          aria-label="アラート通知"
          class="alert-button"
        >
          <v-badge
            :model-value="hasAlerts"
            :content="alertCount"
            color="error"
          >
            <v-icon>mdi-bell-outline</v-icon>
          </v-badge>
        </v-btn>
      </template>
      <v-card
        class="alert-menu"
        min-width="320"
      >
        <v-card-title class="d-flex align-center text-subtitle-1">
          アラート
          <v-spacer />
          <v-btn
            size="small"
            variant="text"
            :disabled="!hasAlerts"
            class="mark-all-read"
            @click="markAllRead"
          >
            すべて既読
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-list v-if="alerts.length > 0">
          <v-list-item
            v-for="alert in alerts"
            :key="alert.id"
            class="alert-item"
            :class="{ 'alert-unread': !alert.read }"
            :title="alert.message"
            :base-color="alert.read ? undefined : 'primary'"
            @click="markRead(alert.id)"
          />
        </v-list>
        <v-card-text
          v-else
          class="text-medium-emphasis"
        >
          新しいアラートはありません
        </v-card-text>
      </v-card>
    </v-menu>
    <div class="user-name d-flex align-center ga-1">
      <v-icon>mdi-account-circle</v-icon>
      <span>{{ userName }}</span>
    </div>
  </div>
</template>

<style scoped>
.alert-unread {
  font-weight: bold;
}
</style>

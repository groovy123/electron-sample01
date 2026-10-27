<script setup lang="ts">
/**
 * アプリ全体のレイアウト。
 * 左サイドメニュー・上部バー・ルータービューを配置する（白基調）。
 */
import HeaderActions from './components/HeaderActions.vue'
import HeaderTitle from './components/HeaderTitle.vue'

/** サイドメニュー項目 */
interface MenuItem {
  title: string
  icon: string
  to: string
}

const menuItems: readonly MenuItem[] = [
  { title: 'Home', icon: 'mdi-view-dashboard', to: '/' },
  { title: 'イベント一覧', icon: 'mdi-calendar-star', to: '/events' },
  { title: 'イベント一覧（AG Grid）', icon: 'mdi-table-large', to: '/events-ag-grid' },
  { title: 'ExcelGridサンプル', icon: 'mdi-table', to: '/excel-grid' },
  { title: 'PropertyGridサンプル', icon: 'mdi-format-list-bulleted', to: '/property-grid' },
  { title: 'About', icon: 'mdi-information', to: '/about' }
]
</script>

<template>
  <v-app>
    <v-navigation-drawer
      permanent
      color="surface"
      border="e"
      width="220"
    >
      <v-list-item
        class="py-4"
        prepend-icon="mdi-account-group"
        title="Customer"
      />
      <v-divider />
      <v-list
        nav
        density="comfortable"
      >
        <v-list-item
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          color="primary"
          exact
        />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar
      color="surface"
      density="comfortable"
      flat
      border="b"
    >
      <HeaderTitle class="ml-4" />
      <v-spacer />
      <HeaderActions />
    </v-app-bar>

    <v-main>
      <v-container>
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

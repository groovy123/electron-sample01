<script setup lang="ts">
/**
 * About画面。
 * サンプルアプリが使用している技術スタックを一覧表示する。
 */
const stack: readonly string[] = [
  'Vue.js 3 (Composition API)',
  'TypeScript',
  'Vue Router',
  'Electron',
  'Vuetify'
]
</script>

<template>
  <v-card
    class="mt-4"
    elevation="2"
  >
    <v-card-title>このアプリについて</v-card-title>
    <v-list>
      <v-list-item
        v-for="item in stack"
        :key="item"
      >
        {{ item }}
      </v-list-item>
    </v-list>
  </v-card>
</template>

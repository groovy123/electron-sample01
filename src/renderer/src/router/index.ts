import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import EventListView from '../views/EventListView.vue'
import EventDetailView from '../views/EventDetailView.vue'
import AboutView from '../views/AboutView.vue'

/**
 * アプリのルーティング定義。
 * Electron はファイルプロトコルで配信されるため hash history を使用する。
 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/events', name: 'events', component: EventListView },
    { path: '/events/:index(\\d+)', name: 'event-detail', component: EventDetailView },
    { path: '/about', name: 'about', component: AboutView }
  ]
})

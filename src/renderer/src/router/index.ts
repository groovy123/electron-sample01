import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import EventListView from '../views/EventListView.vue'
import EventListAgGridView from '../views/EventListAgGridView.vue'
import EventDetailView from '../views/EventDetailView.vue'
import ExcelGridSampleView from '../views/ExcelGridSampleView.vue'
import PropertyGridSampleView from '../views/PropertyGridSampleView.vue'
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
    { path: '/events-ag-grid', name: 'events-ag-grid', component: EventListAgGridView },
    { path: '/events/:index(\\d+)', name: 'event-detail', component: EventDetailView },
    { path: '/excel-grid', name: 'excel-grid', component: ExcelGridSampleView },
    { path: '/property-grid', name: 'property-grid', component: PropertyGridSampleView },
    { path: '/about', name: 'about', component: AboutView }
  ]
})

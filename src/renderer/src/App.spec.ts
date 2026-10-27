import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory, type Router } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import AboutView from './views/AboutView.vue'

const vuetify = createVuetify({ components, directives })

/** テスト用のルーターを生成する */
function createTestRouter(): Router {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/events', name: 'events', component: HomeView },
      { path: '/events-ag-grid', name: 'events-ag-grid', component: HomeView },
      { path: '/excel-grid', name: 'excel-grid', component: HomeView },
      { path: '/property-grid', name: 'property-grid', component: HomeView },
      { path: '/about', name: 'about', component: AboutView }
    ]
  })
}

describe('App', () => {
  it('タイトルとナビゲーションタブを表示する', async () => {
    window.api = { getAppVersion: vi.fn().mockResolvedValue('1.0.0'), fetchEvents: vi.fn() }
    const router = createTestRouter()
    const wrapper = mount(App, {
      global: { plugins: [router, vuetify] }
    })
    await router.isReady()
    await flushPromises()

    expect(wrapper.text()).toContain('Electron + Vue 3 + TypeScript サンプル')
    expect(wrapper.text()).toContain('Home')
    expect(wrapper.text()).toContain('About')
  })

  it('左のサイドメニューにHome・イベント一覧・Aboutのリンクを表示する', async () => {
    window.api = { getAppVersion: vi.fn().mockResolvedValue('1.0.0'), fetchEvents: vi.fn() }
    const router = createTestRouter()
    const wrapper = mount(App, {
      global: { plugins: [router, vuetify] }
    })
    await router.isReady()
    await flushPromises()

    const drawer = wrapper.find('.v-navigation-drawer')
    expect(drawer.exists()).toBe(true)
    expect(drawer.findAll('a').map((a) => a.attributes('href'))).toEqual(['#/', '#/events', '#/events-ag-grid', '#/excel-grid', '#/property-grid', '#/about'])
  })

  it('上部バー右端にアラート通知・ユーザー名を表示する', async () => {
    window.api = { getAppVersion: vi.fn().mockResolvedValue('1.0.0'), fetchEvents: vi.fn() }
    const router = createTestRouter()
    const wrapper = mount(App, {
      global: { plugins: [router, vuetify] }
    })
    await router.isReady()
    await flushPromises()

    const bar = wrapper.find('.v-app-bar')
    expect(bar.find('button[aria-label="アラート通知"]').exists()).toBe(true)
    expect(bar.find('.user-name').exists()).toBe(true)
  })
})

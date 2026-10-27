import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HomeView from './HomeView.vue'

const vuetify = createVuetify({ components, directives })

/**
 * HomeView をマウントするヘルパー。
 * Vuetify プラグインを常に注入する。
 */
function mountHomeView(): ReturnType<typeof mount> {
  return mount(HomeView, {
    global: { plugins: [vuetify] }
  })
}

describe('HomeView', () => {
  beforeEach(() => {
    window.api = {
      getAppVersion: vi.fn().mockResolvedValue('1.2.3'),
      fetchEvents: vi.fn(),
      fetchFacilities: vi.fn()
    }
  })

  afterEach(() => {
    delete (window as { api?: unknown }).api
  })

  it('ダッシュボードの見出しを表示する', async () => {
    const wrapper = mountHomeView()
    await flushPromises()
    expect(wrapper.text()).toContain('ダッシュボード')
  })

  it('サマリーカードを4件表示する', async () => {
    const wrapper = mountHomeView()
    await flushPromises()
    expect(wrapper.findAll('.summary-card')).toHaveLength(4)
    expect(wrapper.text()).toContain('顧客数')
    expect(wrapper.text()).toContain('+12.5%')
    expect(wrapper.text()).toContain('-3.1%')
  })

  it('週次推移の棒を7本表示する', async () => {
    const wrapper = mountHomeView()
    await flushPromises()
    expect(wrapper.findAll('.bar')).toHaveLength(7)
  })

  it('最近のアクティビティを表示する', async () => {
    const wrapper = mountHomeView()
    await flushPromises()
    expect(wrapper.text()).toContain('最近のアクティビティ')
    expect(wrapper.text()).toContain('新規顧客が登録されました')
  })

  it('マウント時にアプリバージョンを表示する', async () => {
    const wrapper = mountHomeView()
    await flushPromises()
    expect(wrapper.text()).toContain('1.2.3')
  })

  it('バージョン取得に失敗した場合はエラーメッセージを表示する', async () => {
    window.api = {
      getAppVersion: vi.fn().mockRejectedValue(new Error('IPC error')),
      fetchEvents: vi.fn(),
      fetchFacilities: vi.fn()
    }
    const wrapper = mountHomeView()
    await flushPromises()
    expect(wrapper.text()).toContain('バージョン情報の取得に失敗しました')
  })

  it('ブラウザ単体実行時はビルド時のバージョンと「ブラウザモード」表示を行う', async () => {
    delete (window as { api?: unknown }).api
    const wrapper = mountHomeView()
    await flushPromises()
    expect(wrapper.text()).toContain('ブラウザモードで実行中')
    expect(wrapper.text()).toContain(__APP_VERSION__)
  })
})

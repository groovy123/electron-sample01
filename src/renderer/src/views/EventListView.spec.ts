import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createMemoryHistory, createRouter } from 'vue-router'
import EventListView from './EventListView.vue'
import { useEventStore } from '../composables/useEventStore'

const vuetify = createVuetify({ components, directives })
const fetchEvents = vi.fn()

vi.mock('../services/eventApi', async (orig) => ({
  ...(await orig<typeof import('../services/eventApi')>()),
  fetchEvents: (limit: number) => fetchEvents(limit)
}))

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/events', component: EventListView },
    { path: '/events/:index', name: 'event-detail', component: { template: '<div />' } }
  ]
})
const mountView = () => mount(EventListView, { global: { plugins: [vuetify, router] } })
const value = (w: ReturnType<typeof mountView>, label: string) =>
  (w.find(`input[aria-label="${label}"]`).element as HTMLInputElement).value

describe('EventListView', () => {
  beforeEach(async () => {
    fetchEvents.mockReset()
    useEventStore().clearEvents()
    await router.push('/events')
  })

  it('初期状態では取得せず、案内メッセージ(URL入り)と空のテーブルを表示する', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(fetchEvents).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('東京都のイベント一覧を取得します。')
    expect(wrapper.text()).toContain('https://api.data.metro.tokyo.lg.jp/v1/Event?limit=10')
    expect(wrapper.findAll('input.excel-cell[aria-label^="イベント名"]')).toHaveLength(10)
    expect(value(wrapper, 'イベント名1')).toBe('')
  })

  it('行を追加ボタンを表示しない', () => {
    expect(mountView().find('button.add-row').exists()).toBe(false)
  })

  it('すべてのセルが編集不可で、ダブルクリックや文字入力でも編集できない', async () => {
    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: 'ボッチャ体験教室' }] }])
    const wrapper = mountView()
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    const inputs = wrapper.findAll('input.excel-cell')
    expect(inputs.length).toBeGreaterThan(0)
    expect(inputs.every((i) => i.attributes('readonly') !== undefined)).toBe(true)
    const cell = wrapper.find('input[aria-label="イベント名1"]')
    await cell.trigger('dblclick')
    await cell.trigger('keydown', { key: 'a' })
    expect(cell.attributes('readonly')).toBeDefined()
    expect(value(wrapper, 'イベント名1')).toBe('ボッチャ体験教室')
  })

  it('データ行をダブルクリックすると詳細画面へ遷移し、空行では遷移しない', async () => {
    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: 'A' }] }, { 名称: [{ 表記: 'B' }] }])
    const wrapper = mountView()
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    await wrapper.find('input[aria-label="イベント名2"]').trigger('dblclick')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/events/1'))

    await router.push('/events')
    await wrapper.find('input[aria-label="イベント名5"]').trigger('dblclick')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/events')
  })

  it('詳細画面で編集したセルと行番号を背景色で強調する', async () => {
    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: 'A' }] }, { 名称: [{ 表記: 'B' }] }])
    const wrapper = mountView()
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.excel-cell.changed')).toHaveLength(0)

    useEventStore().events.value[1].名称![0].表記 = 'B2'
    await flushPromises()
    expect(wrapper.findAll('.excel-cell.changed')).toHaveLength(1)
    expect(wrapper.find('input[aria-label="イベント名2"]').classes()).toContain('changed')
    expect(wrapper.findAll('th.row-header.changed')).toHaveLength(1)
  })

  it('ヘッダーにソートボタンがあり、並べ替えても詳細画面は元のデータを開く', async () => {
    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: 'B' }] }, { 名称: [{ 表記: 'A' }] }])
    const wrapper = mountView()
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('button.sort-btn')).toHaveLength(12)
    await wrapper.find('button[aria-label="イベント名を並べ替え"]').trigger('click')
    expect(value(wrapper, 'イベント名1')).toBe('A')
    await wrapper.find('input[aria-label="イベント名1"]').trigger('dblclick')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/events/1'))
  })

  it('全列にフィルタがあり、絞り込んだ行をダブルクリックしても元のデータを開く', async () => {
    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: 'ボッチャ' }] }, { 名称: [{ 表記: 'クルーズ' }] }])
    const wrapper = mountView()
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('input.filter-input')).toHaveLength(12)
    await wrapper.find('input[aria-label="イベント名のフィルタ"]').setValue('クルーズ')
    expect(wrapper.findAll('input.excel-cell[aria-label^="イベント名"]')).toHaveLength(1)
    await wrapper.find('input.excel-cell[aria-label^="イベント名"]').trigger('dblclick')
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/events/1'))
  })

  it('取得済みデータは再表示時にも残る', async () => {
    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: '保持' }] }])
    const first = mountView()
    await first.find('button.fetch-events').trigger('click')
    await flushPromises()
    first.unmount()
    expect(value(mountView(), 'イベント名1')).toBe('保持')
  })

  it('取得件数の選択がデフォルト10で、取得ボタンで取得結果を表示する', async () => {
    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: 'ボッチャ体験教室' }], 開催場所: { 表記: '水元小合学園' } }])
    const wrapper = mountView()
    expect(wrapper.findComponent({ name: 'VSelect' }).props('modelValue')).toBe(10)
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    expect(fetchEvents).toHaveBeenCalledWith(10)
    expect(value(wrapper, 'イベント名1')).toBe('ボッチャ体験教室')
    expect(value(wrapper, '開催場所1')).toBe('水元小合学園')
  })

  it('選択した件数がURL表示と取得に反映される', async () => {
    fetchEvents.mockResolvedValue([])
    const wrapper = mountView()
    await wrapper.findComponent({ name: 'VSelect' }).setValue(20)
    expect(wrapper.text()).toContain('Event?limit=20')
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    expect(fetchEvents).toHaveBeenCalledWith(20)
  })

  it('取得失敗時はエラーを表示し、再度取得できる', async () => {
    fetchEvents.mockRejectedValueOnce(new Error('通信エラー'))
    const wrapper = mountView()
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('通信エラー')

    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: '復旧イベント' }] }])
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('通信エラー')
    expect(value(wrapper, 'イベント名1')).toBe('復旧イベント')
  })
})

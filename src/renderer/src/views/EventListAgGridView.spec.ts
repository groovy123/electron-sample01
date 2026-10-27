import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { ColDef } from 'ag-grid-community'
import EventListAgGridView from './EventListAgGridView.vue'
import { useEventStore } from '../composables/useEventStore'

const vuetify = createVuetify({ components, directives })
const fetchEvents = vi.fn()
const exportDataAsExcel = vi.fn()

vi.mock('../services/eventApi', async (orig) => ({
  ...(await orig<typeof import('../services/eventApi')>()),
  fetchEvents: (limit: number) => fetchEvents(limit)
}))

/** AG Grid本体はjsdomで描画できないため、受け取ったpropsを検証できるスタブに差し替える */
const AgGridVueStub = defineComponent({
  name: 'AgGridVue',
  props: {
    rowData: { type: Array, default: () => [] },
    columnDefs: { type: Array, default: () => [] },
    defaultColDef: { type: Object, default: () => ({}) },
    rowNumbers: { type: Boolean, default: false },
    localeText: { type: Object, default: () => ({}) },
    cellSelection: { type: Boolean, default: false },
    sideBar: { type: Array, default: () => [] }
  },
  emits: ['grid-ready', 'row-double-clicked'],
  mounted() {
    this.$emit('grid-ready', { api: { exportDataAsExcel } })
  },
  template: '<div class="ag-stub" />'
})

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/events-ag-grid', component: EventListAgGridView },
    { path: '/events/:index', name: 'event-detail', component: { template: '<div />' } }
  ]
})
const mountView = () =>
  mount(EventListAgGridView, { global: { plugins: [vuetify, router], stubs: { AgGridVue: AgGridVueStub } } })
const grid = (w: ReturnType<typeof mountView>) => w.findComponent(AgGridVueStub)
const rows = (w: ReturnType<typeof mountView>) => grid(w).props('rowData') as { index: number; cells: string[] }[]
const colDefs = (w: ReturnType<typeof mountView>) => grid(w).props('columnDefs') as ColDef[]

describe('EventListAgGridView', () => {
  beforeEach(async () => {
    fetchEvents.mockReset()
    exportDataAsExcel.mockReset()
    useEventStore().clearEvents()
    await router.push('/events-ag-grid')
  })

  it('初期状態では取得せず、案内メッセージ(URL入り)と空のグリッドを表示する', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(fetchEvents).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('東京都のイベント一覧を取得します。')
    expect(wrapper.text()).toContain('https://api.data.metro.tokyo.lg.jp/v1/Event?limit=10')
    expect(rows(wrapper)).toHaveLength(0)
    expect(wrapper.find('button.export-excel').attributes('disabled')).toBeDefined()
  })

  it('全列がソート・フィルタ可能で、読み取り専用・行番号付きである', () => {
    const wrapper = mountView()
    expect(colDefs(wrapper).map((c) => c.headerName)).toEqual([
      'ID', 'イベント名', '開始日', '終了日', '開始時間', '終了時間', '開催場所', '住所', '人数', '料金', '連絡先', '電話番号'
    ])
    expect(colDefs(wrapper).every((c) => c.filter === 'agSetColumnFilter')).toBe(true)
    expect(grid(wrapper).props('defaultColDef')).toMatchObject({ sortable: true, floatingFilter: true, editable: false, enableRowGroup: true })
    expect(grid(wrapper).props('rowNumbers')).toBe(true)
    expect(grid(wrapper).props('sideBar')).toEqual(['columns', 'filters'])
  })

  it('取得件数の選択がデフォルト10で、取得ボタンで取得結果を表示する', async () => {
    fetchEvents.mockResolvedValue([
      { ID: { 識別値: '1' }, 名称: [{ 表記: 'ボッチャ体験教室' }], 開催場所: { 表記: '水元小合学園' } }
    ])
    const wrapper = mountView()
    expect(wrapper.findComponent({ name: 'VSelect' }).props('modelValue')).toBe(10)
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    expect(fetchEvents).toHaveBeenCalledWith(10)
    const valueGetter = (i: number) => colDefs(wrapper)[i].valueGetter as (p: unknown) => string
    expect(valueGetter(1)({ data: rows(wrapper)[0] })).toBe('ボッチャ体験教室')
    expect(valueGetter(6)({ data: rows(wrapper)[0] })).toBe('水元小合学園')
    expect(valueGetter(1)({ data: undefined })).toBe('')
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

  it('行をダブルクリックすると元の位置の詳細画面へ遷移する', async () => {
    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: 'A' }] }, { 名称: [{ 表記: 'B' }] }])
    const wrapper = mountView()
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    grid(wrapper).vm.$emit('row-double-clicked', { data: rows(wrapper)[1] })
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/events/1'))
  })

  it('データのない行のダブルクリックでは遷移しない', async () => {
    const wrapper = mountView()
    grid(wrapper).vm.$emit('row-double-clicked', { data: undefined })
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/events-ag-grid')
  })

  it('詳細画面で編集したセルだけを changed クラスで強調する', async () => {
    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: 'A' }] }, { 名称: [{ 表記: 'B' }] }])
    const wrapper = mountView()
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    const isChanged = (row: number, col: number) =>
      (colDefs(wrapper)[col].cellClassRules!.changed as (p: unknown) => boolean)({ data: rows(wrapper)[row] })
    expect(isChanged(1, 1)).toBe(false)

    useEventStore().events.value[1].名称![0].表記 = 'B2'
    await flushPromises()
    expect(isChanged(1, 1)).toBe(true)
    expect(isChanged(0, 1)).toBe(false)
    expect(isChanged(1, 0)).toBe(false)
    expect(
      (colDefs(wrapper)[1].cellClassRules!.changed as (p: unknown) => boolean)({ data: undefined })
    ).toBe(false)
  })

  it('取得済みデータは再表示時にも残る', async () => {
    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: '保持' }] }])
    const first = mountView()
    await first.find('button.fetch-events').trigger('click')
    await flushPromises()
    first.unmount()
    expect(rows(mountView())).toHaveLength(1)
  })

  it('データ取得後にExcel出力でAG Gridのエクスポートを呼ぶ', async () => {
    fetchEvents.mockResolvedValue([{ 名称: [{ 表記: 'A' }] }])
    const wrapper = mountView()
    await wrapper.find('button.fetch-events').trigger('click')
    await flushPromises()
    await wrapper.find('button.export-excel').trigger('click')
    expect(exportDataAsExcel).toHaveBeenCalledWith({ fileName: 'イベント一覧.xlsx' })
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
    expect(rows(wrapper)).toHaveLength(1)
  })
})

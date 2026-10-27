import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { ColDef } from 'ag-grid-community'
import FacilityListView from './FacilityListView.vue'

const vuetify = createVuetify({ components, directives })
const fetchFacilities = vi.fn()
const exportDataAsExcel = vi.fn()

vi.mock('../services/facilityApi', async (orig) => ({
  ...(await orig<typeof import('../services/facilityApi')>()),
  fetchFacilities: () => fetchFacilities()
}))

/** AG Grid本体はjsdomで描画できないため、受け取ったpropsを検証できるスタブに差し替える */
const AgGridVueStub = defineComponent({
  name: 'AgGridVue',
  props: {
    rowData: { type: Array, default: () => [] },
    columnDefs: { type: Array, default: () => [] },
    defaultColDef: { type: Object, default: () => ({}) },
    localeText: { type: Object, default: () => ({}) },
    pagination: { type: Boolean, default: false },
    paginationPageSize: { type: Number, default: 0 },
    paginationPageSizeSelector: { type: Boolean, default: true },
    sideBar: { type: Array, default: () => [] },
    grandTotalRow: { type: String, default: undefined }
  },
  emits: ['grid-ready'],
  mounted() {
    this.$emit('grid-ready', { api: { exportDataAsExcel } })
  },
  template: '<div class="ag-stub" />'
})

const mountView = () => mount(FacilityListView, { global: { plugins: [vuetify], stubs: { AgGridVue: AgGridVueStub } } })
const grid = (w: ReturnType<typeof mountView>) => w.findComponent(AgGridVueStub)
const rows = (w: ReturnType<typeof mountView>) => grid(w).props('rowData') as Record<string, string>[]

describe('FacilityListView', () => {
  beforeEach(() => {
    fetchFacilities.mockReset()
    exportDataAsExcel.mockReset()
  })

  it('初期状態では取得せず、案内メッセージ(URL入り)と空のグリッドを表示する', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(fetchFacilities).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('東京都の公共施設一覧を取得します。')
    expect(wrapper.text()).toContain('https://api.data.metro.tokyo.lg.jp/v1/PublicFacility?limit=1000')
    expect(rows(wrapper)).toHaveLength(0)
    expect(wrapper.find('.facility-count').exists()).toBe(false)
    expect(wrapper.find('button.export-excel').attributes('disabled')).toBeDefined()
  })

  it('1ページ20件のページングで、ページサイズの選択は出さない', () => {
    const wrapper = mountView()
    expect(grid(wrapper).props('pagination')).toBe(true)
    expect(grid(wrapper).props('paginationPageSize')).toBe(20)
    expect(grid(wrapper).props('paginationPageSizeSelector')).toBe(false)
  })

  it('Valuesの全体集計を、ページに関係なく見える最下部の合計行に固定表示する', () => {
    expect(grid(mountView()).props('grandTotalRow')).toBe('pinnedBottom')
  })

  it('右端のサイドバーにColumnsとFiltersを表示する', () => {
    expect(grid(mountView()).props('sideBar')).toEqual(['columns', 'filters'])
  })

  it('全列がソート・フィルタ可能で読み取り専用', () => {
    const wrapper = mountView()
    const defs = grid(wrapper).props('columnDefs') as ColDef[]
    expect(defs.map((c) => c.headerName)).toEqual([
      'ID', '施設名', 'カナ', '郵便番号', '住所', '電話番号', '利用可能時間', '利用可能日', 'アクセス', '説明',
      '2026/1来場者数', '2026/2来場者数', '2026/3来場者数', '2026/4来場者数', '2026/5来場者数', '2026/6来場者数'
    ])
    expect(defs.slice(0, 10).every((c) => c.filter === 'agSetColumnFilter')).toBe(true)
    expect(grid(wrapper).props('defaultColDef')).toMatchObject({ sortable: true, floatingFilter: true,
      editable: false,
      enableRowGroup: true
    })
  })

  it('取得ボタンで全件を取得して表示し、件数を表示する', async () => {
    fetchFacilities.mockResolvedValue(
      Array.from({ length: 45 }, (_, i) => ({ ID: { 識別値: String(i) }, 名称: { 表記: `施設${i}` } }))
    )
    const wrapper = mountView()
    await wrapper.find('button.fetch-facilities').trigger('click')
    await flushPromises()
    expect(fetchFacilities).toHaveBeenCalledOnce()
    expect(rows(wrapper)).toHaveLength(45)
    expect(rows(wrapper)[1]).toMatchObject({ ID: '1', 施設名: '施設1', 住所: '' })
    expect(wrapper.find('.facility-count').text()).toBe('全45件')
    expect(wrapper.find('button.export-excel').attributes('disabled')).toBeUndefined()
  })

  it('2026年1月〜6月の来場者数が数値列で、Valuesに指定できる', async () => {
    fetchFacilities.mockResolvedValue([{ ID: { 識別値: '1' } }, { ID: { 識別値: '2' } }])
    const wrapper = mountView()
    await wrapper.find('button.fetch-facilities').trigger('click')
    await flushPromises()
    const visitorDefs = (grid(wrapper).props('columnDefs') as ColDef[]).slice(10)
    expect(visitorDefs).toHaveLength(6)
    for (const def of visitorDefs) {
      expect(def).toMatchObject({
        type: 'numericColumn',
        filter: 'agNumberColumnFilter',
        enableValue: true,
        enableRowGroup: false,
        defaultAggFunc: 'sum',
        allowedAggFuncs: ['sum', 'avg', 'min', 'max', 'count']
      })
      for (const row of rows(wrapper)) {
        const v = row[def.field!]
        expect(typeof v).toBe('number')
        expect(Number.isInteger(v)).toBe(true)
      }
    }
  })

  it('取得結果が0件のときは「全0件」を表示する', async () => {
    fetchFacilities.mockResolvedValue([])
    const wrapper = mountView()
    await wrapper.find('button.fetch-facilities').trigger('click')
    await flushPromises()
    expect(wrapper.find('.facility-count').text()).toBe('全0件')
  })

  it('Excel出力でAG Gridのエクスポートを呼ぶ', async () => {
    fetchFacilities.mockResolvedValue([{ 名称: { 表記: 'A' } }])
    const wrapper = mountView()
    await wrapper.find('button.fetch-facilities').trigger('click')
    await flushPromises()
    await wrapper.find('button.export-excel').trigger('click')
    expect(exportDataAsExcel).toHaveBeenCalledWith({ fileName: '公共施設一覧.xlsx' })
  })

  it('取得失敗時はエラーを表示し、再度取得できる', async () => {
    fetchFacilities.mockRejectedValueOnce(new Error('通信エラー'))
    const wrapper = mountView()
    await wrapper.find('button.fetch-facilities').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('通信エラー')

    fetchFacilities.mockResolvedValue([{ 名称: { 表記: '復旧' } }])
    await wrapper.find('button.fetch-facilities').trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('通信エラー')
    expect(rows(wrapper)).toHaveLength(1)
  })

  it('エラー以外の例外でも既定のメッセージを表示する', async () => {
    fetchFacilities.mockRejectedValueOnce('x')
    const wrapper = mountView()
    await wrapper.find('button.fetch-facilities').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('外部APIの取得に失敗しました')
  })
})

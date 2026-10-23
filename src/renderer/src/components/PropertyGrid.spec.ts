import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PropertyGrid from './PropertyGrid.vue'
import type { PropertyRow } from '../composables/usePropertyGrid'

const vuetify = createVuetify({ components, directives })

const makeRows = (): PropertyRow[] => [
  { key: '名前', type: 'string', value: '山田', editable: false },
  { key: '年齢', type: 'number', value: '34' },
  { key: '性別', type: 'select', value: '男', options: ['男', '女'] },
  { key: '生年月日', type: 'date', value: '1991-05-12' }
]
const mountGrid = (rows = makeRows()) => mount(PropertyGrid, { props: { rows }, global: { plugins: [vuetify] } })

describe('PropertyGrid', () => {
  it('ヘッダーはブランク・キー・値の3列', () => {
    const wrapper = mountGrid()
    expect(wrapper.findAll('th').map((h) => h.text())).toEqual(['', 'キー', '値'])
  })

  it('changed が true の行だけ強調クラスが付く', () => {
    const wrapper = mount(PropertyGrid, { props: { rows: makeRows(), changed: [false, true] }, global: { plugins: [vuetify] } })
    const trs = wrapper.findAll('tbody tr')
    expect(trs.map((t) => t.classes().includes('changed'))).toEqual([false, true, false, false])
  })

  it('行番号・キーを表示する', () => {
    const wrapper = mountGrid()
    expect(wrapper.findAll('td.row-no').map((c) => c.text())).toEqual(['1', '2', '3', '4'])
    expect(wrapper.findAll('td.key').map((c) => c.text())).toEqual(['名前', '年齢', '性別', '生年月日'])
  })

  it('型に応じた入力コンポーネントを表示する', () => {
    const wrapper = mountGrid()
    expect(wrapper.findAllComponents({ name: 'VAutocomplete' })).toHaveLength(1)
    expect(wrapper.findAllComponents({ name: 'VNumberInput' })).toHaveLength(1)
    expect(wrapper.find('input[type="date"]').exists()).toBe(true)
  })

  it('編集不可の行は無効化される', () => {
    const wrapper = mountGrid()
    expect(wrapper.find('input[aria-label="名前"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('input[aria-label="年齢"]').attributes('disabled')).toBeUndefined()
  })

  it('編集可能な行の値を変更すると change が発火する', async () => {
    const wrapper = mountGrid()
    await wrapper.find('input[aria-label="年齢"]').setValue('40')
    expect(wrapper.emitted('change')).toEqual([[1, '40']])
  })

  it('数値行には数値以外を入力できない', async () => {
    const wrapper = mountGrid()
    await wrapper.find('input[aria-label="年齢"]').setValue('4x')
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('数値行は右寄せのクラスを持つ', () => {
    expect(mountGrid().find('.number-input').exists()).toBe(true)
  })

  it('セレクト行の選択を change で通知し、クリアすると空になる', async () => {
    const wrapper = mountGrid()
    const picker = wrapper.findComponent({ name: 'VAutocomplete' })
    picker.vm.$emit('update:modelValue', '女')
    picker.vm.$emit('update:modelValue', null)
    expect(wrapper.emitted('change')).toEqual([[2, '女'], [2, '']])
  })

  it('boolean行はスイッチで、切り替えを true / false で通知する', async () => {
    const rows: PropertyRow[] = [{ key: '有効', type: 'boolean', value: '' }]
    const wrapper = mountGrid(rows)
    expect(wrapper.find('.v-switch').exists()).toBe(true)
    const sw = wrapper.find('input[aria-label="有効"]')
    expect((sw.element as HTMLInputElement).checked).toBe(false)
    await sw.setValue(true)
    await wrapper.find('input[aria-label="有効"]').setValue(false)
    expect(wrapper.emitted('change')).toEqual([[0, 'true'], [0, 'false']])
  })

  it('編集不可のboolean行はスイッチが無効になる', () => {
    const wrapper = mountGrid([{ key: '有効', type: 'boolean', value: 'true', editable: false }])
    expect(wrapper.find('input[aria-label="有効"]').attributes('disabled')).toBeDefined()
  })

  it('日付行はカレンダーの値を反映する', async () => {
    const wrapper = mountGrid()
    await wrapper.find('input[type="date"]').setValue('2000-01-02')
    expect(wrapper.emitted('change')).toEqual([[3, '2000-01-02']])
  })
})

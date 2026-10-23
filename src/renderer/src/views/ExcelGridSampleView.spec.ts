import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ExcelGridSampleView from './ExcelGridSampleView.vue'

const vuetify = createVuetify({ components, directives })

/** 画面をマウントする */
function mountView(): ReturnType<typeof mount> {
  return mount(ExcelGridSampleView, { global: { plugins: [vuetify] } })
}

/** チェックボックスを切り替える */
async function toggle(wrapper: ReturnType<typeof mount>, cls: string): Promise<void> {
  await wrapper.find(`.${cls} input`).setValue(!(wrapper.find(`.${cls} input`).element as HTMLInputElement).checked)
}

describe('ExcelGridSampleView', () => {
  it('Element Plus に切り替えてもオプションが効く', async () => {
    const wrapper = mountView()
    expect(wrapper.find('.opt-allowAddRow.el-checkbox').exists()).toBe(false)
    await wrapper.findAll('.library-toggle button')[1].trigger('click')
    expect(wrapper.find('.opt-allowAddRow.el-checkbox').exists()).toBe(true)
    await wrapper.find('.opt-allowAddRow input').setValue(false)
    expect(wrapper.find('.add-row').exists()).toBe(false)
    await wrapper.findAll('.library-toggle button')[0].trigger('click')
    expect((wrapper.find('.opt-allowAddRow input').element as HTMLInputElement).checked).toBe(false)
  })

  it('文字列・数値・日付・セレクトの列と初期データを表示する', () => {
    const wrapper = mountView()
    const text = wrapper.text()
    for (const name of ['名前(文字列)', '数量(数値)', '期限(日付)', '状態(選択)', '確認済(スイッチ)']) expect(text).toContain(name)
    expect(wrapper.find('input[type="date"]').exists()).toBe(true)
    expect(wrapper.find('.v-autocomplete').exists()).toBe(true)
    expect(wrapper.find('.v-number-input').exists()).toBe(true)
    expect(wrapper.find('.v-switch').exists()).toBe(true)
    expect((wrapper.find('input[aria-label="名前(文字列)1"]').element as HTMLInputElement).value).toBe('りんご')
  })

  it('初期状態では行追加・出力・ソート・フィルタが有効で強調はない', () => {
    const wrapper = mountView()
    expect(wrapper.find('.add-row').exists()).toBe(true)
    expect(wrapper.find('.download-xlsx').exists()).toBe(true)
    expect(wrapper.find('.sort-btn').exists()).toBe(true)
    expect(wrapper.find('.filter-input').exists()).toBe(true)
    expect(wrapper.find('.excel-cell.changed').exists()).toBe(false)
  })

  it('チェックボックスで行追加・出力を切り替える', async () => {
    const wrapper = mountView()
    await toggle(wrapper, 'opt-allowAddRow')
    await toggle(wrapper, 'opt-allowExport')
    expect(wrapper.find('.add-row').exists()).toBe(false)
    expect(wrapper.find('.download-xlsx').exists()).toBe(false)
  })

  it('チェックボックスでソート・フィルタを切り替える', async () => {
    const wrapper = mountView()
    await toggle(wrapper, 'opt-sortable')
    await toggle(wrapper, 'opt-filterable')
    expect(wrapper.find('.sort-btn').exists()).toBe(false)
    expect(wrapper.find('.filter-input').exists()).toBe(false)
  })

  it('読み取り専用にするとスイッチが切り替えられなくなる', async () => {
    const wrapper = mountView()
    await toggle(wrapper, 'opt-readonly')
    const sw = wrapper.find('input[aria-label="確認済(スイッチ)2"]')
    await sw.setValue(true)
    expect((wrapper.find('input[aria-label="確認済(スイッチ)2"]').element as HTMLInputElement).checked).toBe(false)
  })

  it('強調をONにするとセルが強調される', async () => {
    const wrapper = mountView()
    await toggle(wrapper, 'opt-highlight')
    expect(wrapper.findAll('.excel-cell.changed')).toHaveLength(2)
  })

  it('行のダブルクリックで通知を表示する', async () => {
    const wrapper = mountView()
    await wrapper.find('input[aria-label="名前(文字列)2"]').trigger('dblclick')
    expect(wrapper.find('.dblclick-message').text()).toContain('2行目')
  })
})

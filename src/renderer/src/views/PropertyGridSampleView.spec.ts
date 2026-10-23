import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PropertyGridSampleView from './PropertyGridSampleView.vue'

const vuetify = createVuetify({ components, directives })

/** 画面をマウントする */
function mountView(): ReturnType<typeof mount> {
  return mount(PropertyGridSampleView, { global: { plugins: [vuetify] } })
}

/** n枚目(0始まり)のカード内の入力欄を探す */
function field(wrapper: ReturnType<typeof mount>, card: number, label: string): ReturnType<ReturnType<typeof mount>['find']> {
  return wrapper.findAll('.property-card')[card].find(`input[aria-label="${label}"]`)
}

describe('PropertyGridSampleView', () => {
  it('ExcelGridサンプルの先頭4件を、1件1枚のカードで表示する', () => {
    const wrapper = mountView()
    const cards = wrapper.findAll('.property-card')
    expect(cards.map((c) => c.find('.v-card-title').text())).toEqual(['りんごの情報', 'みかんの情報', 'ぶどうの情報', 'ももの情報'])
    expect(wrapper.text()).not.toContain('メロン')
    expect((field(wrapper, 0, '名前(文字列)').element as HTMLInputElement).value).toBe('りんご')
    expect((field(wrapper, 1, '数量(数値)').element as HTMLInputElement).value).toBe('35.5')
    expect((field(wrapper, 2, '期限(日付)').element as HTMLInputElement).value).toBe('2026-12-24')
    expect((field(wrapper, 2, '確認済(スイッチ)').element as HTMLInputElement).checked).toBe(true)
  })

  it('文字列・数値・セレクト・日付・スイッチの部品を各カードに表示する', () => {
    const card = mountView().findAll('.property-card')[0]
    expect(card.find('.v-number-input').exists()).toBe(true)
    expect(card.find('.v-autocomplete').exists()).toBe(true)
    expect(card.find('input[type="date"]').exists()).toBe(true)
    expect(card.find('.v-switch').exists()).toBe(true)
  })

  it('値を変更したカードの行だけが強調され、メッセージが出る', async () => {
    const wrapper = mountView()
    await field(wrapper, 1, '数量(数値)').setValue('40')
    const counts = wrapper.findAll('.property-card').map((c) => c.findAll('tbody tr.changed').length)
    expect(counts).toEqual([0, 1, 0, 0])
    expect(wrapper.find('.change-message').text()).toContain('みかんの情報')
  })

  it('強調をOFFにすると編集済みでも強調されない', async () => {
    const wrapper = mountView()
    await field(wrapper, 0, '数量(数値)').setValue('40')
    await wrapper.find('.opt-highlight input').setValue(false)
    expect(wrapper.findAll('tbody tr.changed')).toHaveLength(0)
  })

  it('全行を編集不可にすると、すべての入力が無効になり、戻すと有効に戻る', async () => {
    const wrapper = mountView()
    await wrapper.find('.opt-readonly input').setValue(true)
    expect(wrapper.findAll('tbody input').every((i) => i.attributes('disabled') !== undefined)).toBe(true)
    await wrapper.find('.opt-readonly input').setValue(false)
    expect(field(wrapper, 0, '名前(文字列)').attributes('disabled')).toBeUndefined()
  })

  it('「初期値に戻す」で値・強調・メッセージが初期化される', async () => {
    const wrapper = mountView()
    await field(wrapper, 0, '数量(数値)').setValue('40')
    await wrapper.find('.reset').trigger('click')
    expect((field(wrapper, 0, '数量(数値)').element as HTMLInputElement).value).toBe('120')
    expect(wrapper.findAll('tbody tr.changed')).toHaveLength(0)
    expect(wrapper.find('.change-message').exists()).toBe(false)
  })
})

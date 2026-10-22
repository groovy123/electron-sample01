import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HeaderTitle from './HeaderTitle.vue'
import { stubLocalStorage } from '../test-storage'

const vuetify = createVuetify({ components, directives })

describe('HeaderTitle', () => {
  beforeEach(() => stubLocalStorage())

  it('初期タイトルを表示する', () => {
    const w = mount(HeaderTitle, { props: { defaultTitle: '既定' }, global: { plugins: [vuetify] } })
    expect(w.find('.header-title-text').text()).toBe('既定')
  })

  it('クリックで編集しEnterで確定する', async () => {
    const w = mount(HeaderTitle, { props: { defaultTitle: '既定' }, global: { plugins: [vuetify] } })
    await w.find('.header-title').trigger('click')
    const input = w.find('input')
    await input.setValue('新しいタイトル')
    await input.trigger('keyup', { key: 'Enter' })
    await flushPromises()
    expect(w.find('.header-title-text').text()).toBe('新しいタイトル')
  })

  it('Escで編集をキャンセルする', async () => {
    const w = mount(HeaderTitle, { props: { defaultTitle: '既定' }, global: { plugins: [vuetify] } })
    await w.find('.header-title').trigger('click')
    const input = w.find('input')
    await input.setValue('破棄')
    await input.trigger('keyup', { key: 'Escape' })
    await flushPromises()
    expect(w.find('.header-title-text').text()).toBe('既定')
  })
})

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AboutView from './AboutView.vue'

const vuetify = createVuetify({ components, directives })

describe('AboutView', () => {
  it('技術スタックの一覧を表示する', () => {
    const wrapper = mount(AboutView, {
      global: { plugins: [vuetify] }
    })
    expect(wrapper.text()).toContain('Vue.js 3 (Composition API)')
    expect(wrapper.text()).toContain('Electron')
  })
})

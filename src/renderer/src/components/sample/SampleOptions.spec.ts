import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { defaultSampleOptions } from '../../composables/useSampleOptions'
import SampleOptionsElement from './SampleOptionsElement.vue'
import SampleOptionsVuetify from './SampleOptionsVuetify.vue'

const vuetify = createVuetify({ components, directives })

describe.each([
  ['Vuetify', SampleOptionsVuetify],
  ['Element Plus', SampleOptionsElement]
])('%s版オプション欄', (_name, Component) => {
  it('6個のチェックボックスを表示し、変更をv-modelに通知する', async () => {
    const wrapper = mount(Component, { props: { modelValue: defaultSampleOptions() }, global: { plugins: [vuetify] } })
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(6)
    await wrapper.find('.opt-readonly input').setValue(true)
    const emitted = wrapper.emitted('update:modelValue')?.[0]?.[0] as ReturnType<typeof defaultSampleOptions>
    expect(emitted.readonly).toBe(true)
    expect(emitted.allowAddRow).toBe(true)
  })
})

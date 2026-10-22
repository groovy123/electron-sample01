import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import EventDetailView from './EventDetailView.vue'
import PropertyGrid from '../components/PropertyGrid.vue'
import { useEventStore } from '../composables/useEventStore'

const vuetify = createVuetify({ components, directives })
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/events', component: { template: '<div />' } },
    { path: '/events/:index', component: EventDetailView }
  ]
})

async function mountAt(path: string): Promise<ReturnType<typeof mount>> {
  await router.push(path)
  await router.isReady()
  return mount(EventDetailView, { global: { plugins: [vuetify, router] } })
}

describe('EventDetailView', () => {
  beforeEach(() => {
    useEventStore().setEvents([{ 名称: [{ 表記: 'ボッチャ' }], ID: { 識別値: '07' }, 開催場所: { 表記: '水元' } }])
  })

  it('4つのカードにカテゴリごとのPropertyGridを表示する', async () => {
    const wrapper = await mountAt('/events/0')
    expect(wrapper.findAll('.property-card')).toHaveLength(4)
    expect(wrapper.findAllComponents(PropertyGrid)).toHaveLength(4)
    expect(wrapper.text()).toContain('基本情報')
    expect(wrapper.text()).toContain('料金・連絡先')
    expect((wrapper.find('input[aria-label="イベント名"]').element as HTMLInputElement).value).toBe('ボッチャ')
  })

  it('値を更新するとイベントに反映される', async () => {
    const wrapper = await mountAt('/events/0')
    await wrapper.find('input[aria-label="開催場所"]').setValue('新会場')
    expect(useEventStore().events.value[0].開催場所?.表記).toBe('新会場')
  })

  it('編集した行だけ背景色で強調し、元の値に戻すと解除される', async () => {
    const wrapper = await mountAt('/events/0')
    expect(wrapper.findAll('tr.changed')).toHaveLength(0)
    const input = wrapper.find('input[aria-label="開催場所"]')
    await input.setValue('新会場')
    const changed = wrapper.findAll('tr.changed')
    expect(changed).toHaveLength(1)
    expect(changed[0].text()).toContain('開催場所')
    await input.setValue('水元')
    expect(wrapper.findAll('tr.changed')).toHaveLength(0)
  })

  it('存在しないイベントでは警告を表示する', async () => {
    const wrapper = await mountAt('/events/9')
    expect(wrapper.text()).toContain('イベントが見つかりません')
    expect(wrapper.findAll('.property-card')).toHaveLength(0)
  })

  it('一覧に戻るボタンで一覧へ遷移する', async () => {
    const wrapper = await mountAt('/events/0')
    await wrapper.find('button.back').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/events')
  })
})

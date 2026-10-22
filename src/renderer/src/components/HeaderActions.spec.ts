import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HeaderActions from './HeaderActions.vue'

const vuetify = createVuetify({ components, directives })

/** テスト用のルーターを生成する */
function createTestRouter(): Router {
  const stub = { template: '<div />' }
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: stub }
    ]
  })
}

let wrapper: VueWrapper | undefined

/** コンポーネントをbodyにマウントする（メニューはteleportされるため） */
async function mountHeader(router: Router = createTestRouter()): Promise<{ w: VueWrapper; router: Router }> {
  wrapper = mount(HeaderActions, { attachTo: document.body, global: { plugins: [router, vuetify] } })
  await router.isReady()
  await flushPromises()
  return { w: wrapper, router }
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

describe('HeaderActions', () => {
  it('アラート通知・ユーザー名を表示し、検索ボックスは表示しない', async () => {
    const { w } = await mountHeader()
    expect(w.find('input[placeholder="検索"]').exists()).toBe(false)
    expect(w.find('button[aria-label="アラート通知"]').exists()).toBe(true)
    expect(w.find('.user-name').text()).toContain('山田 太郎')
  })

  it('未読アラート件数をバッジに表示する', async () => {
    const { w } = await mountHeader()
    expect(w.find('.v-badge__badge').text()).toBe('3')
  })

  it('ベルをクリックするとアラート一覧を表示する', async () => {
    const { w } = await mountHeader()
    await w.find('button[aria-label="アラート通知"]').trigger('click')
    await flushPromises()
    expect(document.body.querySelectorAll('.alert-item')).toHaveLength(3)
  })

  it('アラートをクリックすると既読になりバッジ件数が減る', async () => {
    const { w } = await mountHeader()
    await w.find('button[aria-label="アラート通知"]').trigger('click')
    await flushPromises()
    ;(document.body.querySelector('.alert-item') as HTMLElement).click()
    await flushPromises()
    expect(w.find('.v-badge__badge').text()).toBe('2')
  })

  it('「すべて既読」でバッジが消える', async () => {
    const { w } = await mountHeader()
    await w.find('button[aria-label="アラート通知"]').trigger('click')
    await flushPromises()
    ;(document.body.querySelector('.mark-all-read') as HTMLElement).click()
    await flushPromises()
    expect(w.find('.v-badge__badge').isVisible()).toBe(false)
  })
})

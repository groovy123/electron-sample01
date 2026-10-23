import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ExcelGrid from './ExcelGrid.vue'
import { copyTable, downloadXlsx } from '../services/gridExport'
import type { ColumnDefinition } from '../composables/useExcelGrid'

vi.mock('../services/gridExport', () => ({
  copyTable: vi.fn().mockResolvedValue(undefined),
  downloadXlsx: vi.fn().mockResolvedValue(undefined)
}))

const vuetify = createVuetify({ components, directives })

/** テスト用の列定義 */
const columns: ColumnDefinition[] = [
  { name: 'A', type: 'string', width: 120 },
  { name: 'B', type: 'string' },
  { name: 'C', type: 'string' }
]

/** テスト対象をマウントする */
function mountView(cols: ColumnDefinition[] = columns, rows = 20): ReturnType<typeof mount> {
  return mount(ExcelGrid, { props: { columns: cols, rows }, global: { plugins: [vuetify] }, attachTo: document.body })
}

describe('ExcelGrid', () => {
  it('列名と行番号のヘッダーを表示する', () => {
    const wrapper = mountView()
    const heads = wrapper.findAll('th.col-header .col-label').map((h) => h.text())
    expect(heads).toEqual(['A', 'B', 'C'])
    expect(wrapper.findAll('th.row-header')[0].text()).toBe('1')
    wrapper.unmount()
  })

  it('セルに入力した値が保持される', async () => {
    const wrapper = mountView()
    const cell = wrapper.find('input[aria-label="B2"]')
    await cell.trigger('dblclick')
    await cell.setValue('hello')
    expect((wrapper.find('input[aria-label="B2"]').element as HTMLInputElement).value).toBe('hello')
    wrapper.unmount()
  })

  it('readonly=true なら文字入力・ダブルクリック・F2で編集できない', async () => {
    const wrapper = mount(ExcelGrid, {
      props: { columns, rows: 3, initialData: [['x', 'y', 'z']], readonly: true },
      global: { plugins: [vuetify] }
    })
    const cell = wrapper.find('input[aria-label="A1"]')
    await cell.trigger('focus')
    await cell.trigger('dblclick')
    await cell.trigger('keydown', { key: 'F2' })
    await cell.trigger('keydown', { key: 'a' })
    expect(cell.attributes('readonly')).toBeDefined()
    expect(cell.classes()).not.toContain('editing')
    expect((cell.element as HTMLInputElement).value).toBe('x')
    wrapper.unmount()
  })

  it('セルのダブルクリックで行インデックスを通知する', async () => {
    const wrapper = mount(ExcelGrid, { props: { columns, rows: 3, readonly: true }, global: { plugins: [vuetify] } })
    await wrapper.find('input[aria-label="B2"]').trigger('dblclick')
    expect(wrapper.emitted('rowDblclick')).toEqual([[1]])
    wrapper.unmount()
  })

  it('changedCells のセルと該当行の行番号を強調する', () => {
    const wrapper = mount(ExcelGrid, {
      props: { columns, rows: 3, changedCells: [[false, true, false]] },
      global: { plugins: [vuetify] }
    })
    expect(wrapper.find('input[aria-label="B1"]').classes()).toContain('changed')
    expect(wrapper.find('input[aria-label="A1"]').classes()).not.toContain('changed')
    expect(wrapper.findAll('th.row-header.changed')).toHaveLength(1)
    wrapper.unmount()
  })

  it('ソート可能な列だけソートボタンを表示し、クリックで並べ替える', async () => {
    const wrapper = mount(ExcelGrid, {
      props: {
        columns: [{ name: 'A', type: 'string', sortable: true }, { name: 'B', type: 'string' }],
        rows: 2,
        initialData: [['b', '1'], ['a', '2']],
        changedCells: [[true, false]],
        readonly: true
      },
      global: { plugins: [vuetify] }
    })
    expect(wrapper.findAll('button.sort-btn')).toHaveLength(1)
    const value = (label: string): string => (wrapper.find(`input[aria-label="${label}"]`).element as HTMLInputElement).value
    await wrapper.find('button.sort-btn').trigger('click')
    expect([value('A1'), value('A2')]).toEqual(['a', 'b'])
    // 強調と行通知は元の行番号に追従する
    expect(wrapper.find('input[aria-label="A2"]').classes()).toContain('changed')
    expect(wrapper.find('input[aria-label="A1"]').classes()).not.toContain('changed')
    await wrapper.find('input[aria-label="A1"]').trigger('dblclick')
    expect(wrapper.emitted('rowDblclick')).toEqual([[1]])
    wrapper.unmount()
  })

  it('フィルタ可能な列だけ入力欄を表示し、入力で行を絞り込む', async () => {
    const wrapper = mount(ExcelGrid, {
      props: {
        columns: [{ name: 'A', type: 'string', filterable: true }, { name: 'B', type: 'string' }],
        rows: 3,
        initialData: [['apple', '1'], ['banana', '2'], ['apricot', '3']],
        changedCells: [[], [false, true]],
        readonly: true
      },
      global: { plugins: [vuetify] }
    })
    expect(wrapper.findAll('input.filter-input')).toHaveLength(1)
    expect(wrapper.findAll('input.excel-cell')).toHaveLength(6)
    await wrapper.find('input[aria-label="Aのフィルタ"]').setValue('ap')
    expect(wrapper.findAll('input[aria-label^="A"][class*="excel-cell"]')).toHaveLength(2)
    await wrapper.find('input[aria-label="A3"]').trigger('dblclick')
    expect(wrapper.emitted('rowDblclick')).toEqual([[2]])
    await wrapper.find('input[aria-label="Aのフィルタ"]').setValue('zzz')
    expect(wrapper.text()).toContain('条件に一致するデータがありません')
    wrapper.unmount()
  })

  it('フィルタ列がなければフィルタ行を表示しない', () => {
    const wrapper = mountView()
    expect(wrapper.find('input.filter-input').exists()).toBe(false)
    wrapper.unmount()
  })

  it('ダウンロード・コピーはフィルタとソート後の表示中の行を出力する', async () => {
    const wrapper = mount(ExcelGrid, {
      props: {
        columns: [{ name: 'A', type: 'string', sortable: true, filterable: true }, { name: 'B', type: 'number' }],
        rows: 3,
        initialData: [['b', '1'], ['a', '2'], ['c', '3']],
        fileName: 'テスト'
      },
      global: { plugins: [vuetify] }
    })
    await wrapper.find('input[aria-label="Aのフィルタ"]').setValue('a')
    await wrapper.find('button.download-xlsx').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.export-message').text()).toContain('ダウンロードしました'))
    expect(downloadXlsx).toHaveBeenCalledWith({ headers: ['A', 'B'], types: ['string', 'number'], rows: [['a', '2']] }, 'テスト')

    await wrapper.find('input[aria-label="Aのフィルタ"]').setValue('')
    await wrapper.find('button.sort-btn').trigger('click')
    await wrapper.find('button.copy-table').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.export-message').text()).toContain('コピーしました'))
    expect(vi.mocked(copyTable).mock.calls[0][0].rows).toEqual([['a', '2'], ['b', '1'], ['c', '3']])
    wrapper.unmount()
  })

  it('失敗時はエラーメッセージを表示する', async () => {
    vi.mocked(copyTable).mockRejectedValueOnce(new Error('denied'))
    vi.mocked(downloadXlsx).mockRejectedValueOnce(new Error('fail'))
    const wrapper = mountView()
    await wrapper.find('button.copy-table').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.export-message').text()).toContain('コピーに失敗'))
    await wrapper.find('button.download-xlsx').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.export-message').text()).toContain('ダウンロードに失敗'))
    wrapper.unmount()
  })

  it('allowExport=false なら出力ボタンを表示しない', () => {
    const wrapper = mount(ExcelGrid, { props: { columns, allowExport: false }, global: { plugins: [vuetify] } })
    expect(wrapper.find('button.download-xlsx').exists()).toBe(false)
    expect(wrapper.find('button.copy-table').exists()).toBe(false)
    wrapper.unmount()
  })

  it('allowAddRow=false なら行追加ボタンを表示しない', () => {
    const wrapper = mount(ExcelGrid, { props: { columns, allowAddRow: false }, global: { plugins: [vuetify] } })
    expect(wrapper.find('button.add-row').exists()).toBe(false)
    wrapper.unmount()
  })

  it('行追加ボタンで行が増え、列追加ボタンや型選択は無い', async () => {
    const wrapper = mountView()
    const rows = wrapper.findAll('tbody tr').length
    await wrapper.find('button.add-row').trigger('click')
    expect(wrapper.findAll('tbody tr')).toHaveLength(rows + 1)
    expect(wrapper.findAll('th.col-header')).toHaveLength(3)
    expect(wrapper.find('button.add-column').exists()).toBe(false)
    expect(wrapper.find('select').exists()).toBe(false)
    wrapper.unmount()
  })

  it('矢印キーとEnterでセル選択が移動する', async () => {
    const wrapper = mountView()
    const a1 = wrapper.find('input[aria-label="A1"]')
    await a1.trigger('focus')
    await a1.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('input.selected').attributes('aria-label')).toBe('B1')
    await wrapper.find('input.selected').trigger('keydown', { key: 'Enter' })
    expect(wrapper.find('input.selected').attributes('aria-label')).toBe('B2')
    await wrapper.find('input.selected').trigger('keydown', { key: 'a' })
    expect(wrapper.find('input.selected').attributes('aria-label')).toBe('B2')
    wrapper.unmount()
  })

  it('フォーカス中のセルにselectedクラスが付き、他のセルには付かない', async () => {
    const wrapper = mountView()
    await wrapper.find('input[aria-label="C3"]').trigger('focus')
    const selected = wrapper.findAll('input.selected')
    expect(selected).toHaveLength(1)
    expect(selected[0].attributes('aria-label')).toBe('C3')
    wrapper.unmount()
  })

  it('通常はreadonlyで、ダブルクリックで編集モードになる', async () => {
    const wrapper = mountView()
    const cell = wrapper.find('input[aria-label="A1"]')
    expect(cell.attributes('readonly')).toBeDefined()
    await cell.trigger('dblclick')
    expect(cell.attributes('readonly')).toBeUndefined()
    expect(cell.classes()).toContain('editing')
    wrapper.unmount()
  })

  it('F2で編集モードになる', async () => {
    const wrapper = mountView()
    const cell = wrapper.find('input[aria-label="A1"]')
    await cell.trigger('focus')
    await cell.trigger('keydown', { key: 'F2' })
    expect(cell.attributes('readonly')).toBeUndefined()
    wrapper.unmount()
  })

  it('編集中は矢印キーでセル移動せず、Enterで確定して下へ移動する', async () => {
    const wrapper = mountView()
    const a1 = wrapper.find('input[aria-label="A1"]')
    await a1.trigger('focus')
    await a1.trigger('dblclick')
    await a1.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('input.selected').attributes('aria-label')).toBe('A1')
    await a1.setValue('x')
    await a1.trigger('keydown', { key: 'Enter' })
    expect(a1.attributes('readonly')).toBeDefined()
    expect(wrapper.find('input.selected').attributes('aria-label')).toBe('A2')
    expect((a1.element as HTMLInputElement).value).toBe('x')
    wrapper.unmount()
  })

  it('Escapeで編集を取り消して元の値に戻る', async () => {
    const wrapper = mountView()
    const a1 = wrapper.find('input[aria-label="A1"]')
    await a1.trigger('focus')
    await a1.trigger('dblclick')
    await a1.setValue('temp')
    await a1.trigger('keydown', { key: 'Escape' })
    expect(a1.attributes('readonly')).toBeDefined()
    expect((wrapper.find('input[aria-label="A1"]').element as HTMLInputElement).value).toBe('')
    wrapper.unmount()
  })

  it('フォーカスが外れると編集モードが終了する', async () => {
    const wrapper = mountView()
    const a1 = wrapper.find('input[aria-label="A1"]')
    await a1.trigger('dblclick')
    await a1.trigger('blur')
    expect(a1.attributes('readonly')).toBeDefined()
    wrapper.unmount()
  })
})

describe('ExcelGrid 直接入力と列の型', () => {
  it('選択中のセルに文字を直接入力すると編集モードになり値が置き換わる', async () => {
    const wrapper = mountView()
    const a1 = wrapper.find('input[aria-label="A1"]')
    await a1.trigger('focus')
    await a1.setValue('old')
    await a1.trigger('keydown', { key: 'Enter' })
    await wrapper.find('input[aria-label="A1"]').trigger('focus')
    await a1.trigger('keydown', { key: 'x' })
    expect(a1.classes()).toContain('editing')
    expect((a1.element as HTMLInputElement).value).toBe('')
    wrapper.unmount()
  })

  it('Ctrl併用や矢印キーでは編集モードにならない', async () => {
    const wrapper = mountView()
    const a1 = wrapper.find('input[aria-label="A1"]')
    await a1.trigger('focus')
    await a1.trigger('keydown', { key: 'c', ctrlKey: true })
    expect(a1.classes()).not.toContain('editing')
    wrapper.unmount()
  })

  it('数値列は v-number-input で、既定は右寄せ。入力した数値が保持される', async () => {
    const wrapper = mountView([{ name: 'A', type: 'number' }, { name: 'B', type: 'number', align: 'left' }], 3)
    expect(wrapper.find('.v-number-input').exists()).toBe(true)
    expect(wrapper.find('.v-number-input').classes()).toContain('align-right')
    expect(wrapper.findAll('.v-number-input')[1].classes()).toContain('align-left')
    const a1 = wrapper.find('input[aria-label="A1"]')
    await a1.trigger('dblclick')
    await a1.setValue('-1.5')
    expect((a1.element as HTMLInputElement).value).toBe('-1.5')
    await a1.trigger('keydown', { key: 'Enter' })
    expect((wrapper.find('input[aria-label="A1"]').element as HTMLInputElement).value).toBe('-1.5')
    wrapper.unmount()
  })

  it('数値セルは編集中でなければ上下キーで値が増減せずセル移動する', async () => {
    const wrapper = mountView([{ name: 'A', type: 'number' }], 3)
    const a1 = wrapper.find('input[aria-label="A1"]')
    await a1.trigger('focus')
    await a1.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.find('input[aria-label="A1"]').element.closest('.excel-cell')?.classList.contains('selected')).toBe(false)
    expect(wrapper.find('input[aria-label="A2"]').element.closest('.excel-cell')?.classList.contains('selected')).toBe(true)
    expect((wrapper.find('input[aria-label="A1"]').element as HTMLInputElement).value).toBe('')
    wrapper.unmount()
  })

  it('日付列はYYYY-MM-DD形式のみ確定でき、不完全な値は元に戻る', async () => {
    const wrapper = mountView([{ name: 'A', type: 'string' }, { name: 'B', type: 'date' }])
    const b1 = wrapper.find('input[aria-label="B1"]')
    await b1.trigger('dblclick')
    await b1.setValue('2024-02-30x')
    expect((b1.element as HTMLInputElement).value).toBe('')
    await b1.setValue('2024-02-3')
    await b1.trigger('keydown', { key: 'Enter' })
    expect((b1.element as HTMLInputElement).value).toBe('')
    await b1.trigger('dblclick')
    await b1.setValue('2024-02-29')
    await b1.trigger('keydown', { key: 'Enter' })
    expect((b1.element as HTMLInputElement).value).toBe('2024-02-29')
    wrapper.unmount()
  })

})

describe('ExcelGrid props', () => {
  it('columnsとrowsで初期構成を指定できる', () => {
    const wrapper = mountView([{ name: '名前', type: 'string', width: 150 }, { name: '年齢', type: 'number' }], 3)
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.findAll('th.col-header .col-label').map((h) => h.text())).toEqual(['名前', '年齢'])
    expect(wrapper.find('input[aria-label="年齢2"]').exists()).toBe(true)
    expect(wrapper.findAll('col')[1].attributes('style')).toContain('150px')
    expect(wrapper.findAll('col')[2].attributes('style')).toContain('96px')
    wrapper.unmount()
  })
})

describe('ExcelGrid 列幅変更', () => {
  it('ハンドルのドラッグで列幅が変わり、最小幅を下回らない', async () => {
    const wrapper = mountView()
    const handle = wrapper.findAll('.resize-handle')[0]
    await handle.trigger('mousedown', { clientX: 100 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 160 }))
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('col')[1].attributes('style')).toContain('180px')
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: -500 }))
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('col')[1].attributes('style')).toContain('40px')
    window.dispatchEvent(new MouseEvent('mouseup'))
    wrapper.unmount()
  })

  it('ダブルクリックで既定幅に戻る', async () => {
    const wrapper = mountView()
    const handle = wrapper.findAll('.resize-handle')[0]
    await handle.trigger('mousedown', { clientX: 0 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50 }))
    window.dispatchEvent(new MouseEvent('mouseup'))
    await handle.trigger('dblclick')
    expect(wrapper.findAll('col')[1].attributes('style')).toContain('96px')
    wrapper.unmount()
  })
  it('options指定の列はオートコンプリートになり、選択した値が保持される', async () => {
    const wrapper = mountView([{ name: '性別', type: 'string', options: ['男', '女'] }, { name: 'B', type: 'string' }])
    expect(wrapper.find('.v-autocomplete').exists()).toBe(true)
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.find('input[aria-label="B1"]').exists()).toBe(true)
    const vm = wrapper.findAllComponents({ name: 'VAutocomplete' })[1]
    vm.vm.$emit('update:modelValue', '女')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAllComponents({ name: 'VAutocomplete' })[1].props('modelValue')).toBe('女')
    vm.vm.$emit('update:modelValue', '選択肢外')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAllComponents({ name: 'VAutocomplete' })[1].props('modelValue')).toBe('女')
    wrapper.unmount()
  })

  it('オートコンプリートのセルは移動キーでセル移動し、F2でメニューを開く', async () => {
    const wrapper = mountView([{ name: '性別', type: 'string', options: ['男', '女'] }], 3)
    const first = wrapper.find('input[aria-label="性別1"]')
    await first.trigger('focus')
    await first.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.find('input[aria-label="性別2"]').element.closest('.excel-cell')?.classList.contains('selected')).toBe(true)
    await wrapper.find('input[aria-label="性別2"]').trigger('keydown', { key: 'F2' })
    expect(wrapper.findAllComponents({ name: 'VAutocomplete' })[1].props('menu')).toBe(true)
    wrapper.unmount()
  })

  it('readonlyでは選択セルの値を消せず、クリアボタンも表示しない', async () => {
    const wrapper = mount(ExcelGrid, {
      props: { columns: [{ name: '性別', type: 'string', options: ['男', '女'] }], rows: 1, initialData: [['男']], readonly: true },
      global: { plugins: [vuetify] }
    })
    expect(wrapper.find('.v-field__clearable').exists()).toBe(false)
    const picker = wrapper.findComponent({ name: 'VAutocomplete' })
    picker.vm.$emit('update:modelValue', null)
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'VAutocomplete' }).props('modelValue')).toBe('男')
    const input = wrapper.find('input[aria-label="性別1"]')
    await input.trigger('focus')
    await input.trigger('keydown', { key: 'Delete' })
    expect(wrapper.findComponent({ name: 'VAutocomplete' }).props('modelValue')).toBe('男')
    wrapper.unmount()
  })

  it('スイッチ列(boolean)は v-switch で、切り替えが保持され、Deleteでオフになる', async () => {
    const wrapper = mountView([{ name: '完了', type: 'boolean' }], 3)
    expect(wrapper.find('.v-switch').classes()).toContain('align-center')
    const sw = wrapper.find('input[aria-label="完了1"]')
    expect((sw.element as HTMLInputElement).checked).toBe(false)
    await sw.setValue(true)
    expect((wrapper.find('input[aria-label="完了1"]').element as HTMLInputElement).checked).toBe(true)
    await wrapper.find('input[aria-label="完了1"]').trigger('focus')
    await wrapper.find('input[aria-label="完了1"]').trigger('keydown', { key: 'Delete' })
    expect((wrapper.find('input[aria-label="完了1"]').element as HTMLInputElement).checked).toBe(false)
    wrapper.unmount()
  })

  it('スイッチ列は文字入力しても編集モードにならず、readonlyでは切り替えられない', async () => {
    const wrapper = mount(ExcelGrid, { props: { columns: [{ name: '完了', type: 'boolean' }], rows: 2, readonly: true }, global: { plugins: [vuetify] } })
    const sw = wrapper.find('input[aria-label="完了1"]')
    await sw.trigger('focus')
    await sw.trigger('keydown', { key: 'a' })
    expect(wrapper.find('.editing').exists()).toBe(false)
    await sw.setValue(true)
    expect((wrapper.find('input[aria-label="完了1"]').element as HTMLInputElement).checked).toBe(false)
    wrapper.unmount()
  })
})

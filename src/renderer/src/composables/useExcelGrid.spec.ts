import { describe, expect, it } from 'vitest'
import { columnLabel, resolveAlign, createEmptyCells, isValidInput, isValidValue, useExcelGrid, type ColumnDefinition } from './useExcelGrid'

describe('columnLabel', () => {
  it('Excel形式の列名に変換する', () => {
    expect(columnLabel(0)).toBe('A')
    expect(columnLabel(25)).toBe('Z')
    expect(columnLabel(26)).toBe('AA')
    expect(columnLabel(27)).toBe('AB')
    expect(columnLabel(701)).toBe('ZZ')
    expect(columnLabel(702)).toBe('AAA')
  })
})

describe('createEmptyCells', () => {
  it('指定サイズの空配列を作る（行同士は別参照）', () => {
    const c = createEmptyCells(2, 3)
    expect(c).toEqual([['', '', ''], ['', '', '']])
    expect(c[0]).not.toBe(c[1])
  })
})

/** テスト用の列定義 */
const cols = (n: number): ColumnDefinition[] => Array.from({ length: n }, (_, i) => ({ name: `列${i + 1}`, type: 'string' }))

describe('useExcelGrid', () => {
  it('列定義と行数からセルを生成する', () => {
    const { cells, columnNames } = useExcelGrid(cols(4), 3)
    expect(cells.value).toHaveLength(3)
    expect(cells.value[0]).toHaveLength(4)
    expect(columnNames.value).toEqual(['列1', '列2', '列3', '列4'])
  })

  it('列定義で名前・型・初期幅を指定できる', () => {
    const g = useExcelGrid([
      { name: '名前', type: 'string', width: 200.4 },
      { name: '年齢', type: 'number' },
      { name: '生年月日', type: 'date', width: 5 },
      { name: '不正', type: 'string', width: NaN }
    ], 1)
    expect(g.columnNames.value).toEqual(['名前', '年齢', '生年月日', '不正'])
    expect(g.columnTypes.value).toEqual(['string', 'number', 'date', 'string'])
    expect(g.columnWidths.value).toEqual([200, 96, 40, 96])
  })

  it('初期データを反映する（不足列は空、超過列は無視、行数超過は拡張）', () => {
    const { cells } = useExcelGrid(cols(2), 1, [['a', 'b'], ['c'], ['d', 'e', 'f']])
    expect(cells.value).toEqual([['a', 'b'], ['c', ''], ['d', 'e']])
  })

  it('setCellで値を更新し、範囲外は無視する', () => {
    const { cells, setCell } = useExcelGrid(cols(2), 2)
    setCell(1, 1, 'x')
    expect(setCell(5, 5, 'y')).toBe(false)
    setCell(-1, 0, 'z')
    setCell(0, 2, 'w')
    expect(cells.value).toEqual([['', ''], ['', 'x']])
  })

  it('行を追加できる（行0でも壊れない）', () => {
    const { cells, addRow } = useExcelGrid(cols(3), 0)
    addRow()
    expect(cells.value).toHaveLength(1)
    expect(cells.value[0]).toHaveLength(3)
  })

  it('列が0でも壊れない', () => {
    const { cells, select, selected } = useExcelGrid([], 2)
    expect(cells.value).toEqual([[], []])
    select(0, 0)
    expect(selected.value).toBeNull()
  })

  it('選択と移動ができ、範囲外へは移動しない', () => {
    const { selected, select, move } = useExcelGrid(cols(2), 2)
    expect(selected.value).toBeNull()
    select(0, 0)
    move(-1, 0)
    expect(selected.value).toEqual({ row: 0, col: 0 })
    move(1, 1)
    expect(selected.value).toEqual({ row: 1, col: 1 })
    move(1, 0)
    expect(selected.value).toEqual({ row: 1, col: 1 })
  })

  it('未選択からの移動は先頭セル基準になる', () => {
    const { selected, move } = useExcelGrid(cols(2), 2)
    move(1, 0)
    expect(selected.value).toEqual({ row: 1, col: 0 })
  })
})

describe('列の型', () => {
  it('isValidInput/isValidValueが型ごとに判定する', () => {
    expect(isValidInput('number', '1.')).toBe(true)
    expect(isValidValue('number', '1.')).toBe(true)
    expect(isValidValue('number', '-')).toBe(false)
    expect(isValidInput('number', '1e3')).toBe(false)
    expect(isValidInput('date', '2024-1')).toBe(true)
    expect(isValidValue('date', '2024-1')).toBe(false)
    expect(isValidValue('date', '2023-02-29')).toBe(false)
    expect(isValidValue('date', '2024-02-29')).toBe(true)
    expect(isValidInput('string', 'あ')).toBe(true)
  })

  it('setCellは初期化時に指定した型に合わない値を拒否する', () => {
    const g = useExcelGrid([{ name: '年齢', type: 'number' }, { name: '名前', type: 'string' }], 2)
    expect(g.setCell(0, 0, 'a')).toBe(false)
    expect(g.setCell(0, 0, '5')).toBe(true)
    expect(g.setCell(0, 1, 'a')).toBe(true)
  })
})

describe('列幅', () => {
  it('変更・最小幅・範囲外・不正値', () => {
    const g = useExcelGrid(cols(2), 2)
    expect(g.columnWidths.value).toEqual([96, 96])
    g.setColumnWidth(0, 200.4)
    expect(g.columnWidths.value[0]).toBe(200)
    g.setColumnWidth(0, 5)
    expect(g.columnWidths.value[0]).toBe(40)
    g.setColumnWidth(9, 100)
    g.setColumnWidth(1, NaN)
    expect(g.columnWidths.value).toEqual([40, 96])
  })
  it('options指定の列は選択肢以外の値を拒否し、空は許可する', () => {
    const { cells, setCell } = useExcelGrid([{ name: '性別', type: 'string', options: ['男', '女'] }], 2)
    expect(setCell(0, 0, '男')).toBe(true)
    expect(setCell(0, 0, 'ほげ')).toBe(false)
    expect(cells.value[0][0]).toBe('男')
    expect(setCell(0, 0, '')).toBe(true)
  })
})

describe('useExcelGrid ソート', () => {
  const cols: ColumnDefinition[] = [
    { name: '名前', type: 'string', sortable: true },
    { name: '数', type: 'number', sortable: true },
    { name: '固定', type: 'string' }
  ]
  const data = [['b', '10', 'x'], ['a', '9', 'y'], ['', '', 'z'], ['c', '100', 'w']]
  const names = (g: ReturnType<typeof useExcelGrid>): string[] => g.cells.value.map((r) => r[0])

  it('昇順→降順→元の順に切り替わる（空は常に末尾）', () => {
    const g = useExcelGrid(cols, 4, data)
    g.toggleSort(0)
    expect(names(g)).toEqual(['a', 'b', 'c', ''])
    expect(g.sortState.value).toEqual({ col: 0, direction: 'asc' })
    g.toggleSort(0)
    expect(names(g)).toEqual(['c', 'b', 'a', ''])
    g.toggleSort(0)
    expect(names(g)).toEqual(['b', 'a', '', 'c'])
    expect(g.sortState.value).toBeNull()
  })

  it('数値列は数値として比較する', () => {
    const g = useExcelGrid(cols, 4, data)
    g.toggleSort(1)
    expect(g.cells.value.map((r) => r[1])).toEqual(['9', '10', '100', ''])
  })

  it('rowIds は行に付いて動き、別の列に切り替えると昇順から始まる', () => {
    const g = useExcelGrid(cols, 4, data)
    g.toggleSort(0)
    expect(g.rowIds.value).toEqual([1, 0, 3, 2])
    g.toggleSort(0)
    g.toggleSort(1)
    expect(g.sortState.value).toEqual({ col: 1, direction: 'asc' })
  })

  it('ソート不可の列は無視し、ソートすると選択を解除する', () => {
    const g = useExcelGrid(cols, 4, data)
    g.toggleSort(2)
    expect(g.sortState.value).toBeNull()
    expect(names(g)).toEqual(['b', 'a', '', 'c'])
    g.select(0, 0)
    g.toggleSort(0)
    expect(g.selected.value).toBeNull()
  })

  it('追加した行は末尾の通し番号になる', () => {
    const g = useExcelGrid(cols, 2, data.slice(0, 2))
    g.addRow()
    expect(g.rowIds.value).toEqual([0, 1, 2])
  })
})

describe('useExcelGrid フィルタ', () => {
  const cols: ColumnDefinition[] = [
    { name: '名前', type: 'string', filterable: true },
    { name: '市', type: 'string', filterable: true },
    { name: '固定', type: 'string' }
  ]
  const data = [['Apple', '東京', 'x'], ['banana', '大阪', 'y'], ['apricot', '東京', 'z'], ['Cherry', '京都', 'w']]

  it('初期状態はすべての行が対象', () => {
    expect(useExcelGrid(cols, 4, data).visibleRows.value).toEqual([0, 1, 2, 3])
  })

  it('部分一致（大文字小文字を区別しない）で絞り込む', () => {
    const g = useExcelGrid(cols, 4, data)
    g.setFilter(0, 'AP')
    expect(g.visibleRows.value).toEqual([0, 2])
  })

  it('複数列のフィルタはAND条件', () => {
    const g = useExcelGrid(cols, 4, data)
    g.setFilter(0, 'ap')
    g.setFilter(1, '東')
    expect(g.visibleRows.value).toEqual([0, 2])
    g.setFilter(0, 'apr')
    expect(g.visibleRows.value).toEqual([2])
  })

  it('空にすると解除され、一致なしは空配列になる', () => {
    const g = useExcelGrid(cols, 4, data)
    g.setFilter(0, 'zzz')
    expect(g.visibleRows.value).toEqual([])
    g.setFilter(0, '')
    expect(g.visibleRows.value).toHaveLength(4)
  })

  it('フィルタ不可の列は無視する', () => {
    const g = useExcelGrid(cols, 4, data)
    g.setFilter(2, 'x')
    expect(g.visibleRows.value).toHaveLength(4)
  })

  it('フィルタすると選択を解除し、移動は表示中の行だけを辿る', () => {
    const g = useExcelGrid(cols, 4, data)
    g.select(1, 0)
    g.setFilter(1, '東')
    expect(g.selected.value).toBeNull()
    g.select(0, 0)
    g.move(1, 0)
    expect(g.selected.value).toEqual({ row: 2, col: 0 })
    g.move(1, 0)
    expect(g.selected.value).toEqual({ row: 2, col: 0 })
  })

  it('ソートしてもフィルタ結果は現在の並びに追従する', () => {
    const sortable = cols.map((c) => ({ ...c, sortable: true }))
    const g = useExcelGrid(sortable, 4, data)
    g.setFilter(1, '東')
    g.toggleSort(0)
    expect(g.visibleRows.value.map((r) => g.cells.value[r][0])).toEqual(['Apple', 'apricot'])
  })
})

describe('boolean列と表示位置', () => {
  it('boolean列は true / false / 空のみ入力できる', () => {
    expect(isValidInput('boolean', 'true')).toBe(true)
    expect(isValidInput('boolean', 'false')).toBe(true)
    expect(isValidInput('boolean', '')).toBe(true)
    expect(isValidInput('boolean', 'yes')).toBe(false)
    expect(isValidValue('boolean', 'maybe')).toBe(false)
    const { setCell, cells } = useExcelGrid([{ name: 'A', type: 'boolean' }], 1)
    expect(setCell(0, 0, 'true')).toBe(true)
    expect(setCell(0, 0, 'x')).toBe(false)
    expect(cells.value[0][0]).toBe('true')
  })

  it('表示位置は指定が優先で、省略時は数値が右・booleanが中央・他は左', () => {
    expect(resolveAlign({ name: 'A', type: 'number' })).toBe('right')
    expect(resolveAlign({ name: 'A', type: 'number', align: 'left' })).toBe('left')
    expect(resolveAlign({ name: 'A', type: 'boolean' })).toBe('center')
    expect(resolveAlign({ name: 'A', type: 'string' })).toBe('left')
    expect(resolveAlign({ name: 'A', type: 'date' })).toBe('left')
    expect(useExcelGrid([{ name: 'A', type: 'number' }, { name: 'B', type: 'string' }], 1).columnAligns.value).toEqual(['right', 'left'])
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { Workbook } from 'exceljs'
import { buildXlsx, copyTable, downloadXlsx, toTsv, type GridTable } from './gridExport'

const table: GridTable = {
  headers: ['名前', '数'],
  types: ['string', 'number'],
  rows: [['a', '10'], ['b', ''], ['c', 'x']]
}

describe('gridExport', () => {
  afterEach(() => vi.unstubAllGlobals())

  describe('toTsv', () => {
    it('ヘッダー付きのタブ区切りにする', () => {
      expect(toTsv(table)).toBe('名前\t数\na\t10\nb\t\nc\tx')
    })

    it('タブ・改行・引用符を含む値は引用符で囲んでエスケープする', () => {
      const t: GridTable = { headers: ['h'], types: ['string'], rows: [['a\tb'], ['x\ny'], ['say "hi"']] }
      expect(toTsv(t)).toBe('h\n"a\tb"\n"x\ny"\n"say ""hi"""')
    })

    it('行がなければヘッダーのみ', () => {
      expect(toTsv({ headers: ['A', 'B'], types: ['string', 'string'], rows: [] })).toBe('A\tB')
    })
  })

  describe('buildXlsx', () => {
    it('ヘッダーと行を書き出し、数値列の数値は数値セルにする', async () => {
      const wb = new Workbook()
      await wb.xlsx.load(await buildXlsx(table, 'データ'))
      const sheet = wb.getWorksheet('データ')!
      expect(sheet.getRow(1).values).toEqual([undefined, '名前', '数'])
      expect(sheet.getRow(2).getCell(2).value).toBe(10)
      expect(sheet.getRow(3).getCell(2).value).toBeNull()
      expect(sheet.getRow(4).getCell(2).value).toBe('x')
    })
  })

  describe('buildXlsx (boolean列)', () => {
    it('ON/OFF列は真偽値セルにする', async () => {
      const wb = new Workbook()
      await wb.xlsx.load(await buildXlsx({ headers: ['完了'], types: ['boolean'], rows: [['true'], ['false'], ['']] }))
      const sheet = wb.getWorksheet('Sheet1')!
      expect(sheet.getRow(2).getCell(1).value).toBe(true)
      expect(sheet.getRow(3).getCell(1).value).toBe(false)
      expect(sheet.getRow(4).getCell(1).value).toBe(false)
    })
  })

  describe('downloadXlsx', () => {
    it('xlsxファイル名でダウンロードを開始する', async () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:x')
      const revokeObjectURL = vi.fn()
      vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      await downloadXlsx(table, 'イベント一覧')
      expect(createObjectURL).toHaveBeenCalledOnce()
      expect(click).toHaveBeenCalledOnce()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:x')
      click.mockRestore()
    })
  })

  describe('copyTable', () => {
    it('TSVをクリップボードへ書き込む', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { clipboard: { writeText } })
      await copyTable(table)
      expect(writeText).toHaveBeenCalledWith(toTsv(table))
    })
  })
})

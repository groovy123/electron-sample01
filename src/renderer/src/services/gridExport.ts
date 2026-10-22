/**
 * グリッドの内容をExcelファイル・クリップボードへ出力するサービス。
 */
import type { ColumnType } from '../composables/useExcelGrid'

/** 出力対象の表（ヘッダーと、表示中の行） */
export interface GridTable {
  /** ヘッダー（列名） */
  headers: string[]
  /** 列ごとの型（数値列は数値セルとして出力する） */
  types: ColumnType[]
  /** 行ごとの文字列配列 */
  rows: string[][]
}

/** Excelファイルの MIME タイプ */
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * セルの値をTSV用にエスケープする（タブ・改行・二重引用符を含む場合は引用符で囲む）。
 * @param value セルの値
 * @returns エスケープ後の文字列
 */
function escapeTsv(value: string): string {
  return /[\t\r\n"]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * 表をTSV文字列に変換する。Excel等へそのまま貼り付けられる。
 * @param table 出力対象の表
 * @returns ヘッダー行を含むTSV
 */
export function toTsv(table: GridTable): string {
  return [table.headers, ...table.rows].map((r) => r.map(escapeTsv).join('\t')).join('\n')
}

/**
 * 表をxlsxのバイナリに変換する。数値列の有効な数値は数値セル、空欄は空セルにする。
 * @param table 出力対象の表
 * @param sheetName シート名
 * @returns xlsxのバイナリ
 */
export async function buildXlsx(table: GridTable, sheetName = 'Sheet1'): Promise<ArrayBuffer> {
  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  const sheet = workbook.addWorksheet(sheetName)
  sheet.addRow(table.headers).font = { bold: true }
  table.rows.forEach((row) =>
    sheet.addRow(
      row.map((v, c) => {
        if (v === '') return null
        return table.types[c] === 'number' && Number.isFinite(Number(v)) ? Number(v) : v
      })
    )
  )
  sheet.columns.forEach((col, i) => {
    col.width = Math.min(60, Math.max(10, ...[table.headers[i], ...table.rows.map((r) => r[i])].map((v) => (v ?? '').length * 2)))
  })
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer
}

/**
 * 表をxlsxファイルとしてダウンロードする。
 * @param table 出力対象の表
 * @param fileName 拡張子を除いたファイル名
 */
export async function downloadXlsx(table: GridTable, fileName: string): Promise<void> {
  const blob = new Blob([await buildXlsx(table)], { type: XLSX_MIME })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 表をTSVとしてクリップボードにコピーする。
 * @param table 出力対象の表
 * @throws クリップボードが使えない場合
 */
export async function copyTable(table: GridTable): Promise<void> {
  await navigator.clipboard.writeText(toTsv(table))
}

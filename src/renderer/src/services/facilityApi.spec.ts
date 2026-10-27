import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildFacilityUrl,
  extractFacilities,
  FACILITY_COLUMNS,
  fetchFacilities,
  randomVisitors,
  toFacilityRows,
  VISITOR_COLUMNS,
  VISITOR_MAX
} from './facilityApi'

describe('facilityApi', () => {
  afterEach(() => {
    delete (window as { api?: unknown }).api
    vi.unstubAllGlobals()
  })

  it('取得件数の上限を付与したURLを返す', () => {
    expect(buildFacilityUrl()).toBe('https://api.data.metro.tokyo.lg.jp/v1/PublicFacility?limit=1000')
  })

  describe('extractFacilities', () => {
    it('[施設配列, ページ情報] から施設配列を取り出す', () => {
      expect(extractFacilities([[{ ID: { 識別値: '1' } }], { moreResults: 'NO_MORE_RESULTS' }])).toEqual([
        { ID: { 識別値: '1' } }
      ])
    })

    it('形式が想定外の場合は例外にする', () => {
      expect(() => extractFacilities({})).toThrow('形式が不正')
      expect(() => extractFacilities([{}, {}])).toThrow('形式が不正')
    })
  })

  describe('toFacilityRows', () => {
    it('列定義の並びで表示値を取り出す', () => {
      const rows = toFacilityRows([
        {
          ID: { 識別値: '48' },
          名称: { 表記: '京浜島緑道公園', カナ表記: 'ケイヒンジマリョクドウコウエン' },
          住所: { 表記: '東京都大田区京浜島一丁目', 郵便番号: '143-0003' },
          連絡先: { 電話番号: '03-3790-2378' },
          利用可能時間: { 開始時間: '9:00', 終了時間: '17:00', 種別: '月火水木金' },
          アクセス: { 備考: '徒歩6分' },
          説明: ['', ' ', '散策できます。']
        }
      ])
      expect(rows).toEqual([
        [
          '48', '京浜島緑道公園', 'ケイヒンジマリョクドウコウエン', '143-0003', '東京都大田区京浜島一丁目',
          '03-3790-2378', '9:00〜17:00', '月火水木金', '徒歩6分', '散策できます。'
        ]
      ])
    })

    it('項目がない場合は空文字にする（利用可能時間も両方空なら空）', () => {
      expect(toFacilityRows([{}])).toEqual([FACILITY_COLUMNS.map(() => '')])
      expect(toFacilityRows([{ 利用可能時間: { 開始時間: '', 終了時間: '' } }])[0][6]).toBe('')
      expect(toFacilityRows([{ 利用可能時間: { 開始時間: '9:00' } }])[0][6]).toBe('9:00〜')
    })
  })

  describe('fetchFacilities', () => {
    it('Electron環境ではIPC経由で取得する', async () => {
      const ipc = vi.fn().mockResolvedValue([[{ ID: { 識別値: '1' } }], {}])
      window.api = { getAppVersion: vi.fn(), fetchEvents: vi.fn(), fetchFacilities: ipc }
      await expect(fetchFacilities()).resolves.toEqual([{ ID: { 識別値: '1' } }])
      expect(ipc).toHaveBeenCalledOnce()
    })

    it('ブラウザ単体ではGETで取得する', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [[{ ID: { 識別値: '2' } }], {}] })
      vi.stubGlobal('fetch', fetchMock)
      await expect(fetchFacilities()).resolves.toEqual([{ ID: { 識別値: '2' } }])
      expect(fetchMock).toHaveBeenCalledWith(buildFacilityUrl())
    })

    it('HTTPエラーは例外にする', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
      await expect(fetchFacilities()).rejects.toThrow('HTTP 500')
    })
  })

  describe('randomVisitors', () => {
    it('2026年1月〜6月の6列を持つ', () => {
      expect(VISITOR_COLUMNS).toEqual([
        '2026/1来場者数', '2026/2来場者数', '2026/3来場者数', '2026/4来場者数', '2026/5来場者数', '2026/6来場者数'
      ])
    })

    it('乱数から0〜最大値の整数を列ごとに作る', () => {
      const values = [0, 0.5, 0.999999, 0.25, 0.1, 0.75]
      const result = randomVisitors(() => values.shift()!)
      expect(Object.keys(result)).toEqual(VISITOR_COLUMNS)
      expect(Object.values(result)).toEqual([0, 5000, VISITOR_MAX, 2500, 1000, 7500])
    })

    it('既定の乱数でも範囲内の整数になる', () => {
      for (const v of Object.values(randomVisitors())) {
        expect(Number.isInteger(v)).toBe(true)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(VISITOR_MAX)
      }
    })
  })
})

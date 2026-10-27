import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildEventUrl, EVENT_LIMIT_OPTIONS, excludeEmptyId, extractEvents, fetchEvents, toEventGridData, toNumberOrZero } from './eventApi'

describe('eventApi', () => {
  afterEach(() => {
    delete (window as { api?: unknown }).api
    vi.unstubAllGlobals()
  })

  describe('buildEventUrl', () => {
    it('limit を付与したURLを返す', () => {
      expect(buildEventUrl(20)).toBe('https://api.data.metro.tokyo.lg.jp/v1/Event?limit=20')
    })

    it('選択肢に初期値(10)を含む', () => {
      expect(EVENT_LIMIT_OPTIONS).toContain(10)
    })
  })

  describe('extractEvents', () => {
    it('先頭のイベント配列を取り出す', () => {
      expect(extractEvents([[{ 人数: '1' }], { revision: 2 }])).toEqual([{ 人数: '1' }])
    })

    it.each([null, {}, [], [{}], 'x'])('形式不正はエラー: %j', (json) => {
      expect(() => extractEvents(json)).toThrow('形式が不正')
    })
  })

  describe('toEventGridData', () => {
    it('列定義の並びで文字列化し、英語名など空の名称は飛ばす', () => {
      const rows = toEventGridData([
        {
          名称: [{ 表記: '' }, { 表記: 'ボッチャ体験教室' }],
          ID: { 識別値: '0700000008' },
          期間: { 開始日: '2019-01-20', 終了日: '2019-01-21', 開始時間: '10:00', 終了時間: '12:00' },
          開催場所: { 表記: '水元小合学園', 住所: { 表記: '葛飾区' } },
          人数: '20',
          料金: { 金額: { 数値: '15,000 ' } },
          連絡先: { 表記: '事業団', 電話番号: '03-6804-5636' }
        }
      ])
      expect(rows[0]).toEqual([
        '0700000008', 'ボッチャ体験教室', '2019-01-20', '2019-01-21', '10:00', '12:00',
        '水元小合学園', '葛飾区', '20', '15,000', '事業団', '03-6804-5636'
      ])
    })

    it('欠損項目は空文字にする', () => {
      const rows = toEventGridData([{}])
      expect(rows[0]).toHaveLength(12)
      expect(rows[0].every((v) => v === '')).toBe(true)
    })

    it('空配列は空配列', () => {
      expect(toEventGridData([])).toEqual([])
    })
  })

  describe('excludeEmptyId', () => {
    it('IDが空・空白・未設定のデータを除く', () => {
      const ok = { ID: { 識別値: '07' } }
      expect(excludeEmptyId([ok, { ID: { 識別値: '' } }, { ID: { 識別値: '  ' } }, { ID: {} }, {}])).toEqual([ok])
    })
  })

  describe('fetchEvents', () => {
    it('Electron環境ではIPC経由で取得する', async () => {
      const ipc = vi.fn().mockResolvedValue([[{ ID: { 識別値: '1' } }], {}])
      window.api = { getAppVersion: vi.fn(), fetchEvents: ipc, fetchFacilities: vi.fn() }
      await expect(fetchEvents(20)).resolves.toEqual([{ ID: { 識別値: '1' } }])
      expect(ipc).toHaveBeenCalledWith(20)
    })

    it('ブラウザ単体ではGETで取得する', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [[{ ID: { 識別値: '2' } }, { ID: { 識別値: ' ' } }, {}], {}] })
      vi.stubGlobal('fetch', fetchMock)
      await expect(fetchEvents(5)).resolves.toEqual([{ ID: { 識別値: '2' } }])
      expect(fetchMock).toHaveBeenCalledWith(buildEventUrl(5))
    })

    it('HTTPエラーは例外にする', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
      await expect(fetchEvents()).rejects.toThrow('HTTP 500')
    })
  })

  describe('toNumberOrZero', () => {
    it('数値文字列を数値に変換する（小数・桁区切り・前後の空白を許容）', () => {
      expect(toNumberOrZero('30')).toBe(30)
      expect(toNumberOrZero(' 1,500 ')).toBe(1500)
      expect(toNumberOrZero('2.5')).toBe(2.5)
    })

    it('空欄・空白のみ・数値でない値は 0 にする', () => {
      expect(toNumberOrZero('')).toBe(0)
      expect(toNumberOrZero('   ')).toBe(0)
      expect(toNumberOrZero('無料')).toBe(0)
      expect(toNumberOrZero('Infinity')).toBe(0)
    })
  })
})

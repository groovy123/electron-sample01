import { describe, expect, it } from 'vitest'
import { applyEventChange, EVENT_CATEGORIES, eventToPropertyRows } from './useEventDetail'
import type { EventRecord } from '../services/eventApi'

const [basic, period, place] = EVENT_CATEGORIES

describe('useEventDetail', () => {
  it('カテゴリは4つ', () => {
    expect(EVENT_CATEGORIES).toHaveLength(4)
  })

  it('イベントをカテゴリごとのPropertyGrid行に変換する（英語名など空の名称は飛ばす）', () => {
    const rec: EventRecord = {
      名称: [{ 表記: '' }, { 表記: 'ボッチャ' }],
      ID: { 識別値: '07' },
      人数: '20',
      期間: { 開始日: '2019-01-20' }
    }
    const basicRows = eventToPropertyRows(rec, basic)
    expect(basicRows.map((r) => [r.key, r.value])).toEqual([['ID', '07'], ['イベント名', 'ボッチャ'], ['説明', ''], ['人数', '20']])
    expect(basicRows[0].editable).toBe(false)
    expect(basicRows[3].type).toBe('number')
    expect(eventToPropertyRows(rec, period)[0]).toMatchObject({ key: '開始日', type: 'date', value: '2019-01-20' })
  })

  it('欠損項目は空文字になる', () => {
    expect(eventToPropertyRows({}, place).every((r) => r.value === '')).toBe(true)
  })

  it('変更をイベントに反映する（途中のオブジェクトがなければ作る）', () => {
    const rec: EventRecord = {}
    applyEventChange(rec, place, 4, '35.7')
    expect(rec.開催場所?.地理座標?.緯度).toBe('35.7')
    applyEventChange(rec, period, 0, '2020-02-02')
    expect(rec.期間?.開始日).toBe('2020-02-02')
  })

  it('イベント名の変更は空でない最初の名称を更新し、なければ追加する', () => {
    const rec: EventRecord = { 名称: [{ 表記: '' }, { 表記: '旧' }] }
    applyEventChange(rec, basic, 1, '新')
    expect(rec.名称).toEqual([{ 表記: '' }, { 表記: '新' }])
    const empty: EventRecord = {}
    applyEventChange(empty, basic, 1, '追加')
    expect(empty.名称).toEqual([{ 表記: '追加' }])
  })

  it('編集不可項目（ID）は変更されない', () => {
    const rec: EventRecord = { ID: { 識別値: '07' } }
    applyEventChange(rec, basic, 0, '99')
    expect(rec.ID?.識別値).toBe('07')
  })
})

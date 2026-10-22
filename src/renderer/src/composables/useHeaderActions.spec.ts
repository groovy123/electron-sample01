import { describe, expect, it } from 'vitest'
import { useHeaderActions, type AlertItem } from './useHeaderActions'

const sampleAlerts: AlertItem[] = [
  { id: 1, message: 'A', read: false },
  { id: 2, message: 'B', read: false },
  { id: 3, message: 'C', read: true }
]

describe('useHeaderActions', () => {
  it('デフォルトはゲスト・アラート0件', () => {
    const { userName, alerts, alertCount, hasAlerts } = useHeaderActions()
    expect(userName.value).toBe('ゲスト')
    expect(alerts.value).toEqual([])
    expect(alertCount.value).toBe(0)
    expect(hasAlerts.value).toBe(false)
  })

  it('未読のアラート件数だけを数える', () => {
    const { alertCount, hasAlerts } = useHeaderActions('山田 太郎', sampleAlerts)
    expect(alertCount.value).toBe(2)
    expect(hasAlerts.value).toBe(true)
  })

  it('初期アラートを書き換えても引数の配列は変更されない', () => {
    const { markAllRead } = useHeaderActions('A', sampleAlerts)
    markAllRead()
    expect(sampleAlerts.filter((a) => !a.read)).toHaveLength(2)
  })

  it('markRead で指定アラートが既読になる', () => {
    const { alertCount, markRead } = useHeaderActions('A', sampleAlerts)
    markRead(1)
    expect(alertCount.value).toBe(1)
  })

  it('markRead は存在しないIDを無視する', () => {
    const { alertCount, markRead } = useHeaderActions('A', sampleAlerts)
    markRead(999)
    expect(alertCount.value).toBe(2)
  })

  it('markAllRead ですべて既読になりバッジが消える', () => {
    const { alertCount, hasAlerts, markAllRead } = useHeaderActions('A', sampleAlerts)
    markAllRead()
    expect(alertCount.value).toBe(0)
    expect(hasAlerts.value).toBe(false)
  })
})

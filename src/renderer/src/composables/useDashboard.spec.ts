import { describe, expect, it } from 'vitest'
import { formatChange, toBarHeight, useDashboard } from './useDashboard'

describe('toBarHeight', () => {
  it('最大値に対する割合(%)を返す', () => {
    expect(toBarHeight(50, 100)).toBe(50)
    expect(toBarHeight(100, 100)).toBe(100)
  })

  it('max が 0 以下なら 0 を返す', () => {
    expect(toBarHeight(10, 0)).toBe(0)
    expect(toBarHeight(10, -5)).toBe(0)
  })

  it('負の値は 0 として扱う', () => {
    expect(toBarHeight(-10, 100)).toBe(0)
  })
})

describe('formatChange', () => {
  it('増加は + 付きで表示する', () => {
    expect(formatChange(12.5)).toBe('+12.5%')
  })

  it('減少は - 付きで表示する', () => {
    expect(formatChange(-3.14)).toBe('-3.1%')
  })

  it('0 は符号なしで表示する', () => {
    expect(formatChange(0)).toBe('0.0%')
  })
})

describe('useDashboard', () => {
  it('サマリー・週次推移・アクティビティを返す', () => {
    const { summary, weekly, activities } = useDashboard()
    expect(summary).toHaveLength(4)
    expect(weekly).toHaveLength(7)
    expect(activities.length).toBeGreaterThan(0)
  })

  it('アクティビティのIDは一意である', () => {
    const { activities } = useDashboard()
    const ids = activities.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

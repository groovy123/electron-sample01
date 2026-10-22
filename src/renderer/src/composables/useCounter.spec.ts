import { describe, expect, it } from 'vitest'
import { useCounter } from './useCounter'

describe('useCounter', () => {
  it('デフォルトでは0で初期化される', () => {
    const { count } = useCounter()
    expect(count.value).toBe(0)
  })

  it('初期値を指定できる', () => {
    const { count } = useCounter(10)
    expect(count.value).toBe(10)
  })

  it('increment を呼ぶとカウントが1増える', () => {
    const { count, increment } = useCounter()
    increment()
    expect(count.value).toBe(1)
  })

  it('decrement を呼ぶとカウントが1減る（負の値も許容する）', () => {
    const { count, decrement } = useCounter()
    decrement()
    expect(count.value).toBe(-1)
  })

  it('reset を呼ぶと初期値に戻る', () => {
    const { count, increment, reset } = useCounter(5)
    increment()
    increment()
    reset()
    expect(count.value).toBe(5)
  })

  it('複数回の操作を組み合わせても整合した値になる', () => {
    const { count, increment, decrement } = useCounter(3)
    increment()
    increment()
    decrement()
    expect(count.value).toBe(4)
  })
})

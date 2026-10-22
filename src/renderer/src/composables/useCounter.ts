import { ref, type Ref } from 'vue'

/** useCounter が返す状態と操作関数 */
export interface UseCounterReturn {
  /** 現在のカウント値 */
  count: Ref<number>
  /** カウントを1増やす */
  increment: () => void
  /** カウントを1減らす */
  decrement: () => void
  /** カウントを初期値に戻す */
  reset: () => void
}

/**
 * カウンター機能を提供するコンポーザブル。
 * @param initialValue カウントの初期値（省略時は0）
 * @returns カウントの状態と操作関数
 */
export function useCounter(initialValue = 0): UseCounterReturn {
  const count = ref(initialValue)

  function increment(): void {
    count.value += 1
  }

  function decrement(): void {
    count.value -= 1
  }

  function reset(): void {
    count.value = initialValue
  }

  return { count, increment, decrement, reset }
}

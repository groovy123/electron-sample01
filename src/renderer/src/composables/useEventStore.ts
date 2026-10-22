import { ref } from 'vue'
import type { EventRecord } from '../services/eventApi'

/** 取得済みのイベント一覧（一覧画面と詳細画面で共有する） */
const events = ref<EventRecord[]>([])
/** 取得直後のイベント一覧の複製。編集箇所の判定に使う */
const originals = ref<EventRecord[]>([])

/**
 * 取得済みイベントの共有状態を提供するコンポーザブル。
 * 詳細画面での編集内容は一覧に戻ったときにも反映される。
 * 取得時点の内容も保持し、編集した行・項目を判定できるようにする。
 * @returns イベント一覧・取得時点の一覧と操作関数
 */
export function useEventStore(): {
  events: typeof events
  originals: typeof originals
  setEvents: (list: EventRecord[]) => void
  clearEvents: () => void
} {
  return {
    events,
    originals,
    setEvents: (list) => {
      originals.value = JSON.parse(JSON.stringify(list)) as EventRecord[]
      events.value = list
    },
    clearEvents: () => {
      events.value = []
      originals.value = []
    }
  }
}

import { computed, ref, type ComputedRef, type Ref } from 'vue'

/** アラート1件分のデータ */
export interface AlertItem {
  /** 一意なID */
  id: number
  /** 表示メッセージ */
  message: string
  /** 既読かどうか */
  read: boolean
}

/** useHeaderActions が返す状態と操作関数 */
export interface UseHeaderActionsReturn {
  /** ログイン中のユーザー名 */
  userName: Ref<string>
  /** アラート一覧 */
  alerts: Ref<AlertItem[]>
  /** 未読アラート件数 */
  alertCount: ComputedRef<number>
  /** アラートバッジを表示するか */
  hasAlerts: ComputedRef<boolean>
  /** 指定IDのアラートを既読にする（存在しないIDは無視） */
  markRead: (id: number) => void
  /** すべてのアラートを既読にする */
  markAllRead: () => void
}

/**
 * 上部バー右端のアラート通知・ユーザー名の状態を提供するコンポーザブル。
 * @param initialUserName ユーザー名の初期値
 * @param initialAlerts アラートの初期一覧
 * @returns ヘッダー右端の状態と操作関数
 */
export function useHeaderActions(
  initialUserName = 'ゲスト',
  initialAlerts: readonly AlertItem[] = []
): UseHeaderActionsReturn {
  const userName = ref(initialUserName)
  const alerts = ref<AlertItem[]>(initialAlerts.map((a) => ({ ...a })))

  const alertCount = computed(() => alerts.value.filter((a) => !a.read).length)
  const hasAlerts = computed(() => alertCount.value > 0)

  function markRead(id: number): void {
    const target = alerts.value.find((a) => a.id === id)
    if (target) target.read = true
  }

  function markAllRead(): void {
    alerts.value.forEach((a) => {
      a.read = true
    })
  }

  return { userName, alerts, alertCount, hasAlerts, markRead, markAllRead }
}

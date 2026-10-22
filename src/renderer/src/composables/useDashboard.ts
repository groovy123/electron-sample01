/** サマリーカード1件分のデータ */
export interface SummaryItem {
  /** 項目名 */
  label: string
  /** 表示値 */
  value: string
  /** 前期比（%）。負値は減少を表す */
  change: number
  /** mdi アイコン名 */
  icon: string
  /** Vuetify のカラー名 */
  color: string
}

/** 週次グラフの1本分のデータ */
export interface WeeklyPoint {
  /** 曜日ラベル */
  day: string
  /** 値 */
  value: number
}

/** アクティビティ1件分のデータ */
export interface ActivityItem {
  /** 一意なID */
  id: number
  /** 内容 */
  title: string
  /** 時刻表示 */
  time: string
  /** mdi アイコン名 */
  icon: string
}

/** useDashboard が返すダッシュボード用データ */
export interface UseDashboardReturn {
  summary: SummaryItem[]
  weekly: WeeklyPoint[]
  activities: ActivityItem[]
}

/**
 * 棒グラフの高さ（%）を算出する。
 * @param value 対象の値
 * @param max 値の最大値
 * @returns 0〜100 の割合。max が 0 以下の場合は 0
 */
export function toBarHeight(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.round((Math.max(value, 0) / max) * 100)
}

/**
 * 変化率を符号付きの文字列に整形する。
 * @param change 変化率（%）
 * @returns 例: "+12.5%" / "-3.0%" / "0.0%"
 */
export function formatChange(change: number): string {
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

/**
 * ダッシュボードに表示するサンプルデータを提供するコンポーザブル。
 * @returns サマリー・週次推移・アクティビティ
 */
export function useDashboard(): UseDashboardReturn {
  const summary: SummaryItem[] = [
    { label: '顧客数', value: '1,284', change: 12.5, icon: 'mdi-account-group', color: 'primary' },
    { label: '売上', value: '¥3,480,000', change: 8.2, icon: 'mdi-currency-jpy', color: 'success' },
    { label: '注文数', value: '356', change: -3.1, icon: 'mdi-cart', color: 'warning' },
    { label: '問い合わせ', value: '27', change: 0, icon: 'mdi-message-text', color: 'info' }
  ]

  const weekly: WeeklyPoint[] = [
    { day: '月', value: 42 },
    { day: '火', value: 58 },
    { day: '水', value: 35 },
    { day: '木', value: 71 },
    { day: '金', value: 64 },
    { day: '土', value: 28 },
    { day: '日', value: 19 }
  ]

  const activities: ActivityItem[] = [
    { id: 1, title: '新規顧客が登録されました', time: '10分前', icon: 'mdi-account-plus' },
    { id: 2, title: '注文 #1042 が確定しました', time: '1時間前', icon: 'mdi-check-circle' },
    { id: 3, title: '問い合わせを受信しました', time: '3時間前', icon: 'mdi-email' },
    { id: 4, title: '月次レポートが作成されました', time: '昨日', icon: 'mdi-file-chart' }
  ]

  return { summary, weekly, activities }
}

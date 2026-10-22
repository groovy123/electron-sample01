import { ref, type Ref } from 'vue'

/** タイトル保存に使う localStorage キー */
export const TITLE_STORAGE_KEY = 'header-title'

/** useHeaderTitle が返す状態と操作関数 */
export interface UseHeaderTitleReturn {
  /** 現在のヘッダータイトル */
  title: Ref<string>
  /** タイトルを変更して保存する（空白のみの場合は初期値に戻す） */
  setTitle: (value: string) => void
}

/**
 * 任意に指定できるヘッダータイトルの状態を提供するコンポーザブル。値は localStorage に保存する。
 * @param defaultTitle 未設定時・空入力時に使うタイトル
 * @returns タイトルと変更関数
 */
export function useHeaderTitle(defaultTitle: string): UseHeaderTitleReturn {
  const title = ref(load() || defaultTitle)

  function setTitle(value: string): void {
    const next = value.trim() || defaultTitle
    title.value = next
    try {
      if (next === defaultTitle) localStorage.removeItem(TITLE_STORAGE_KEY)
      else localStorage.setItem(TITLE_STORAGE_KEY, next)
    } catch {
      // 保存できない環境ではメモリ上のみで保持する
    }
  }

  return { title, setTitle }
}

/** 保存済みタイトルを読み込む（取得不可なら空文字） */
function load(): string {
  try {
    return localStorage.getItem(TITLE_STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

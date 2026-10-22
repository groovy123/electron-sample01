import { beforeEach, describe, expect, it } from 'vitest'
import { stubLocalStorage } from '../test-storage'
import { TITLE_STORAGE_KEY, useHeaderTitle } from './useHeaderTitle'

describe('useHeaderTitle', () => {
  beforeEach(() => stubLocalStorage())

  it('未設定なら初期タイトルを返す', () => {
    expect(useHeaderTitle('既定').title.value).toBe('既定')
  })

  it('任意のタイトルに変更して保存する', () => {
    const { title, setTitle } = useHeaderTitle('既定')
    setTitle('  顧客システム ')
    expect(title.value).toBe('顧客システム')
    expect(useHeaderTitle('既定').title.value).toBe('顧客システム')
  })

  it('空白のみなら初期タイトルに戻し保存を消す', () => {
    const { title, setTitle } = useHeaderTitle('既定')
    setTitle('変更')
    setTitle('   ')
    expect(title.value).toBe('既定')
    expect(localStorage.getItem(TITLE_STORAGE_KEY)).toBeNull()
  })
})

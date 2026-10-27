import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAppVersion, isElectron } from './platform'

describe('platform', () => {
  afterEach(() => {
    // 各テスト後に window.api をクリーンアップし、テスト間の状態漏れを防ぐ
    delete (window as { api?: unknown }).api
  })

  describe('isElectron', () => {
    it('window.api が存在する場合はtrueを返す', () => {
      window.api = { getAppVersion: vi.fn(), fetchEvents: vi.fn(), fetchFacilities: vi.fn() }
      expect(isElectron()).toBe(true)
    })

    it('window.api が存在しない場合はfalseを返す（ブラウザ単体実行）', () => {
      expect(isElectron()).toBe(false)
    })
  })

  describe('getAppVersion', () => {
    it('Electron環境ではIPC経由でバージョンを取得する', async () => {
      window.api = { getAppVersion: vi.fn().mockResolvedValue('1.2.3'), fetchEvents: vi.fn(), fetchFacilities: vi.fn() }
      await expect(getAppVersion()).resolves.toBe('1.2.3')
      expect(window.api.getAppVersion).toHaveBeenCalledOnce()
    })

    it('ブラウザ単体実行時はビルド時に埋め込まれたバージョンを返す', async () => {
      await expect(getAppVersion()).resolves.toBe(__APP_VERSION__)
    })
  })
})

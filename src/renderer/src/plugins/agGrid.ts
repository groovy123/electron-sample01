import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'
import { ModuleRegistry } from 'ag-grid-community'

/**
 * AG Grid Enterprise の初期化。全モジュールを登録し、環境変数のライセンスキーを設定する。
 * ライセンスキーは .env の VITE_AG_GRID_LICENSE_KEY から読み込む（未設定時は評価版として動作する）。
 */
export function setupAgGrid(): void {
  ModuleRegistry.registerModules([AllEnterpriseModule])
  const key = import.meta.env.VITE_AG_GRID_LICENSE_KEY as string | undefined
  if (key) LicenseManager.setLicenseKey(key)
}

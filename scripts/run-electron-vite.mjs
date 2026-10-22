#!/usr/bin/env node
/**
 * electron-vite の起動ラッパー。
 *
 * Linuxコンテナ上でroot権限で実行すると、Chromiumのサンドボックスが
 * 起動自体を拒否する（https://crbug.com/638180）。
 * これを回避するため、root実行時のみ ELECTRON_DISABLE_SANDBOX を設定する。
 * 通常のデスクトップ利用（非root実行）では何もせず、セキュリティは維持される。
 *
 * 使い方: node scripts/run-electron-vite.mjs <dev|preview>
 */
import { spawn } from 'node:child_process'

/**
 * Linux環境でroot権限（uid 0）で実行されているかを判定する。
 * @returns {boolean} root権限の場合はtrue
 */
function isRunningAsRootOnLinux() {
  return process.platform === 'linux' && typeof process.getuid === 'function' && process.getuid() === 0
}

const subcommand = process.argv[2]

if (subcommand !== 'dev' && subcommand !== 'preview') {
  console.error('Usage: node scripts/run-electron-vite.mjs <dev|preview>')
  process.exit(1)
}

const env = { ...process.env }

if (isRunningAsRootOnLinux()) {
  console.warn('[run-electron-vite] root実行を検出したため ELECTRON_DISABLE_SANDBOX=1 を設定します')
  env.ELECTRON_DISABLE_SANDBOX = '1'
}

const child = spawn('npx', ['electron-vite', subcommand], { stdio: 'inherit', env })

child.on('exit', (code) => {
  process.exit(code ?? 0)
})

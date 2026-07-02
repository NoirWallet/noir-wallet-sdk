import type { NoirWalletProvider } from './types'
import { ZcashAPI } from './chains/zcash/api'
import type { ZcashProvider } from './chains/zcash/types'

interface RawNoirWallet {
  isNoirWallet: boolean
  version?: string
  zcash: ZcashProvider
}

export function getNoirWallet(): NoirWalletProvider | null {
  if (typeof window === 'undefined') return null

  const rawWallet = (window as any).noirwallet as RawNoirWallet | undefined
  if (!rawWallet) return null

  return {
    isNoirWallet: rawWallet.isNoirWallet,
    version: rawWallet.version,
    zcash: new ZcashAPI(rawWallet.zcash)
  }
}

export function isNoirWalletInstalled(): boolean {
  return getNoirWallet() !== null
}

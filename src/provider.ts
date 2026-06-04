import type { NoirWalletProvider } from './types'
import { ZcashAPI } from './chains/zcash/api'
import type { ZcashProvider } from './chains/zcash/types'

function getRawNoirWallet() {
  if (typeof window === 'undefined') return null

  const rawWallet = window.noirwallet
  if (!rawWallet?.isNoirWallet || !rawWallet.zcash) return null

  return rawWallet
}

let cachedProvider: ZcashProvider | null = null
let cachedApi: ZcashAPI | null = null

function getZcashApi(provider: ZcashProvider): ZcashAPI {
  if (cachedProvider === provider && cachedApi) {
    return cachedApi
  }
  cachedProvider = provider
  cachedApi = new ZcashAPI(provider)
  return cachedApi
}

export function getNoirWallet(): NoirWalletProvider | null {
  const rawWallet = getRawNoirWallet()
  if (!rawWallet) return null

  return {
    isNoirWallet: true,
    zcash: getZcashApi(rawWallet.zcash)
  }
}

export function isNoirWalletInstalled(): boolean {
  return getRawNoirWallet() !== null
}

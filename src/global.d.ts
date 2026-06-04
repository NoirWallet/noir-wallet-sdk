import type { ZcashProvider } from './chains/zcash/types'

declare global {
  interface Window {
    noirwallet?: {
      isNoirWallet: boolean
      zcash: ZcashProvider
    }
  }
}

export {}

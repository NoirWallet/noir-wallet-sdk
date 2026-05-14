import type { ZcashAPI } from './chains/zcash/api'

export interface NoirWalletProvider {
  isNoirWallet: boolean
  zcash: ZcashAPI
}

export interface ProviderConnectInfo {
  chainId: string
}

export interface ProviderMessage {
  type: string
  data: unknown
}

export interface ProviderRpcError extends Error {
  code: number
  data?: unknown
}

export type { RequestArguments } from './chains/zcash/types'

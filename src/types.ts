import type { ZcashAPI } from './chains/zcash/api'

export interface NoirWalletProvider {
  isNoirWallet: boolean
  /** Extension version string (semver), e.g. "1.0.23". Absent on older builds. */
  version?: string
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

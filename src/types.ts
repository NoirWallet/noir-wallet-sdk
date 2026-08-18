import type { ZcashClient } from './chains/zcash/api'
import type { BitcoinProvider } from './chains/bitcoin/types'
import type { EvmProvider } from './chains/evm/types'

export interface NoirWalletProvider {
  isNoirWallet: true
  /** Extension version string (semver), e.g. "1.0.23". Absent on older builds. */
  version?: string
  zcash: ZcashClient
  /** Available when the installed extension enables EVM support. */
  ethereum?: EvmProvider
  /** Available when the installed extension enables Bitcoin support. */
  bitcoin?: BitcoinProvider
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

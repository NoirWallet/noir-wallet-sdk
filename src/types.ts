import type { ZcashClient } from './chains/zcash/api'
import type { BitcoinProvider } from './chains/bitcoin/types'
import type { EvmProvider } from './chains/evm/types'
import type { SolanaProvider } from './chains/solana/types'
import type { NearProvider } from './chains/near/types'
import type { MultichainProvider, MultichainRequestArguments } from './chains/multichain/types'

export interface NoirWalletProvider {
  isNoirWallet: true
  /** Extension version string (semver), e.g. "1.0.23". Absent on older builds. */
  version?: string
  /** CAIP-25 root request method, available in multichain-session builds. */
  request?<T = unknown>(args: MultichainRequestArguments): Promise<T>
  /** CAIP-25 session and CAIP-27 scoped invocation provider. */
  multichain?: MultichainProvider
  zcash: ZcashClient
  /** Available when the installed extension enables EVM support. */
  ethereum?: EvmProvider
  /** Available when the installed extension enables Bitcoin support. */
  bitcoin?: BitcoinProvider
  /** Available in Testnet Mode when the Solana Beta is enabled. */
  solana?: SolanaProvider
  /** Available in Testnet Mode when the NEAR Beta is enabled. */
  near?: NearProvider
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

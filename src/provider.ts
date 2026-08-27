import type { NoirWalletProvider } from './types'
import { ZcashClient } from './chains/zcash/api'
import type { ZcashProvider } from './chains/zcash/types'
import type { BitcoinProvider } from './chains/bitcoin/types'
import type { EvmProvider } from './chains/evm/types'
import type { SolanaProvider } from './chains/solana/types'
import type { NearProvider } from './chains/near/types'

interface RawNoirWallet {
  isNoirWallet: true
  version?: string
  zcash: ZcashProvider
  ethereum?: EvmProvider
  bitcoin?: BitcoinProvider
  solana?: SolanaProvider
  near?: NearProvider
}

function isRawNoirWallet(value: unknown): value is RawNoirWallet {
  if (!value || typeof value !== 'object') return false
  const wallet = value as Partial<RawNoirWallet>
  return (
    wallet.isNoirWallet === true &&
    !!wallet.zcash &&
    typeof wallet.zcash.request === 'function' &&
    typeof wallet.zcash.on === 'function'
  )
}

export function getNoirWallet(): NoirWalletProvider | null {
  if (typeof window === 'undefined') return null

  const rawWallet = (window as Window & { noirwallet?: unknown }).noirwallet
  if (!isRawNoirWallet(rawWallet)) return null

  return {
    isNoirWallet: rawWallet.isNoirWallet,
    version: rawWallet.version,
    zcash: new ZcashClient(rawWallet.zcash),
    ...(rawWallet.ethereum ? { ethereum: rawWallet.ethereum } : {}),
    ...(rawWallet.bitcoin ? { bitcoin: rawWallet.bitcoin } : {}),
    ...(rawWallet.solana ? { solana: rawWallet.solana } : {}),
    ...(rawWallet.near ? { near: rawWallet.near } : {})
  }
}

export function isNoirWalletInstalled(): boolean {
  return getNoirWallet() !== null
}

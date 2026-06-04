export interface ZcashProvider {
  request(args: RequestArguments): Promise<any>
  on(event: string, handler: (...args: any[]) => void): void
  removeListener?(event: string, handler: (...args: any[]) => void): void
  disconnect(): Promise<void>
}

export interface RequestArguments {
  method: string
  params?: any[]
}

export interface ZcashAddress {
  transparent: string
  shielded: string
}

export interface Balance {
  transparent: string
  shielded: string
  total?: string
  available?: string
}

export interface SendTransactionParams {
  to: string
  amount: string
}

export interface TransactionReceipt {
  txid: string
  from: string
  to: string
  amount: string
  type: 'transparent' | 'shielded'
  timestamp: number
}

export type SigningMode = 'derived' | 'current' | 'legacy_index0'

export interface SignMessageOptions {
  /**
   * Signing mode for message signing.
   * - `'current'` (default): Signs with the main transparent address key.
   * - `'derived'`: Signs with a privacy-preserving derived key (m/44'/133'/2147483647'/0/0),
   *   cryptographically unlinkable to the main address. Recommended for identity binding.
   * - `'legacy_index0'`: Signs with BIP-44 index 0 key via pure JS (for legacy MCA accounts)
   *   (e.g. MCA creation) to prevent on-chain linkage.
   */
  signingMode?: SigningMode
}

export interface SignMessageResult {
  signature: string
  pubkey: string
  address: string
  signingMode: SigningMode
  /** Only present in 'derived' mode — the user's main transparent address. */
  originAddress?: string
}

export type LendingSigningMode = 'derived' | 'legacy' | 'legacy_index0'

export interface LendingMcaStatus {
  mcaId: string | null
  publicKey: string | null
  signingMode: LendingSigningMode
}

export type Network = 'mainnet' | 'testnet'

export interface ZcashChainInfo {
  chainId: string
  network: string
}

export type ZcashProviderEventMap = {
  accountsChanged: (accounts: ZcashAddress | null) => void
  chainChanged: (chainInfo: ZcashChainInfo) => void
}

export type ZcashProviderEvent = keyof ZcashProviderEventMap

export interface VerifyMessageParams {
  message: string
  signature: string
  pubkey?: string
  address?: string
  network?: Network
}

export interface VerifyMessageResult {
  valid: boolean
  recoveredPubkey: string
  recoveredAddress: string
  pubkeyMatch?: boolean
  addressMatch?: boolean
  error?: string
}

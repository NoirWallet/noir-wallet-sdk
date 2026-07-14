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
  spendable?: string
  available?: string
}

/**
 * A single account authorized through a batch (multi-wallet) connection.
 * `id` is the stable `${walletId}:${accountId}` key returned by the batch APIs;
 * `label` is the human-readable wallet name shown in the wallet UI.
 */
export interface ZcashAccount {
  id: string
  label: string
  walletId: string
  accountId: string
  addresses: ZcashAddress
}

/**
 * Balance for one authorized account. `synced` is `false` when the value is a
 * cached/zero fallback (e.g. the wallet is locked or that account has not been
 * synced yet), so dApps can choose whether to trust it.
 */
export interface ZcashAccountBalance {
  id: string
  walletId: string
  accountId: string
  balance: Balance
  synced: boolean
}

/**
 * Result of `connect()` / `getAccounts()`. Backward compatible: the top-level
 * `transparent`/`shielded` are the primary connected account (what
 * single-account methods operate on), while `accounts` lists every wallet the
 * user authorized for read access (always contains at least the primary).
 */
export interface ZcashConnectResult extends ZcashAddress {
  accounts: ZcashAccount[]
}

/**
 * Result of `getBalance()`. Backward compatible: top-level fields are the
 * primary (or requested) account's balance; `accounts` carries the balance of
 * every authorized account, each flagged with `synced`.
 */
export interface ZcashBalanceResult extends Balance {
  accounts: ZcashAccountBalance[]
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

export interface TransactionHistoryEntry {
  txid: string
  type: string
  amount: string
  status: string
  timestamp: number
  memo?: string
}

export type Network = 'mainnet' | 'testnet'

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

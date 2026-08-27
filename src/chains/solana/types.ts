export type SolanaProviderListener = (value: unknown) => void

/** Minimal PublicKey-compatible object exposed by Noir Wallet's injected provider. */
export interface SolanaPublicKey {
  toBytes(): Uint8Array
  toBuffer(): Uint8Array
  toString(): string
  equals(value: { readonly toString: () => string }): boolean
}

export interface SolanaConnectResult {
  readonly publicKey: SolanaPublicKey
}

export interface SolanaSignAndSendResult {
  readonly signature: string
}

export interface SolanaSignedMessage {
  readonly signature: Uint8Array
  readonly publicKey: Uint8Array
}

export type SolanaTransactionCommitment = 'processed' | 'confirmed' | 'finalized'

export interface SolanaSignTransactionOptions {
  readonly preflightCommitment?: SolanaTransactionCommitment
  readonly minContextSlot?: number
}

export interface SolanaSignAndSendTransactionOptions extends SolanaSignTransactionOptions {
  readonly commitment?: SolanaTransactionCommitment
  readonly skipPreflight?: boolean
  readonly maxRetries?: number
}

/**
 * Noir Wallet's Solana provider. Chain reads belong to the dApp's RPC client;
 * the wallet exposes authorization and signing only. Solana Wallet Standard is
 * also registered globally for framework-level discovery.
 */
export interface SolanaProvider {
  readonly isNoirWallet: true
  readonly isConnected: boolean
  readonly publicKey: SolanaPublicKey | null
  connect(): Promise<SolanaConnectResult>
  disconnect(): Promise<void>
  signTransaction(
    transaction: Uint8Array,
    options?: SolanaSignTransactionOptions
  ): Promise<Uint8Array>
  signAllTransactions(transactions: readonly Uint8Array[]): Promise<readonly Uint8Array[]>
  signAndSendTransaction(
    transaction: Uint8Array,
    options?: SolanaSignAndSendTransactionOptions
  ): Promise<SolanaSignAndSendResult>
  signMessage(message: Uint8Array): Promise<SolanaSignedMessage>
  on(
    event: 'connect' | 'disconnect' | 'accountChanged' | 'accountsChanged',
    handler: SolanaProviderListener
  ): SolanaProvider
  removeListener(
    event: 'connect' | 'disconnect' | 'accountChanged' | 'accountsChanged',
    handler: SolanaProviderListener
  ): SolanaProvider
}

export interface DetectSolanaProviderOptions {
  readonly timeoutMs?: number
  readonly signal?: AbortSignal
}

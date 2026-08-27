export interface SolanaRequestArguments {
  readonly method: string
  readonly params?: readonly unknown[]
}

export type SolanaProviderListener = (value: unknown) => void

export interface SolanaConnectResult {
  readonly address: string
}

export interface SolanaNetwork {
  readonly chainId:
    | 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
    | 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
  readonly name: 'mainnet-beta' | 'devnet'
}

export interface SolanaBalance {
  readonly totalRaw: string
  readonly spendableRaw: string
  readonly availableRaw: string
}

/** Noir Wallet's Solana provider. Serialized transactions use canonical base64 wire bytes. */
export interface SolanaProvider {
  request<T = unknown>(args: SolanaRequestArguments): Promise<T>
  connect(): Promise<SolanaConnectResult>
  requestAccounts(): Promise<readonly string[]>
  getAccounts(): Promise<readonly string[]>
  getNetwork(): Promise<SolanaNetwork>
  getBalance(): Promise<SolanaBalance>
  /** Returns a trusted SPL token balance for its canonical CAIP-19 asset ID. */
  getTokenBalance(assetId: string): Promise<SolanaBalance>
  /** Sends native SOL. `lamports` must be a positive integer string. */
  sendTransfer(recipient: string, lamports: string): Promise<string>
  /** Sends a trusted SPL token amount in base units. */
  sendTokenTransfer(assetId: string, recipient: string, amountRaw: string): Promise<string>
  /** Returns the signed transaction without broadcasting it. */
  signTransaction(transactionBase64: string): Promise<string>
  /** Signs and broadcasts a serialized transaction, returning its first signature. */
  signAndSendTransaction(transactionBase64: string): Promise<string>
  on(event: string, handler: SolanaProviderListener): SolanaProvider
  removeListener(event: string, handler: SolanaProviderListener): SolanaProvider
  disconnect(): Promise<void>
}

export interface DetectSolanaProviderOptions {
  readonly timeoutMs?: number
  readonly signal?: AbortSignal
}

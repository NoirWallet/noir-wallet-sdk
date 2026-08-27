export interface SolanaRequestArguments {
  readonly method: string
  readonly params?: readonly unknown[]
}

export type SolanaProviderListener = (value: unknown) => void

export interface SolanaConnectResult {
  readonly address: string
}

export interface SolanaNetwork {
  readonly chainId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
  readonly name: 'devnet'
}

export interface SolanaBalance {
  readonly totalRaw: string
  readonly spendableRaw: string
  readonly availableRaw: string
}

/** Noir Wallet's testnet Beta provider for native Solana transfers. */
export interface SolanaProvider {
  request<T = unknown>(args: SolanaRequestArguments): Promise<T>
  connect(): Promise<SolanaConnectResult>
  requestAccounts(): Promise<readonly string[]>
  getAccounts(): Promise<readonly string[]>
  getNetwork(): Promise<SolanaNetwork>
  getBalance(): Promise<SolanaBalance>
  /** Sends native SOL. `lamports` must be a positive integer string. */
  sendTransfer(recipient: string, lamports: string): Promise<string>
  on(event: string, handler: SolanaProviderListener): SolanaProvider
  removeListener(event: string, handler: SolanaProviderListener): SolanaProvider
  disconnect(): Promise<void>
}

export interface DetectSolanaProviderOptions {
  readonly timeoutMs?: number
  readonly signal?: AbortSignal
}

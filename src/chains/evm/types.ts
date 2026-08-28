export interface EvmRequestArguments {
  readonly method: string
  readonly params?: readonly unknown[] | Readonly<Record<string, unknown>>
}

export type EvmProviderListener = (value: unknown) => void

/** Noir Wallet's EIP-1193 provider. */
export interface EvmProvider {
  readonly isNoirWallet: true
  readonly selectedAddress: string | null
  readonly chainId: string | null
  request<T = unknown>(args: EvmRequestArguments): Promise<T>
  on(event: string, handler: EvmProviderListener): EvmProvider
  removeListener(event: string, handler: EvmProviderListener): EvmProvider
  isConnected(): boolean
}

export interface Eip6963ProviderInfo {
  readonly uuid: string
  readonly name: string
  readonly icon: string
  readonly rdns: string
}

export interface Eip6963ProviderDetail {
  readonly info: Eip6963ProviderInfo
  readonly provider: EvmProvider
}

export interface DetectEvmProviderOptions {
  /** Maximum discovery time. Defaults to 3 seconds. */
  readonly timeoutMs?: number
  readonly signal?: AbortSignal
}

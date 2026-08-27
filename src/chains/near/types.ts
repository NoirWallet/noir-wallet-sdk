export interface NearRequestArguments {
  readonly method: string
  readonly params?: readonly unknown[]
}

export type NearProviderListener = (value: unknown) => void

export interface NearConnectResult {
  readonly address: string
}

export interface NearNetwork {
  readonly chainId: 'near:testnet'
  readonly name: 'testnet'
}

export interface NearBalance {
  readonly totalRaw: string
  readonly spendableRaw: string
  readonly availableRaw: string
}

/** Noir Wallet's testnet Beta provider for native NEAR transfers. */
export interface NearProvider {
  request<T = unknown>(args: NearRequestArguments): Promise<T>
  connect(): Promise<NearConnectResult>
  requestAccounts(): Promise<readonly string[]>
  getAccounts(): Promise<readonly string[]>
  getNetwork(): Promise<NearNetwork>
  getBalance(): Promise<NearBalance>
  /** Sends native NEAR. `yoctoNear` must be a positive integer string. */
  sendTransfer(recipient: string, yoctoNear: string): Promise<string>
  on(event: string, handler: NearProviderListener): NearProvider
  removeListener(event: string, handler: NearProviderListener): NearProvider
  disconnect(): Promise<void>
}

export interface DetectNearProviderOptions {
  readonly timeoutMs?: number
  readonly signal?: AbortSignal
}

import type {
  ZcashProvider,
  ZcashAddress,
  Balance,
  SendTransactionParams,
  SignMessageOptions,
  SignMessageResult,
  SigningMode,
  LendingMcaStatus,
  Network
} from './types'

export class ZcashAPI {
  private provider: ZcashProvider

  constructor(provider: ZcashProvider) {
    this.provider = provider
  }

  async connect(): Promise<ZcashAddress> {
    return this.provider.request({ method: 'zcash_requestAccounts' })
  }

  async getAccounts(): Promise<ZcashAddress | null> {
    return this.provider.request({ method: 'zcash_getAccounts' })
  }

  async getBalance(): Promise<Balance> {
    return this.provider.request({ method: 'zcash_getBalance' })
  }

  async getPublicKey(options?: SignMessageOptions): Promise<{
    pubkey: string
    address: string
    signingMode: SigningMode
    originAddress?: string
  } | null> {
    const signingMode = options?.signingMode ?? 'current'
    return this.provider.request({
      method: 'zcash_getPublicKey',
      params: [{ signingMode }]
    })
  }

  async sendTransaction(params: SendTransactionParams): Promise<string> {
    return this.provider.request({
      method: 'zcash_sendTransaction',
      params: [params]
    })
  }

  async signMessage(message: string, options?: SignMessageOptions): Promise<SignMessageResult> {
    const signingMode = options?.signingMode ?? 'current'
    return this.provider.request({
      method: 'zcash_signMessage',
      params: [message, { signingMode }]
    })
  }

  async switchNetwork(network: Network): Promise<boolean> {
    return this.provider.request({
      method: 'zcash_switchNetwork',
      params: [{ network }]
    })
  }

  async checkLendingMcaAccount(): Promise<LendingMcaStatus | null> {
    return this.provider.request({ method: 'zcash_checkLendingMcaAccount' })
  }

  async disconnect(): Promise<void> {
    await this.provider.request({ method: 'zcash_disconnect' })
  }

  on(event: string, handler: (...args: any[]) => void): void {
    this.provider.on(event, handler)
  }

  removeListener(event: string, handler: (...args: any[]) => void): void {
    this.provider.removeListener?.(event, handler)
  }
}

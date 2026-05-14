import type {
  ZcashProvider,
  ZcashAddress,
  Balance,
  SendTransactionParams,
  SignMessageResult,
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

  async getPublicKey(): Promise<{ pubkey: string; address: string } | null> {
    return this.provider.request({ method: 'zcash_getPublicKey' })
  }

  async sendTransaction(params: SendTransactionParams): Promise<string> {
    return this.provider.request({
      method: 'zcash_sendTransaction',
      params: [params]
    })
  }

  async signMessage(message: string): Promise<SignMessageResult> {
    return this.provider.request({
      method: 'zcash_signMessage',
      params: [message]
    })
  }

  async switchNetwork(network: Network): Promise<boolean> {
    return this.provider.request({
      method: 'zcash_switchNetwork',
      params: [{ network }]
    })
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

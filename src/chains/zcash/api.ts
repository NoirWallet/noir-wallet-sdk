import type {
  ZcashProvider,
  ZcashAddress,
  ZcashAccount,
  ZcashAccountBalance,
  ZcashConnectResult,
  ZcashBalanceResult,
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

  /**
   * Wrap a raw single-account address response so callers always get an
   * `accounts` array. New extensions already include `accounts`; older ones
   * return only `{ transparent, shielded }`, which we normalize to a
   * one-element array for forward-compatible consumers.
   */
  private normalizeConnect<T extends ZcashAddress | null>(res: T): ZcashConnectResult | null {
    if (!res) return null
    const r = res as ZcashAddress & { accounts?: ZcashAccount[] }
    if (Array.isArray(r.accounts)) return r as ZcashConnectResult
    return {
      transparent: r.transparent,
      shielded: r.shielded,
      accounts: [
        {
          id: 'current',
          label: 'Current Account',
          walletId: '',
          accountId: '',
          addresses: { transparent: r.transparent, shielded: r.shielded }
        }
      ]
    }
  }

  /** Same forward-compat normalization as {@link normalizeConnect} for balances. */
  private normalizeBalance(res: Balance): ZcashBalanceResult {
    const r = res as Balance & { accounts?: ZcashAccountBalance[] }
    if (Array.isArray(r.accounts)) return r as ZcashBalanceResult
    return {
      ...r,
      accounts: [{ id: 'current', walletId: '', accountId: '', balance: r, synced: true }]
    }
  }

  /**
   * Request wallet connection. Shows an approval screen where the user can
   * authorize one or several independent wallets (MetaMask-style: the current
   * account is selected by default, more can be added). The top-level
   * `transparent`/`shielded` are the primary account; `accounts` lists every
   * authorized wallet's addresses.
   */
  async connect(): Promise<ZcashConnectResult> {
    const res = await this.provider.request({ method: 'zcash_requestAccounts' })
    return this.normalizeConnect(res) as ZcashConnectResult
  }

  /** Silently query the connected accounts (no popup). `null` when not connected. */
  async getAccounts(): Promise<ZcashConnectResult | null> {
    const res = await this.provider.request({ method: 'zcash_getAccounts' })
    return this.normalizeConnect(res)
  }

  /**
   * Get wallet balance. With no argument returns the primary account's balance;
   * pass an account `id` (the `${walletId}:${accountId}` key from `accounts`) to
   * read a specific authorized account. The `accounts` field always carries the
   * balance of every authorized account.
   */
  async getBalance(accountId?: string): Promise<ZcashBalanceResult> {
    const res = await this.provider.request({
      method: 'zcash_getBalance',
      params: accountId ? [{ accountId }] : []
    })
    return this.normalizeBalance(res)
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

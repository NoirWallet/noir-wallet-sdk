export interface BitcoinRequestArguments {
  readonly method: string
  readonly params?: readonly unknown[]
}

export type BitcoinProviderListener = (value: unknown) => void
export type BitcoinNetwork = 'livenet' | 'testnet'
export type BitcoinChain = 'BITCOIN_MAINNET' | 'BITCOIN_TESTNET'

export interface BitcoinConnectResult {
  readonly address: string
  /** Compressed secp256k1 public key without a `0x` prefix. */
  readonly publicKey: string
}

export interface BitcoinBalance {
  readonly confirmed: number
  readonly unconfirmed: number
  readonly total: number
}

export interface BitcoinChainInfo {
  readonly enum: BitcoinChain
  readonly name: string
  readonly network: BitcoinNetwork
}

export interface BitcoinSignPsbtOptions {
  /** Defaults to true, matching the UniSat/OKX provider convention. */
  readonly autoFinalized?: boolean
}

export interface BitcoinSendOptions {
  /** Integer satoshis per virtual byte. The wallet estimates the fee when omitted. */
  readonly feeRate?: number
}

/** Noir Wallet's Bitcoin provider, compatible with the supported UniSat-style surface. */
export interface BitcoinProvider {
  request<T = unknown>(args: BitcoinRequestArguments): Promise<T>
  connect(): Promise<BitcoinConnectResult>
  requestAccounts(): Promise<readonly string[]>
  getAccounts(): Promise<readonly string[]>
  getNetwork(): Promise<BitcoinNetwork>
  getChain(): Promise<BitcoinChainInfo>
  getPublicKey(): Promise<string>
  getBalance(): Promise<BitcoinBalance>
  sendBitcoin(recipient: string, satoshis: number, options?: BitcoinSendOptions): Promise<string>
  signMessage(message: string, type?: 'bip322-simple'): Promise<string>
  signPsbt(psbtHex: string, options?: BitcoinSignPsbtOptions): Promise<string>
  signPsbts(
    psbtHexes: readonly string[],
    options?: readonly (BitcoinSignPsbtOptions | undefined)[]
  ): Promise<readonly string[]>
  /** Finalizes and broadcasts a complete PSBT, returning its transaction ID. */
  pushPsbt(psbtHex: string): Promise<string>
  /** Broadcasts a complete raw transaction, returning its transaction ID. */
  pushTx(options: { readonly rawtx: string }): Promise<string>
  /** Validates the requested network; global network mode is changed in wallet settings. */
  switchNetwork(network: BitcoinNetwork): Promise<null>
  /** Validates the requested chain; global network mode is changed in wallet settings. */
  switchChain(chain: { readonly enum: BitcoinChain }): Promise<null>
  on(event: string, handler: BitcoinProviderListener): BitcoinProvider
  removeListener(event: string, handler: BitcoinProviderListener): BitcoinProvider
  disconnect(): Promise<void>
}

export interface DetectBitcoinProviderOptions {
  /** Maximum detection time. Defaults to 3 seconds. */
  readonly timeoutMs?: number
  readonly signal?: AbortSignal
}

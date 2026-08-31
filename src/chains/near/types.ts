export type NearProviderListener = (value: unknown) => void

export interface NearRequestSignInParams {
  readonly contractId?: string
  readonly methodNames?: readonly string[]
}

export interface NearSignInResult {
  readonly accountId: string
  readonly accessKey: { readonly publicKey: string }
}

/** OKX-compatible function-call action used by the injected NEAR provider. */
export interface NearFunctionCallAction {
  readonly methodName: string
  readonly args: Readonly<Record<string, unknown>>
  readonly gas: string
  readonly deposit: string
}

export interface NearWalletSelectorFunctionCallAction {
  readonly type: 'FunctionCall'
  readonly params: NearFunctionCallAction
}

export interface NearTransferAction {
  readonly type: 'Transfer'
  readonly params: { readonly deposit: string }
}

export type NearAction =
  | NearFunctionCallAction
  | NearWalletSelectorFunctionCallAction
  | NearTransferAction

export interface NearTransactionRequest {
  readonly receiverId: string
  readonly actions: readonly NearAction[]
}

export interface NearTransactionBatchRequest {
  readonly transactions: readonly NearTransactionRequest[]
}

export interface NearSignedTransactionBatch {
  readonly txs: readonly { readonly signedTx: string }[]
}

export interface NearSignMessageParams {
  readonly message: string
  readonly recipient: string
  readonly nonce: Uint8Array
  readonly callbackUrl?: string
  readonly state?: string
}

export interface NearSignedMessage {
  readonly accountId: string
  readonly publicKey: string
  readonly signature: string
  readonly state?: string
}

/**
 * Noir Wallet's OKX-compatible NEAR injected provider. The provider signs
 * transactions; the dApp broadcasts signed bytes through its own NEAR RPC.
 */
export interface NearProvider {
  requestSignIn(params?: NearRequestSignInParams): Promise<NearSignInResult>
  /** Account IDs explicitly authorized for this site. The current account is first. */
  getAccounts(): Promise<readonly string[]>
  signOut(): Promise<void>
  isSignedIn(): boolean
  getAccountId(): string | null
  signTransaction(params: NearTransactionRequest): Promise<string>
  requestSignTransactions(params: NearTransactionBatchRequest): Promise<NearSignedTransactionBatch>
  signMessage(params: NearSignMessageParams): Promise<NearSignedMessage>
  on(event: 'signIn' | 'signOut' | 'accountChanged', handler: NearProviderListener): NearProvider
  removeListener(
    event: 'signIn' | 'signOut' | 'accountChanged',
    handler: NearProviderListener
  ): NearProvider
}

export interface DetectNearProviderOptions {
  readonly timeoutMs?: number
  readonly signal?: AbortSignal
}

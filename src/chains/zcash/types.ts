export interface ZcashProvider {
  request(args: RequestArguments): Promise<any>
  on(event: string, handler: (...args: any[]) => void): void
  removeListener?(event: string, handler: (...args: any[]) => void): void
  disconnect(): Promise<void>
}

export interface RequestArguments {
  method: string
  params?: any[]
}

export interface ZcashAddress {
  transparent: string
  shielded: string
}

export interface Balance {
  transparent: string
  shielded: string
  total?: string
  available?: string
}

export interface SendTransactionParams {
  to: string
  amount: string
}

export interface TransactionReceipt {
  txid: string
  from: string
  to: string
  amount: string
  type: 'transparent' | 'shielded'
  timestamp: number
}

export interface SignMessageResult {
  signature: string
  pubkey: string
  address: string
}

export type Network = 'mainnet' | 'testnet'

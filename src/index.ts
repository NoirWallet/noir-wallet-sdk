export { getNoirWallet, isNoirWalletInstalled } from './provider'

export type {
  NoirWalletProvider,
  ProviderConnectInfo,
  ProviderMessage,
  ProviderRpcError
} from './types'

export {
  getZcashProvider,
  detectProvider,
  getProvider,
  ZcashAPI,
  publicKeyToAddress
} from './chains/zcash'

export type {
  ZcashProvider,
  RequestArguments,
  ZcashAddress,
  Balance,
  SendTransactionParams,
  TransactionReceipt,
  SignMessageResult,
  LendingMcaStatus,
  LendingSigningMode,
  Network
} from './chains/zcash'

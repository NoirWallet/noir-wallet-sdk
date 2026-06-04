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
  publicKeyToAddress,
  verifyMessageSignature
} from './chains/zcash'

export type {
  ZcashProvider,
  RequestArguments,
  ZcashAddress,
  Balance,
  SendTransactionParams,
  TransactionReceipt,
  SignMessageOptions,
  SignMessageResult,
  SigningMode,
  LendingMcaStatus,
  LendingSigningMode,
  Network,
  ZcashChainInfo,
  ZcashProviderEvent,
  ZcashProviderEventMap,
  VerifyMessageParams,
  VerifyMessageResult
} from './chains/zcash'

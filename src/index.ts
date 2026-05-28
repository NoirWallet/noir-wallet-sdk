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
  SignMessageResult,
  SigningMode,
  LendingMcaStatus,
  LendingSigningMode,
  Network,
  VerifyMessageParams,
  VerifyMessageResult
} from './chains/zcash'

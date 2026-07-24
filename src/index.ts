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
  ZcashAPI,
  publicKeyToAddress,
  verifyMessageSignature
} from './chains/zcash'

export type {
  ZcashProvider,
  RequestArguments,
  ZcashAddress,
  ZcashAccount,
  ZcashAccountBalance,
  ZcashConnectResult,
  ZcashBalanceResult,
  Balance,
  FundingSource,
  SendTransactionParams,
  FeeTier,
  MaxTransferParams,
  MaxTransferEstimate,
  TransactionReceipt,
  SignMessageOptions,
  SignMessageResult,
  SigningMode,
  LendingMcaStatus,
  LendingSigningMode,
  TransactionHistoryEntry,
  Network,
  VerifyMessageParams,
  VerifyMessageResult
} from './chains/zcash'

export { getNoirWallet, isNoirWalletInstalled } from './provider'
export {
  addEvmNetwork,
  detectEvmProvider,
  getEvmChainId,
  getEvmProvider,
  switchEvmChain
} from './chains/evm'
export { detectBitcoinProvider, getBitcoinProvider } from './chains/bitcoin'
export { detectSolanaProvider, getSolanaProvider } from './chains/solana'
export { detectNearProvider, getNearProvider } from './chains/near'

export type {
  NoirWalletProvider,
  ProviderConnectInfo,
  ProviderMessage,
  ProviderRpcError
} from './types'

export type {
  DetectEvmProviderOptions,
  AddEvmNetworkParameters,
  Eip6963ProviderDetail,
  Eip6963ProviderInfo,
  EvmChainId,
  EvmProvider,
  EvmProviderListener,
  EvmRequestArguments
} from './chains/evm'

export type {
  BitcoinBalance,
  BitcoinChain,
  BitcoinChainInfo,
  BitcoinConnectResult,
  BitcoinNetwork,
  BitcoinProvider,
  BitcoinProviderListener,
  BitcoinRequestArguments,
  BitcoinSignPsbtOptions,
  DetectBitcoinProviderOptions
} from './chains/bitcoin'

export type {
  DetectSolanaProviderOptions,
  SolanaBalance,
  SolanaConnectResult,
  SolanaNetwork,
  SolanaProvider,
  SolanaProviderListener,
  SolanaRequestArguments
} from './chains/solana'

export type {
  DetectNearProviderOptions,
  NearBalance,
  NearConnectResult,
  NearNetwork,
  NearProvider,
  NearProviderListener,
  NearRequestArguments
} from './chains/near'

export {
  getZcashProvider,
  detectProvider,
  ZcashClient,
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

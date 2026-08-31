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
  Caip25CreateSessionRequest,
  Caip25ScopeRequest,
  Caip25Session,
  Caip25SessionScope,
  Caip27InvokeMethodRequest,
  MultichainProvider,
  MultichainProviderListener,
  MultichainRequestArguments
} from './chains/multichain'

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
  BitcoinSendOptions,
  BitcoinSignPsbtOptions,
  DetectBitcoinProviderOptions
} from './chains/bitcoin'

export type {
  DetectSolanaProviderOptions,
  SolanaConnectResult,
  SolanaProvider,
  SolanaProviderListener,
  SolanaPublicKey,
  SolanaSignAndSendTransactionOptions,
  SolanaSignAndSendResult,
  SolanaSignTransactionOptions,
  SolanaSignedMessage,
  SolanaTransactionCommitment
} from './chains/solana'

export type {
  DetectNearProviderOptions,
  NearAction,
  NearFunctionCallAction,
  NearProvider,
  NearProviderListener,
  NearRequestSignInParams,
  NearSignInResult,
  NearSignMessageParams,
  NearSignedMessage,
  NearSignedTransactionBatch,
  NearTransactionBatchRequest,
  NearTransactionRequest,
  NearTransferAction,
  NearWalletSelectorFunctionCallAction
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

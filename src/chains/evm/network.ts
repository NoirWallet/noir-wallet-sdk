import type { EvmProvider } from './types'

export type EvmChainId = `0x${string}`

export interface AddEvmNetworkParameters {
  readonly chainId: string
  readonly chainName: string
  readonly nativeCurrency: Readonly<{
    readonly name: string
    readonly symbol: string
    readonly decimals: number
  }>
  readonly rpcUrls: readonly string[]
  readonly blockExplorerUrls?: readonly string[]
  readonly iconUrls?: readonly string[]
}

function parseChainId(value: string): EvmChainId {
  if (!/^0x(?:[1-9a-fA-F][0-9a-fA-F]*)$/.test(value)) {
    throw new TypeError('EVM chain ID must be a positive canonical hexadecimal quantity.')
  }
  const numeric = BigInt(value)
  if (numeric > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError('EVM chain ID exceeds the supported safe integer range.')
  }
  return `0x${numeric.toString(16)}`
}

export async function getEvmChainId(provider: EvmProvider): Promise<EvmChainId> {
  const chainId = await provider.request<unknown>({ method: 'eth_chainId' })
  if (typeof chainId !== 'string') throw new TypeError('Wallet returned an invalid EVM chain ID.')
  return parseChainId(chainId)
}

/** Requests a switch among EVM chains released in the wallet's active global network mode. */
export async function switchEvmChain(provider: EvmProvider, chainId: string): Promise<void> {
  await provider.request<null>({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: parseChainId(chainId) }]
  })
}

/**
 * Sends the standard add-network request. Noir Wallet currently accepts released built-in chains
 * and rejects custom EVM networks.
 */
export async function addEvmNetwork(
  provider: EvmProvider,
  network: AddEvmNetworkParameters
): Promise<void> {
  await provider.request<null>({
    method: 'wallet_addEthereumChain',
    params: [
      {
        ...network,
        chainId: parseChainId(network.chainId),
        rpcUrls: [...network.rpcUrls],
        ...(network.blockExplorerUrls === undefined
          ? {}
          : { blockExplorerUrls: [...network.blockExplorerUrls] }),
        ...(network.iconUrls === undefined ? {} : { iconUrls: [...network.iconUrls] })
      }
    ]
  })
}

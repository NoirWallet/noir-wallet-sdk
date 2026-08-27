import type { AddEvmNetworkParameters } from '@noir-wallet/sdk'

const EXAMPLE_CHAIN_ICON_BASE = 'https://assets.zknoir.com/chain'

export type ExampleChainIcon =
  | 'arbitrum'
  | 'avalanche'
  | 'base'
  | 'berachain'
  | 'bitcoin'
  | 'bsc'
  | 'ethereum'
  | 'gnosis'
  | 'monad'
  | 'optimism'
  | 'plasma'
  | 'polygon'
  | 'solana'
  | 'near'
  | 'xlayer'
  | 'zcash'

const chainIconUrl = (chain: ExampleChainIcon) => `${EXAMPLE_CHAIN_ICON_BASE}/${chain}.svg`

const EXAMPLE_CHAIN_ICON_URLS: Readonly<Record<ExampleChainIcon, string>> = Object.freeze({
  arbitrum: chainIconUrl('arbitrum'),
  avalanche: chainIconUrl('avalanche'),
  base: chainIconUrl('base'),
  berachain: chainIconUrl('berachain'),
  bitcoin: chainIconUrl('bitcoin'),
  bsc: chainIconUrl('bsc'),
  ethereum: chainIconUrl('ethereum'),
  gnosis: chainIconUrl('gnosis'),
  monad: chainIconUrl('monad'),
  optimism: chainIconUrl('optimism'),
  plasma: chainIconUrl('plasma'),
  polygon: chainIconUrl('polygon'),
  solana: chainIconUrl('solana'),
  near: chainIconUrl('near'),
  xlayer: chainIconUrl('xlayer'),
  zcash: chainIconUrl('zcash')
})

export function getExampleChainIconUrl(chain: ExampleChainIcon): string {
  return EXAMPLE_CHAIN_ICON_URLS[chain]
}

export interface EvmNetworkExample {
  readonly mode: 'mainnet' | 'testnet'
  readonly label: string
  readonly iconUrl: string
  readonly request: AddEvmNetworkParameters
}

function network(
  mode: EvmNetworkExample['mode'],
  label: string,
  icon: ExampleChainIcon,
  request: AddEvmNetworkParameters
): EvmNetworkExample {
  return Object.freeze({
    mode,
    label,
    iconUrl: getExampleChainIconUrl(icon),
    request: Object.freeze(request)
  })
}

export const EVM_NETWORK_EXAMPLES = Object.freeze([
  network('mainnet', 'Ethereum', 'ethereum', {
    chainId: '0x1',
    chainName: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://ethereum-rpc.publicnode.com'],
    blockExplorerUrls: ['https://etherscan.io']
  }),
  network('mainnet', 'BNB Chain', 'bsc', {
    chainId: '0x38',
    chainName: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.bnbchain.org'],
    blockExplorerUrls: ['https://bscscan.com']
  }),
  network('mainnet', 'Arbitrum', 'arbitrum', {
    chainId: '0xa4b1',
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io']
  }),
  network('mainnet', 'Base', 'base', {
    chainId: '0x2105',
    chainName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://base.blockscout.com']
  }),
  network('mainnet', 'Optimism', 'optimism', {
    chainId: '0xa',
    chainName: 'OP Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.optimism.io'],
    blockExplorerUrls: ['https://optimistic.etherscan.io']
  }),
  network('mainnet', 'Polygon', 'polygon', {
    chainId: '0x89',
    chainName: 'Polygon PoS',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: ['https://polygon.drpc.org'],
    blockExplorerUrls: ['https://polygonscan.com']
  }),
  network('mainnet', 'Avalanche', 'avalanche', {
    chainId: '0xa86a',
    chainName: 'Avalanche C-Chain',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://snowtrace.io']
  }),
  network('mainnet', 'Monad', 'monad', {
    chainId: '0x8f',
    chainName: 'Monad',
    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: ['https://rpc.monad.xyz'],
    blockExplorerUrls: ['https://monadscan.com']
  }),
  network('mainnet', 'Gnosis', 'gnosis', {
    chainId: '0x64',
    chainName: 'Gnosis',
    nativeCurrency: { name: 'xDAI', symbol: 'xDAI', decimals: 18 },
    rpcUrls: ['https://rpc.gnosischain.com'],
    blockExplorerUrls: ['https://gnosisscan.io']
  }),
  network('mainnet', 'Plasma', 'plasma', {
    chainId: '0x2611',
    chainName: 'Plasma',
    nativeCurrency: { name: 'Plasma', symbol: 'XPL', decimals: 18 },
    rpcUrls: ['https://rpc.plasma.to'],
    blockExplorerUrls: ['https://plasmascan.to']
  }),
  network('mainnet', 'X Layer', 'xlayer', {
    chainId: '0xc4',
    chainName: 'X Layer',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: ['https://rpc.xlayer.tech'],
    blockExplorerUrls: ['https://www.okx.com/web3/explorer/xlayer']
  }),
  network('mainnet', 'Berachain', 'berachain', {
    chainId: '0x138de',
    chainName: 'Berachain',
    nativeCurrency: { name: 'Berachain', symbol: 'BERA', decimals: 18 },
    rpcUrls: ['https://rpc.berachain.com/'],
    blockExplorerUrls: ['https://berascan.com']
  }),
  network('testnet', 'Sepolia', 'ethereum', {
    chainId: '0xaa36a7',
    chainName: 'Ethereum Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  }),
  network('testnet', 'BSC Testnet', 'bsc', {
    chainId: '0x61',
    chainName: 'BSC Testnet',
    nativeCurrency: { name: 'Testnet BNB', symbol: 'tBNB', decimals: 18 },
    rpcUrls: ['https://bsc-testnet-dataseed.bnbchain.org'],
    blockExplorerUrls: ['https://testnet.bscscan.com']
  }),
  network('testnet', 'Arbitrum Sepolia', 'arbitrum', {
    chainId: '0x66eee',
    chainName: 'Arbitrum Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://sepolia.arbiscan.io']
  }),
  network('testnet', 'Base Sepolia', 'base', {
    chainId: '0x14a34',
    chainName: 'Base Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org']
  }),
  network('testnet', 'OP Sepolia', 'optimism', {
    chainId: '0xaa37dc',
    chainName: 'OP Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://sepolia.optimism.io'],
    blockExplorerUrls: ['https://sepolia-optimism.etherscan.io']
  }),
  network('testnet', 'Polygon Amoy', 'polygon', {
    chainId: '0x13882',
    chainName: 'Polygon Amoy',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: ['https://polygon-amoy.drpc.org'],
    blockExplorerUrls: ['https://amoy.polygonscan.com']
  }),
  network('testnet', 'Avalanche Fuji', 'avalanche', {
    chainId: '0xa869',
    chainName: 'Avalanche Fuji',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://testnet.snowtrace.io']
  })
])

export function getEvmNetworkExampleMode(chainId: string): EvmNetworkExample['mode'] | undefined {
  return EVM_NETWORK_EXAMPLES.find(network => network.request.chainId === chainId)?.mode
}

export function getEvmNetworkExamples(
  mode: EvmNetworkExample['mode']
): readonly EvmNetworkExample[] {
  return EVM_NETWORK_EXAMPLES.filter(network => network.mode === mode)
}

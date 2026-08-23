export const TESTNETS = Object.freeze({
  sepolia: Object.freeze({
    id: 11155111,
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io'
  }),
  'bsc-testnet': Object.freeze({
    id: 97,
    name: 'BSC Testnet',
    symbol: 'tBNB',
    rpcUrl: 'https://bsc-testnet-dataseed.bnbchain.org',
    explorerUrl: 'https://testnet.bscscan.com'
  }),
  'arbitrum-sepolia': Object.freeze({
    id: 421614,
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io'
  }),
  'base-sepolia': Object.freeze({
    id: 84532,
    name: 'Base Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org'
  }),
  'op-sepolia': Object.freeze({
    id: 11155420,
    name: 'OP Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://sepolia.optimism.io',
    explorerUrl: 'https://sepolia-optimism.etherscan.io'
  }),
  'polygon-amoy': Object.freeze({
    id: 80002,
    name: 'Polygon Amoy',
    symbol: 'POL',
    rpcUrl: 'https://polygon-amoy.drpc.org',
    explorerUrl: 'https://amoy.polygonscan.com'
  }),
  'avalanche-fuji': Object.freeze({
    id: 43113,
    name: 'Avalanche Fuji',
    symbol: 'AVAX',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io'
  })
})

export function resolveTestnet(name) {
  const network = TESTNETS[name]
  if (!network) {
    throw new Error(
      `Unknown testnet "${name}". Expected one of: ${Object.keys(TESTNETS).join(', ')}`
    )
  }
  return network
}

export function toViemChain(network) {
  return {
    id: network.id,
    name: network.name,
    nativeCurrency: { name: network.symbol, symbol: network.symbol, decimals: 18 },
    rpcUrls: { default: { http: [network.rpcUrl] } },
    blockExplorers: { default: { name: 'Explorer', url: network.explorerUrl } },
    testnet: true
  }
}

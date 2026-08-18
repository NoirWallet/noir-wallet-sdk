// The seven built-in Noir Wallet EVM testnets. RPC endpoints mirror the
// wallet's bundled credential-free defaults so script results match what the
// extension itself talks to.
export const TESTNET_NETWORKS = [
  {
    key: 'ethereum-sepolia',
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeSymbol: 'ETH'
  },
  {
    key: 'bsc-testnet',
    chainId: 97,
    name: 'BSC Testnet',
    rpcUrl: 'https://bsc-testnet-dataseed.bnbchain.org',
    explorerUrl: 'https://testnet.bscscan.com',
    nativeSymbol: 'tBNB'
  },
  {
    key: 'arbitrum-sepolia',
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
    nativeSymbol: 'ETH'
  },
  {
    key: 'base-sepolia',
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeSymbol: 'ETH'
  },
  {
    key: 'op-sepolia',
    chainId: 11155420,
    name: 'OP Sepolia',
    rpcUrl: 'https://sepolia.optimism.io',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    nativeSymbol: 'ETH'
  },
  {
    key: 'polygon-amoy',
    chainId: 80002,
    name: 'Polygon Amoy',
    rpcUrl: 'https://polygon-amoy.drpc.org',
    explorerUrl: 'https://amoy.polygonscan.com',
    nativeSymbol: 'POL'
  },
  {
    key: 'avalanche-fuji',
    chainId: 43113,
    name: 'Avalanche Fuji',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    nativeSymbol: 'AVAX'
  }
]

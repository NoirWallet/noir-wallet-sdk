import assert from 'node:assert/strict'
import test from 'node:test'

import { addEvmNetwork, getEvmChainId, switchEvmChain } from '../dist/index.mjs'

function createProvider(chainId = '0xaa36a7') {
  const calls = []
  return {
    calls,
    provider: {
      request: async request => {
        calls.push(request)
        return request.method === 'eth_chainId' ? chainId : null
      }
    }
  }
}

test('reads and switches canonical EVM chain IDs', async () => {
  const { provider, calls } = createProvider()
  assert.equal(await getEvmChainId(provider), '0xaa36a7')
  await switchEvmChain(provider, '0xA4B1')
  assert.deepEqual(calls, [
    { method: 'eth_chainId' },
    { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xa4b1' }] }
  ])
})

test('sends a typed add-network request without mutating caller arrays', async () => {
  const { provider, calls } = createProvider()
  const rpcUrls = Object.freeze(['https://rpc.example'])
  const blockExplorerUrls = Object.freeze(['https://explorer.example'])
  await addEvmNetwork(provider, {
    chainId: '0x2105',
    chainName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls,
    blockExplorerUrls
  })
  assert.deepEqual(calls, [
    {
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: '0x2105',
          chainName: 'Base',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://rpc.example'],
          blockExplorerUrls: ['https://explorer.example']
        }
      ]
    }
  ])
  assert.deepEqual(rpcUrls, ['https://rpc.example'])
  assert.deepEqual(blockExplorerUrls, ['https://explorer.example'])
})

test('rejects non-canonical chain IDs before invoking the provider', async () => {
  const { provider, calls } = createProvider()
  await assert.rejects(() => switchEvmChain(provider, '0x01'), /canonical hexadecimal quantity/i)
  assert.deepEqual(calls, [])
})

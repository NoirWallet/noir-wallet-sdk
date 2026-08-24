import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EVM_NETWORK_EXAMPLES,
  getExampleChainIconUrl
} from '../example/src/evm-network-catalog.ts'

function getChainIds(mode) {
  return EVM_NETWORK_EXAMPLES.filter(network => network.mode === mode)
    .map(network => network.request.chainId)
    .sort()
}

test('keeps the example network catalog aligned with the released wallet networks', () => {
  assert.deepEqual(getChainIds('mainnet'),
    [
      '0x1',
      '0xa',
      '0x38',
      '0x64',
      '0x89',
      '0x8f',
      '0xc4',
      '0x2105',
      '0x2611',
      '0xa4b1',
      '0xa86a',
      '0x138de'
    ].sort()
  )
  assert.deepEqual(getChainIds('testnet'),
    ['0x61', '0xa869', '0xaa36a7', '0xaa37dc', '0x13882', '0x14a34', '0x66eee'].sort()
  )
})

test('uses canonical chain icons instead of token or fallback-letter assets', () => {
  assert.equal(
    getExampleChainIconUrl('monad'),
    'https://near-intents.org/static/icons/network/monad.svg'
  )
  assert.equal(
    getExampleChainIconUrl('gnosis'),
    'https://img.rhea.finance/images/gnosis-chain-icon.svg'
  )
  assert.equal(
    getExampleChainIconUrl('zcash'),
    'https://img.rhea.finance/images/zcash-chain-icon.svg'
  )
  assert.equal(
    getExampleChainIconUrl('bitcoin'),
    'https://img.rhea.finance/images/btc.svg'
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { getNearProvider } from '../dist/chains/near/index.mjs'
import { getSolanaProvider } from '../dist/chains/solana/index.mjs'

function provider() {
  return {
    request: async () => null,
    connect: async () => ({ address: 'account' }),
    requestAccounts: async () => ['account'],
    getAccounts: async () => ['account'],
    getNetwork: async () => ({ chainId: 'test', name: 'testnet' }),
    getBalance: async () => ({ totalRaw: '1', spendableRaw: '1', availableRaw: '1' }),
    getTokenBalance: async () => ({ totalRaw: '1', spendableRaw: '1', availableRaw: '1' }),
    sendTransfer: async () => 'hash',
    sendTokenTransfer: async () => 'token-hash',
    on() {
      return this
    },
    removeListener() {
      return this
    },
    disconnect: async () => {}
  }
}

test('discovers independently enabled Solana and NEAR providers', () => {
  const solana = provider()
  const near = provider()
  globalThis.window = { noirwallet: { solana, near } }
  try {
    assert.equal(getSolanaProvider(), solana)
    assert.equal(getNearProvider(), near)
  } finally {
    delete globalThis.window
  }
})

test('rejects an incomplete native provider surface', () => {
  globalThis.window = { noirwallet: { solana: { request: async () => null } } }
  try {
    assert.equal(getSolanaProvider(), null)
    assert.equal(getNearProvider(), null)
  } finally {
    delete globalThis.window
  }
})

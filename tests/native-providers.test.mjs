import assert from 'node:assert/strict'
import test from 'node:test'

import { getNearProvider } from '../dist/chains/near/index.mjs'
import { getSolanaProvider } from '../dist/chains/solana/index.mjs'

function solanaProvider() {
  return {
    isNoirWallet: true,
    isConnected: false,
    publicKey: null,
    connect: async () => ({ publicKey: null }),
    signTransaction: async value => value,
    signAllTransactions: async value => value,
    signAndSendTransaction: async () => ({ signature: 'signature' }),
    signMessage: async () => ({ signature: new Uint8Array(), publicKey: new Uint8Array() }),
    on() {
      return this
    },
    removeListener() {
      return this
    },
    disconnect: async () => {}
  }
}

function nearProvider() {
  return {
    requestSignIn: async () => ({ accountId: 'account', accessKey: { publicKey: 'key' } }),
    signOut: async () => {},
    isSignedIn: () => false,
    getAccountId: () => null,
    signTransaction: async () => 'signed',
    requestSignTransactions: async () => ({ txs: [] }),
    signMessage: async () => ({ accountId: 'account', publicKey: 'key', signature: 'signature' }),
    on() {
      return this
    },
    removeListener() {
      return this
    }
  }
}

test('discovers independently enabled Solana and NEAR providers', () => {
  const solana = solanaProvider()
  const near = nearProvider()
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

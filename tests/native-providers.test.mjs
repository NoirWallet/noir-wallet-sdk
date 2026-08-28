import assert from 'node:assert/strict'
import test from 'node:test'

import { getNearProvider } from '../dist/chains/near/index.mjs'
import { getSolanaProvider } from '../dist/chains/solana/index.mjs'
import { getBitcoinProvider } from '../dist/chains/bitcoin/index.mjs'

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

function bitcoinProvider() {
  return {
    request: async () => null,
    connect: async () => ({ address: 'bc1example', publicKey: '02' }),
    requestAccounts: async () => [],
    getAccounts: async () => [],
    getNetwork: async () => 'livenet',
    getChain: async () => ({ enum: 'BITCOIN_MAINNET', name: 'Bitcoin', network: 'livenet' }),
    getPublicKey: async () => '02',
    getBalance: async () => ({ confirmed: 0, unconfirmed: 0, total: 0 }),
    sendBitcoin: async () => 'txid',
    signMessage: async () => 'signature',
    signPsbt: async value => value,
    signPsbts: async values => values,
    pushPsbt: async () => 'txid',
    pushTx: async () => 'txid',
    switchNetwork: async () => null,
    switchChain: async () => null,
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

test('detects the complete Bitcoin provider surface including batch signing and broadcast', () => {
  const bitcoin = bitcoinProvider()
  globalThis.window = { noirwallet: { bitcoin } }
  try {
    assert.equal(getBitcoinProvider(), bitcoin)
    delete bitcoin.pushPsbt
    assert.equal(getBitcoinProvider(), null)
  } finally {
    delete globalThis.window
  }
})

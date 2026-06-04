import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { secp256k1 } from '@noble/curves/secp256k1'
import { sha256 } from '@noble/hashes/sha2'
import { bytesToHex } from '@noble/hashes/utils'
import { publicKeyToAddress, verifyMessageSignature } from './utils.ts'

const GENERATOR_COMPRESSED =
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const GENERATOR_UNCOMPRESSED =
  '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8'

function encodeCompactSize(size: number): Uint8Array {
  if (size <= 0xfc) return new Uint8Array([size])
  if (size <= 0xffff) {
    const buf = new Uint8Array(3)
    buf[0] = 0xfd
    buf[1] = size & 0xff
    buf[2] = (size >> 8) & 0xff
    return buf
  }
  const buf = new Uint8Array(5)
  buf[0] = 0xfe
  new DataView(buf.buffer).setUint32(1, size, true)
  return buf
}

function buildZcashMessagePayload(message: string): Uint8Array {
  const prefix = 'Zcash Signed Message:\n'
  const prefixBytes = new TextEncoder().encode(prefix)
  const msgBytes = new TextEncoder().encode(message)
  const parts = [
    encodeCompactSize(prefix.length),
    prefixBytes,
    encodeCompactSize(message.length),
    msgBytes
  ]
  const totalLength = parts.reduce((acc, part) => acc + part.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function signZcashMessage(message: string, privateKey: Uint8Array): {
  signature: string
  pubkey: string
} {
  const msgHash = sha256(sha256(buildZcashMessagePayload(message)))
  const sig = secp256k1.sign(msgHash, privateKey)
  const compact = sig.toCompactRawBytes()
  const recoveryId = sig.recovery ?? 0
  const header = 27 + recoveryId
  const signature = bytesToHex(new Uint8Array([header, ...compact]))
  const pubkey = bytesToHex(secp256k1.getPublicKey(privateKey, false))
  return { signature, pubkey }
}

describe('publicKeyToAddress', () => {
  it('derives mainnet address from compressed public key', () => {
    assert.equal(
      publicKeyToAddress(GENERATOR_COMPRESSED, 'mainnet'),
      't1UYsZVJkLPeMjxEtACvSxfWuNmddpWfxzs'
    )
  })

  it('derives testnet address from compressed public key', () => {
    assert.equal(
      publicKeyToAddress(GENERATOR_COMPRESSED, 'testnet'),
      'tmLPctKo9j49rtCSKpwEBpLBeykiTGomGQs'
    )
  })

  it('derives mainnet address from uncompressed public key', () => {
    assert.equal(
      publicKeyToAddress(GENERATOR_UNCOMPRESSED, 'mainnet'),
      't1UYsZVJkLPeMjxEtACvSxfWuNmddpWfxzs'
    )
  })

  it('accepts 0x-prefixed hex', () => {
    assert.equal(
      publicKeyToAddress(`0x${GENERATOR_COMPRESSED}`, 'mainnet'),
      't1UYsZVJkLPeMjxEtACvSxfWuNmddpWfxzs'
    )
  })

  it('rejects invalid hex characters', () => {
    assert.throws(
      () => publicKeyToAddress('0xzz', 'mainnet'),
      /Invalid public key: must contain only hexadecimal characters/
    )
  })

  it('rejects odd-length hex', () => {
    assert.throws(
      () =>
        publicKeyToAddress(
          '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f817981',
          'mainnet'
        ),
      /Invalid hex string: length must be even/
    )
  })

  it('rejects invalid compressed prefix', () => {
    assert.throws(
      () =>
        publicKeyToAddress(
          '0179be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
          'mainnet'
        ),
      /Invalid compressed public key prefix/
    )
  })
})

describe('verifyMessageSignature', () => {
  it('verifies a valid signature and matches pubkey and address', () => {
    const privateKey = new Uint8Array(32)
    privateKey[31] = 1
    const message = 'Hello Zcash'
    const { signature, pubkey } = signZcashMessage(message, privateKey)
    const address = publicKeyToAddress(pubkey, 'mainnet')

    const result = verifyMessageSignature({ message, signature, pubkey, address, network: 'mainnet' })

    assert.equal(result.valid, true)
    assert.equal(result.error, undefined)
    assert.equal(result.pubkeyMatch, true)
    assert.equal(result.addressMatch, true)
    assert.equal(result.recoveredAddress, address)
  })

  it('returns error when message or signature is missing', () => {
    assert.equal(
      verifyMessageSignature({ message: '', signature: 'aa' }).error,
      'Message and signature are required'
    )
  })

  it('returns error for invalid signature length', () => {
    const result = verifyMessageSignature({
      message: 'test',
      signature: 'abcd'
    })
    assert.equal(result.valid, false)
    assert.equal(result.error, 'Invalid signature: expected 65-byte hex string (130 characters)')
  })

  it('returns error for invalid signature header byte', () => {
    const result = verifyMessageSignature({
      message: 'test',
      signature: `${'00'.repeat(65)}`
    })
    assert.equal(result.valid, false)
    assert.equal(result.error, 'Invalid signature header byte: expected 27-34, got 0')
  })

  it('reports mismatch when expected address differs', () => {
    const privateKey = new Uint8Array(32)
    privateKey[31] = 1
    const message = 'Hello Zcash'
    const { signature, pubkey } = signZcashMessage(message, privateKey)

    const result = verifyMessageSignature({
      message,
      signature,
      pubkey,
      address: 't1WrongAddressXXXXXXXXXXXXXXXXXXXXX',
      network: 'mainnet'
    })

    assert.equal(result.valid, false)
    assert.equal(result.addressMatch, false)
  })
})

import bs58 from 'bs58'
import { secp256k1 } from '@noble/curves/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { ripemd160 } from '@noble/hashes/ripemd160'
import { bytesToHex } from '@noble/hashes/utils'
import type { Network, VerifyMessageParams, VerifyMessageResult } from './types'

const MAINNET_P2PKH_PREFIX = new Uint8Array([0x1c, 0xb8])
const TESTNET_P2PKH_PREFIX = new Uint8Array([0x1d, 0x25])

function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data))
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

function compressPublicKey(pubkey: Uint8Array): Uint8Array {
  if (pubkey.length === 33) {
    return pubkey
  }

  if (pubkey.length !== 65) {
    throw new Error('Invalid public key length for compression')
  }

  if (pubkey[0] !== 0x04) {
    throw new Error('Invalid uncompressed public key format')
  }

  const x = pubkey.slice(1, 33)
  const y = pubkey.slice(33, 65)

  const yIsOdd = (y[y.length - 1] & 1) === 1

  const prefix = yIsOdd ? 0x03 : 0x02

  const compressed = new Uint8Array(33)
  compressed[0] = prefix
  compressed.set(x, 1)

  return compressed
}

export function publicKeyToAddress(pubkeyHex: string, network: Network = 'mainnet'): string {
  if (!pubkeyHex || typeof pubkeyHex !== 'string') {
    throw new Error('Invalid public key: must be a non-empty hex string')
  }

  const cleanHex = pubkeyHex.toLowerCase().replace(/^0x/, '')

  if (!/^[0-9a-f]+$/.test(cleanHex)) {
    throw new Error('Invalid public key: must contain only hexadecimal characters')
  }

  const pubkeyBytes = hexToUint8Array(cleanHex)

  if (pubkeyBytes.length !== 33 && pubkeyBytes.length !== 65) {
    throw new Error(
      `Invalid public key length: expected 33 (compressed) or 65 (uncompressed) bytes, got ${pubkeyBytes.length}`
    )
  }

  if (pubkeyBytes.length === 33) {
    const prefix = pubkeyBytes[0]
    if (prefix !== 0x02 && prefix !== 0x03) {
      throw new Error(
        `Invalid compressed public key prefix: expected 0x02 or 0x03, got 0x${prefix.toString(16).padStart(2, '0')}`
      )
    }
  } else if (pubkeyBytes.length === 65) {
    const prefix = pubkeyBytes[0]
    if (prefix !== 0x04) {
      throw new Error(
        `Invalid uncompressed public key prefix: expected 0x04, got 0x${prefix.toString(16).padStart(2, '0')}`
      )
    }
  }

  const compressedPubkey = compressPublicKey(pubkeyBytes)

  const pubkeyHash = hash160(compressedPubkey)

  const versionPrefix = network === 'mainnet' ? MAINNET_P2PKH_PREFIX : TESTNET_P2PKH_PREFIX

  const payload = concatUint8Arrays(versionPrefix, pubkeyHash)

  const checksum = sha256(sha256(payload)).slice(0, 4)

  const addressBytes = concatUint8Arrays(payload, checksum)

  const address = bs58.encode(addressBytes)

  return address
}

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
  return concatUint8Arrays(
    encodeCompactSize(prefix.length),
    prefixBytes,
    encodeCompactSize(message.length),
    msgBytes
  )
}

function doubleSha256(data: Uint8Array): Uint8Array {
  return sha256(sha256(data))
}

function normalizePubkeyHex(pubkeyHex: string): string {
  return pubkeyHex.toLowerCase().replace(/^0x/, '')
}

export function verifyMessageSignature(params: VerifyMessageParams): VerifyMessageResult {
  const { message, signature, pubkey, address, network = 'mainnet' } = params

  if (!message || !signature) {
    return {
      valid: false,
      recoveredPubkey: '',
      recoveredAddress: '',
      error: 'Message and signature are required'
    }
  }

  try {
    const cleanSig = signature.toLowerCase().replace(/^0x/, '')
    if (!/^[0-9a-f]+$/.test(cleanSig) || cleanSig.length !== 130) {
      return {
        valid: false,
        recoveredPubkey: '',
        recoveredAddress: '',
        error: 'Invalid signature: expected 65-byte hex string (130 characters)'
      }
    }

    const sigBytes = hexToUint8Array(cleanSig)
    const header = sigBytes[0]
    if (header < 27 || header > 34) {
      return {
        valid: false,
        recoveredPubkey: '',
        recoveredAddress: '',
        error: `Invalid signature header byte: expected 27-34, got ${header}`
      }
    }

    const compressed = header >= 31
    const recoveryId = compressed ? header - 31 : header - 27
    if (recoveryId < 0 || recoveryId > 3) {
      return {
        valid: false,
        recoveredPubkey: '',
        recoveredAddress: '',
        error: `Invalid recovery id: ${recoveryId}`
      }
    }

    const compactSig = sigBytes.slice(1)
    const msgHash = doubleSha256(buildZcashMessagePayload(message))
    const sig = secp256k1.Signature.fromCompact(compactSig).addRecoveryBit(recoveryId)
    const recoveredPoint = sig.recoverPublicKey(msgHash)
    const recoveredPubkey = bytesToHex(recoveredPoint.toRawBytes(false))
    const recoveredAddress = publicKeyToAddress(recoveredPubkey, network)

    let pubkeyMatch: boolean | undefined
    let addressMatch: boolean | undefined

    if (pubkey) {
      pubkeyMatch = normalizePubkeyHex(pubkey) === normalizePubkeyHex(recoveredPubkey)
    }

    if (address) {
      addressMatch = address === recoveredAddress
    }

    const hasExpected = pubkey !== undefined || address !== undefined
    const valid = hasExpected ? (pubkeyMatch ?? true) && (addressMatch ?? true) : true

    return {
      valid,
      recoveredPubkey,
      recoveredAddress,
      pubkeyMatch,
      addressMatch
    }
  } catch (err) {
    return {
      valid: false,
      recoveredPubkey: '',
      recoveredAddress: '',
      error: err instanceof Error ? err.message : 'Verification failed'
    }
  }
}

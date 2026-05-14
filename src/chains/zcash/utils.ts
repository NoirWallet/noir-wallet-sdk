import bs58 from 'bs58'
import * as hashjs from 'hash.js'

export type Network = 'mainnet' | 'testnet'

const MAINNET_P2PKH_PREFIX = new Uint8Array([0x1c, 0xb8])
const TESTNET_P2PKH_PREFIX = new Uint8Array([0x1d, 0x25])

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(hashjs.sha256().update(Array.from(data)).digest())
}

function ripemd160(data: Uint8Array): Uint8Array {
  return new Uint8Array(hashjs.ripemd160().update(Array.from(data)).digest())
}

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

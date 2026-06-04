# Noir Wallet SDK

TypeScript SDK and example dApp for integrating with Noir Wallet.

## Install

```bash
pnpm install
```

## Build

```bash
pnpm build
pnpm test
pnpm --filter @noir-wallet/example build
```

## Example

The example app lives in `example/` and uses the workspace SDK package:

```bash
pnpm example:dev
```

Noir Wallet must be installed in the browser for wallet connection flows.

## SDK API

TypeScript SDK for integrating with Noir Wallet Chrome Extension.

## Installation

```bash
npm install @noir-wallet/sdk
# or
yarn add @noir-wallet/sdk
# or
pnpm add @noir-wallet/sdk
```

## Usage

### Basic Example

```typescript
import { getNoirWallet } from '@noir-wallet/sdk'

// Get Noir Wallet
const noirWallet = getNoirWallet()
if (!noirWallet) {
  throw new Error('Noir Wallet not installed')
}

const zcash = noirWallet.zcash

// Check existing connection (silent, no popup)
const accounts = await zcash.getAccounts()

// Connect wallet if not connected (shows popup)
if (!accounts) {
  const newAccounts = await zcash.connect()
  console.log('Wallet connected:', newAccounts)
} else {
  console.log('Already connected:', accounts)
}

// Get balance
const balance = await zcash.getBalance()
console.log('Transparent:', balance.transparent, 'ZEC')
console.log('Shielded:', balance.shielded, 'ZEC')
console.log('Available:', balance.available, 'ZEC') // Precise transferable amount

// Get public key
const publicKeyInfo = await zcash.getPublicKey()
if (publicKeyInfo) {
  console.log('Public Key:', publicKeyInfo.pubkey)
  console.log('Address:', publicKeyInfo.address)
}

// Send transaction (uses shielded balance only)
const txid = await zcash.sendTransaction({
  to: 'zs1XYZ...',
  amount: '0.1'
})
console.log('Transaction sent:', txid)

// Sign message
const result = await zcash.signMessage('Hello World')
console.log('Signature:', result.signature)
console.log('Address:', result.address)
```

### Detect Provider

```typescript
import { getNoirWallet, isNoirWalletInstalled } from '@noir-wallet/sdk'

// Check if installed
if (isNoirWalletInstalled()) {
  const noirWallet = getNoirWallet()
  console.log('Noir Wallet detected')
} else {
  console.error('Noir Wallet not found')
}
```

### Event Listeners

```typescript
const noirWallet = getNoirWallet()
const zcash = noirWallet.zcash

// Connect first
await zcash.connect()

// Listen to account changes (unlock/lock, switch account)
zcash.on('accountsChanged', accounts => {
  console.log('Accounts changed:', accounts)
  if (!accounts) {
    console.log('Wallet locked or disconnected')
  }
})

// Listen to chain/network changes
zcash.on('chainChanged', chainInfo => {
  console.log('Network changed:', chainInfo)
})
```

## API

### Methods

All methods are available on `noirWallet.zcash`:

#### `connect()`

Request wallet connection (shows popup if not authorized).

**Returns**: `Promise<ZcashAddress>` - Address object with transparent and shielded addresses

```typescript
const accounts = await zcash.connect()
console.log('Transparent:', accounts.transparent)
console.log('Shielded:', accounts.shielded)
```

#### `getAccounts()`

Query existing connection silently (no popup).

**Returns**: `Promise<ZcashAddress | null>` - Address object if connected, null if not connected

```typescript
const accounts = await zcash.getAccounts()
if (accounts) {
  console.log('Connected:', accounts.transparent)
} else {
  console.log('Not connected')
}
```

#### `getBalance()`

Get wallet balance.

**Returns**: `Promise<Balance>`

```typescript
const balance = await zcash.getBalance()
console.log('Shielded:', balance.shielded, 'ZEC')
console.log('Available:', balance.available, 'ZEC') // Recommended for max send amount
```

**Balance fields**:

- `transparent`: Transparent address balance
- `shielded`: Shielded balance (Sapling + Orchard)
- `total`: Total balance (transparent + shielded)
- `available`: **Precise transferable amount** - Maximum amount that can be sent considering UTXO selection, dynamic fees, and dust threshold. Calculated during background sync using WASM's `get_max_transferable_amount` method.

#### `getPublicKey(options?)`

Get the public key of the transparent address.

**Params** (optional):

- `options.signingMode`: `'current'` (default), `'derived'`, or `'legacy_index0'`

**Returns**: `Promise<{ pubkey: string, address: string, signingMode: SigningMode, originAddress?: string } | null>`

- `pubkey`: Hex-encoded public key
- `address`: Transparent address corresponding to the key
- `signingMode`: The actual signing mode used
- `originAddress`: (only in `'derived'` mode) The user's main transparent address

```typescript
// Default: current transparent address key
const publicKeyInfo = await zcash.getPublicKey()

// Derived: privacy-preserving key (unlinkable to main address)
const derivedKey = await zcash.getPublicKey({ signingMode: 'derived' })
console.log('Derived Key:', derivedKey.pubkey)
console.log('Main Address:', derivedKey.originAddress)

// Legacy index 0: BIP-44 index 0 key (legacy MCA accounts)
const legacyKey = await zcash.getPublicKey({ signingMode: 'legacy_index0' })
```

**Note**: This method requires the wallet to be connected but does not trigger an unlock popup. Returns `null` if the wallet is locked.

#### `sendTransaction(params)`

Send a transaction. **Only shielded balance is used for sending.** Transparent balance cannot be spent directly — it must be shielded in the wallet first. Memo is not yet supported.

**Params**:

- `to: string` - Recipient address
- `amount: string` - Amount in ZEC (deducted from shielded balance)

**Returns**: `Promise<string>` - Transaction ID

> **Note:** All sends use shielded balance. If you have transparent balance, please shield it in the wallet first.

```typescript
const txid = await zcash.sendTransaction({
  to: 'zs1XYZ...',
  amount: '0.1'
})
```

#### `signMessage(message, options?)`

Sign a message with a transparent address key.

**Params**:

- `message: string` - Message to sign
- `options.signingMode`: `'current'` (default), `'derived'`, or `'legacy_index0'`

**Returns**: `Promise<SignMessageResult>`

- `signature`: Hex-encoded ECDSA signature
- `pubkey`: Hex-encoded public key
- `address`: Transparent address used for signing
- `signingMode`: The actual signing mode used
- `originAddress`: (only in `'derived'` mode) The user's main transparent address

```typescript
// Default: sign with current transparent address key
const result = await zcash.signMessage('Hello World')

// Derived: sign with a privacy-preserving derived key
// Recommended for identity binding (MCA, DID) to prevent on-chain asset linkage
const derived = await zcash.signMessage('Hello World', { signingMode: 'derived' })
console.log('Signature:', derived.signature)
console.log('Origin Address:', derived.originAddress)

// Legacy index 0: for legacy MCA account binding
const legacy = await zcash.signMessage('Hello World', { signingMode: 'legacy_index0' })
```

#### `switchNetwork(network)`

Switch between mainnet and testnet.

**Params**: `network: 'mainnet' | 'testnet'`

**Returns**: `Promise<boolean>`

```typescript
await zcash.switchNetwork('testnet')
```

#### `disconnect()`

Disconnect the dApp session. Clears the authorized connection without locking the wallet.

**Returns**: `Promise<void>`

```typescript
await zcash.disconnect()
```

#### `checkLendingMcaAccount()`

Check whether the connected account has a Noir lending MCA (Multi-Chain Account) binding.

**Returns**: `Promise<LendingMcaStatus | null>`

```typescript
const status = await zcash.checkLendingMcaAccount()
if (status?.mcaId) {
  console.log('MCA ID:', status.mcaId)
  console.log('Signing mode:', status.signingMode)
}
```

### Utility Functions

#### `publicKeyToAddress(pubkey, network)`

Convert a public key to a Zcash transparent address.

**Params**:

- `pubkey: string` - Public key in hexadecimal format (compressed 33 bytes or uncompressed 65 bytes)
- `network: 'mainnet' | 'testnet'` - Network type (defaults to 'mainnet')

**Returns**: `string` - Zcash transparent address (P2PKH format)

**Throws**: Error if public key format is invalid

```typescript
import { publicKeyToAddress } from '@noir-wallet/sdk'

// Get public key from wallet
const { pubkey } = await zcash.getPublicKey()

// Convert to address for verification
const address = publicKeyToAddress(pubkey, 'mainnet')
console.log('Address:', address)

// Convert external public key
const externalPubkey = '03a1b2c3d4e5f6...'
const externalAddress = publicKeyToAddress(externalPubkey, 'mainnet')
```

**Public Key Formats**:

- Compressed (33 bytes): Starts with `02` or `03`
- Uncompressed (65 bytes): Starts with `04`

**Note**: This function implements the Bitcoin/Zcash P2PKH address generation algorithm (SHA256 → RIPEMD160 → Base58Check).

#### `verifyMessageSignature(params)`

Verify a Zcash signed message offline (no wallet required). Recovers the signer public key and transparent address from the message and signature, and optionally checks them against expected values.

**Params**:

- `message: string` - The signed message
- `signature: string` - 65-byte hex signature (130 characters, with recovery header byte)
- `pubkey?: string` - Expected public key (optional)
- `address?: string` - Expected transparent address (optional)
- `network?: 'mainnet' | 'testnet'` - Network for address derivation (defaults to `'mainnet'`)

**Returns**: `VerifyMessageResult`

```typescript
import { verifyMessageSignature } from '@noir-wallet/sdk'

const result = verifyMessageSignature({
  message: 'Hello World',
  signature: signed.signature,
  pubkey: signed.pubkey,
  address: signed.address,
  network: 'mainnet'
})

if (result.valid) {
  console.log('Signer address:', result.recoveredAddress)
} else {
  console.error('Verification failed:', result.error)
}
```

### Events

#### `accountsChanged`

Triggered when accounts change (unlock/lock, switch account).

**Data**: `ZcashAddress | null` - Current address pair (null if locked/disconnected)

#### `chainChanged`

Triggered when network changes.

**Data**: `{ chainId: string, network: string }`

## Types

```typescript
interface ZcashAddress {
  transparent: string
  shielded: string
}

interface Balance {
  transparent: string
  shielded: string
  total?: string
  available?: string // Precise max transferable amount
}

interface SendTransactionParams {
  to: string
  amount: string
}

type SigningMode = 'derived' | 'current' | 'legacy_index0'

interface SignMessageOptions {
  signingMode?: SigningMode // Default: 'current'
}

interface SignMessageResult {
  signature: string // Hex-encoded ECDSA signature
  pubkey: string // Hex-encoded public key
  address: string // Transparent address used for signing
  signingMode: SigningMode // Actual signing mode used
  originAddress?: string // Main transparent address (only in 'derived' mode)
}

interface LendingMcaStatus {
  mcaId: string | null
  publicKey: string | null
  signingMode: 'derived' | 'legacy' | 'legacy_index0'
}

interface VerifyMessageResult {
  valid: boolean
  recoveredPubkey: string
  recoveredAddress: string
  pubkeyMatch?: boolean
  addressMatch?: boolean
  error?: string
}

type Network = 'mainnet' | 'testnet'
```

## Error Handling

```typescript
const noirWallet = getNoirWallet()
if (!noirWallet) {
  console.error('Please install Noir Wallet extension')
  return
}

try {
  await noirWallet.zcash.connect()
} catch (error) {
  if (error.code === 4001) {
    console.error('User rejected the request')
  } else {
    console.error('Connection failed:', error.message)
  }
}
```

## License

MIT

# Noir Wallet SDK

> **For regular use**, install Noir Wallet from the [Chrome Web Store](https://chromewebstore.google.com/detail/noir-wallet/mfoghjbpfanobmnoemoepenjjcmfpmdn).
> Preview builds for testing are available on the [Releases](https://github.com/NoirWallet/noir-wallet-sdk/releases) page.

TypeScript SDK and example dApp for integrating with Noir Wallet.

## Install

```bash
pnpm install
```

## Build

```bash
pnpm build
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

// Send transaction with optional memo
const txid = await zcash.sendTransaction({
  to: 'zs1XYZ...',
  amount: '0.1',
  memo: 'Payment for services'
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
zcash.on('accountsChanged', async addresses => {
  if (!addresses) {
    console.log('Wallet locked or disconnected')
    return
  }
  console.log('Primary account changed:', addresses.transparent)
  // Multi-wallet dApps: refresh the authorized account list
  const result = await zcash.getAccounts()
  console.log('Authorized wallets:', result?.accounts.length)
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

Request wallet connection (shows popup if not authorized). The approval screen lets the user authorize **one or several independent wallets** in a single action (MetaMask-style: the current account is preselected, more can be added).

**Returns**: `Promise<ZcashConnectResult>` — the primary account's `transparent`/`shielded` addresses **plus** an `accounts` array listing every authorized wallet.

```typescript
const result = await zcash.connect()

// Primary (connected) account — same shape as before, fully backward compatible
console.log('Transparent:', result.transparent)
console.log('Shielded:', result.shielded)

// Every authorized wallet (always contains at least the primary)
result.accounts.forEach(acc => {
  console.log(acc.label, acc.addresses.transparent, acc.addresses.shielded)
})
```

#### `getAccounts()`

Query existing connection silently (no popup).

**Returns**: `Promise<ZcashConnectResult | null>` — same enhanced shape as `connect()`, or `null` if not connected.

```typescript
const result = await zcash.getAccounts()
if (result) {
  console.log('Connected:', result.transparent)
  console.log('Authorized wallets:', result.accounts.length)
} else {
  console.log('Not connected')
}
```

#### `getBalance(accountId?)`

Get wallet balance.

**Params** (optional):

- `accountId: string` — an account `id` (the `${walletId}:${accountId}` key from `accounts`). Omit to read the primary (connected) account.

**Returns**: `Promise<ZcashBalanceResult>` — the primary (or requested) account's balance fields **plus** an `accounts` array with every authorized account's balance.

```typescript
// Primary account balance (backward compatible)
const balance = await zcash.getBalance()
console.log('Shielded:', balance.shielded, 'ZEC')
console.log('Available:', balance.available, 'ZEC') // Recommended for max send amount

// Per-wallet balances
balance.accounts.forEach(b => {
  console.log(b.id, b.balance.shielded, b.synced ? '(synced)' : '(cached)')
})

// A specific authorized wallet
const second = await zcash.getBalance(balance.accounts[1]?.id)
```

**Balance fields**:

- `transparent`: Transparent address balance
- `shielded`: Shielded balance (Sapling + Orchard)
- `total`: Total balance (transparent + shielded)
- `available`: **Precise transferable amount** - Maximum amount that can be sent considering UTXO selection, dynamic fees, and dust threshold. Calculated during background sync using WASM's `get_max_transferable_amount` method.
- `accounts`: Balance of every authorized account; each entry carries a `synced` flag (`false` = cached/zero fallback because the wallet is locked or that account hasn't synced yet).

> **Multi-wallet access & compatibility:** `connect()` / `getAccounts()` / `getBalance()` are backward compatible — their original top-level fields are unchanged, and the `accounts` array is purely additive. dApps on **older extensions** that don't return `accounts` still work: the SDK normalizes the single-account response into a one-element `accounts` array, so your code path is identical regardless of extension version. To react to changes, listen for `accountsChanged` and re-call `getAccounts()` / `getBalance()` to refresh the array.

#### `getPublicKey(options?)`

Get the public key of the transparent address.

**Params** (optional):

- `options.signingMode`: `'current'` (default) or `'derived'`

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
```

**Note**: This method requires the wallet to be connected but does not trigger an unlock popup. Returns `null` if the wallet is locked.

#### `sendTransaction(params)`

Send a transaction. **Only shielded balance is used for sending.** Transparent balance cannot be spent directly — it must be shielded in the wallet first.

**Params**:

- `to: string` - Recipient address
- `amount: string` - Amount in ZEC (deducted from shielded balance)
- `memo?: string` - Private memo (max 512 bytes UTF-8, shielded recipients only — ignored for transparent addresses)

**Returns**: `Promise<string>` - Transaction ID

> **Note:** All sends use shielded balance. If you have transparent balance, please shield it in the wallet first.

```typescript
const txid = await zcash.sendTransaction({
  to: 'zs1XYZ...',
  amount: '0.1',
  memo: 'Payment for services'
})
```

#### `signMessage(message, options?)`

Sign a message with a transparent address key.

**Params**:

- `message: string` - Message to sign
- `options.signingMode`: `'current'` (default) or `'derived'`

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
```

#### `getAddresses()`

Get the connected wallet's transparent and shielded addresses.

**Returns**: `Promise<ZcashAddress>` - `{ transparent, shielded }`

```typescript
const addresses = await zcash.getAddresses()
console.log('Transparent:', addresses.transparent)
console.log('Shielded:', addresses.shielded)
```

#### `shieldFunds()`

Shield transparent funds to the private (shielded) balance. Requires user approval via popup.

**Returns**: `Promise<string>` - Transaction ID

```typescript
const txid = await zcash.shieldFunds()
console.log('Shield transaction:', txid)
```

> **Note**: This moves all transparent balance into the shielded pool for enhanced privacy. The user will see an approval popup.

#### `getTransactionHistory()`

Fetch transaction history from the wallet (includes on-chain and local pending transactions).

**Returns**: `Promise<TransactionHistoryEntry[]>`

Each entry contains:
- `txid`: Transaction hash (hex)
- `type`: `'send'` | `'receive'` | `'shield'` | `'swap'` | `'lending_supply'` | `'lending_withdraw'` | `'lending_claim'`
- `amount`: Amount in ZEC
- `status`: `'mined'` | `'pending'` | `'failed'`
- `timestamp`: Unix timestamp in milliseconds
- `memo`: Optional memo string

```typescript
const history = await zcash.getTransactionHistory()
history.forEach(tx => {
  console.log(`${tx.type} ${tx.amount} ZEC - ${tx.status}`)
})
```

#### `switchNetwork(network)` *(deprecated)*

> **Deprecated**: Mainnet and testnet are now separate extension builds. Install the testnet extension for testnet usage. This method is retained for backward compatibility but has no effect.

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

### Events

#### `accountsChanged`

Triggered when accounts change (unlock/lock, switch account).

**Data**: `ZcashAddress | null` - Current addresses (null if locked/disconnected)

#### `chainChanged`

Triggered when network changes.

**Data**: `{ chainId: string, network: string }`

> **Multi-wallet dApps:** there is no separate batch event. When `accountsChanged` fires, re-call `getAccounts()` (and `getBalance()`) to refresh the `accounts` array.

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

// One account from a batch (multi-wallet) authorization.
// `id` is the stable `${walletId}:${accountId}` key; `label` is the wallet name.
interface ZcashAccount {
  id: string
  label: string
  walletId: string
  accountId: string
  addresses: ZcashAddress
}

// Balance for one authorized account.
// `synced: false` means a cached/zero fallback (locked or not yet synced).
interface ZcashAccountBalance {
  id: string
  walletId: string
  accountId: string
  balance: Balance
  synced: boolean
}

// Result of connect() / getAccounts(): primary account fields + every authorized wallet.
interface ZcashConnectResult extends ZcashAddress {
  accounts: ZcashAccount[]
}

// Result of getBalance(): primary (or requested) balance + every authorized balance.
interface ZcashBalanceResult extends Balance {
  accounts: ZcashAccountBalance[]
}

interface SendTransactionParams {
  to: string
  amount: string
  memo?: string // Private memo (max 512 bytes UTF-8)
}

interface TransactionHistoryEntry {
  txid: string
  type: string      // 'send' | 'receive' | 'shield' | 'swap' | 'lending_supply' | 'lending_withdraw' | 'lending_claim'
  amount: string    // ZEC amount
  status: string    // 'mined' | 'pending' | 'failed'
  timestamp: number // Unix ms
  memo?: string
}

type SigningMode = 'derived' | 'current'

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

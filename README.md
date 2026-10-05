# Noir Wallet SDK

> **For regular use**, install Noir Wallet from the [Chrome Web Store](https://chromewebstore.google.com/detail/noir-wallet/mfoghjbpfanobmnoemoepenjjcmfpmdn).
> Preview builds for testing are available on the [Releases](https://github.com/NoirWallet/noir-wallet-sdk/releases) page.

TypeScript SDK and example dApp for integrating with Noir Wallet.

## Local development

```bash
pnpm install
pnpm build
pnpm type-check
pnpm --filter @noir-wallet/example build
```

## Example

The example app lives in `example/` and uses the workspace SDK package:

```bash
pnpm example:dev
```

Noir Wallet must be installed in the browser for wallet connection flows.

The optional `fundingSource` parameter for `getMaxTransfer()` and `sendTransaction()` requires
Noir Wallet extension **1.0.27 or later**. Omit it on older builds to use shielded funding.

## Install the SDK

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
if (accounts) {
  console.log('Already connected:', accounts)
}

document.querySelector('#connect')?.addEventListener('click', async () => {
  const connection = await zcash.connect()
  const balance = await zcash.getBalance()
  console.log(connection.accounts, balance.available)
})
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
if (!noirWallet) throw new Error('Noir Wallet not installed')
const zcash = noirWallet.zcash

// Listen to account changes (unlock/lock, switch account)
zcash.on('accountsChanged', async addresses => {
  if (!addresses || Array.isArray(addresses)) {
    console.log('Wallet locked or disconnected')
    return
  }
  console.log('Primary account changed:', addresses.transparent)
  // Multi-wallet dApps: refresh the authorized account list
  const result = await zcash.getAccounts()
  console.log('Authorized wallets:', result?.accounts.length)
})
```

## API

### Methods

All methods are available on `noirWallet.zcash`:

#### `connect()`

Request wallet connection. The approval screen opens on every call and lets the user authorize one or more accounts. The current account is preselected for a new connection.

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
console.log('Available:', balance.available, 'ZEC') // Selectable balance, excluding pending funds

// Per-wallet balances
balance.accounts.forEach(b => {
  console.log(b.id, b.balance.shielded, b.synced ? '(synced)' : '(cached)')
})

// A specific authorized wallet
const second = await zcash.getBalance(balance.accounts[1]?.id)
```

**Balance fields**:

- `transparent`: Transparent address balance
- `shielded`: Shielded balance (Sapling + Orchard + Ironwood)
- `total`: Total balance (transparent + shielded)
- `available`: Amount currently available for selection, excluding pending funds.
- `spendable`: Amount currently selectable before destination-specific fees. Use `getMaxTransfer()` for an exact Max value once the recipient, memo, funding source, and fee tier are known.
- `accounts`: Balance of every authorized account; `synced: false` marks a zero fallback without current synced data. A locked wallet returns an empty `accounts` array.

> **Compatibility:** If the provider omits `accounts`, the SDK returns a one-element array with
> `id: 'current'` and empty wallet and account IDs. Refresh authorization with `getAccounts()` after
> `accountsChanged`.

#### `getMaxTransfer(params)`

Calculate the exact transferable amount and proposal fee for a specific recipient, memo, and fee tier using the current connected account.

**Params**:

- `to: string` - Recipient address
- `memo?: string` - Private memo (max 512 bytes UTF-8, shielded recipients only)
- `feeTier?: 'standard' | 'fast'` - Fee tier used for the estimate; defaults to `standard`
- `fundingSource?: 'shielded' | 'transparent'` - Balance used for the estimate; defaults to `shielded`

**Returns**: `Promise<MaxTransferEstimate>`

- `maxAmount: string` - Exact payment amount in ZEC
- `fee: string` - Fee for the exact send-max proposal in ZEC

```typescript
const params = {
  to: 'u1XYZ...',
  memo: 'Payment for services',
  feeTier: 'standard' as const,
  fundingSource: 'transparent' as const
}
const { maxAmount, fee } = await zcash.getMaxTransfer(params)

console.log('Max:', maxAmount, 'ZEC')
console.log('Fee:', fee, 'ZEC')

const txid = await zcash.sendTransaction({
  to: params.to,
  amount: maxAmount,
  memo: params.memo,
  fundingSource: params.fundingSource
})
```

> `balance.available` excludes pending funds but does not account for destination-specific fees,
> dust, or transaction shape. Use `getMaxTransfer()` for a send-max estimate with the same
> destination, memo, and funding source. The fee tier selected during approval may change the
> final maximum. An estimate does not establish hardware signing support; Keystone cannot send
> from transparent funds.

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
if (derivedKey) {
  console.log('Derived Key:', derivedKey.pubkey)
  console.log('Main Address:', derivedKey.originAddress)
}
```

**Note**: This method requires the wallet to be connected but does not trigger an unlock popup. Returns `null` if the wallet is locked.
Ledger and Keystone accounts do not support public-key identity access through this API.

#### `sendTransaction(params)`

Send a transaction using shielded funds by default, or explicitly select transparent funds.

**Params**:

- `to: string` - Recipient address
- `amount: string` - Positive decimal ZEC amount with at most 8 decimal places
- `memo?: string` - Private memo (max 512 bytes UTF-8, shielded recipients only; not allowed for transparent recipients)
- `fundingSource?: 'shielded' | 'transparent'` - Balance used to fund the transaction; defaults to `shielded`

**Returns**: `Promise<string>` - Transaction ID after broadcast and local recording

> **Privacy:** Transparent funding reveals and may link the selected transparent
> UTXOs on-chain. It is not supported by Keystone hardware wallets.

```typescript
const txid = await zcash.sendTransaction({
  to: 'u1XYZ...',
  amount: '0.1',
  memo: 'Payment for services',
  fundingSource: 'transparent'
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
```

Ledger and Keystone accounts do not support message signing through this API. Messages must be
non-empty and at most 10,000 characters.

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

> **Note**: This shields currently eligible confirmed transparent funds after approval, subject to
> the wallet's minimum threshold. Pending funds are excluded. Ledger completes signing in a
> separate tab; Keystone cannot sign the transparent inputs required for shielding.

#### `getTransactionHistory()`

Fetch transaction history from the wallet (includes on-chain and local pending transactions).

**Returns**: `Promise<TransactionHistoryEntry[]>`

Returns the active account's newest entries first, or an empty array while locked.

Each entry contains:

- `txid`: Transaction hash (hex), possibly empty for a locally pending transaction
- `type`: Transaction category; lending actions use a `lending_` prefix.
- `amount`: Amount in ZEC
- `status`: Transaction status; treat this as a display value rather than an exhaustive enum.
- `timestamp`: Unix timestamp in milliseconds
- `memo`: Optional memo string

```typescript
const history = await zcash.getTransactionHistory()
history.forEach(tx => {
  console.log(`${tx.type} ${tx.amount} ZEC - ${tx.status}`)
})
```

#### `checkLendingMcaAccount()`

Returns `Promise<LendingMcaStatus | null>`, with `mcaId`, `publicKey`, and `signingMode` (`'derived'`,
`'legacy'`, or `'legacy_index0'`). It returns `null` while locked or without an active account.
Ledger and Keystone accounts do not support this identity method.

#### `disconnect()`

Returns `Promise<void>`. Revokes this site's authorization and emits `accountsChanged` with `null`;
it does not lock the wallet or disconnect other sites.

#### `switchNetwork(network)` _(deprecated)_

> **Deprecated**: This method always throws. Mainnet and testnet are separate extension builds;
> install the appropriate extension instead.

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
const identity = await zcash.getPublicKey()

// Convert to address for verification
if (identity) {
  const address = publicKeyToAddress(identity.pubkey, 'mainnet')
  console.log('Address:', address)
}

// Convert external public key
const externalPubkey = '03a1b2c3d4e5f6...'
const externalAddress = publicKeyToAddress(externalPubkey, 'mainnet')
```

**Public Key Formats**:

- Compressed (33 bytes): Starts with `02` or `03`
- Uncompressed (65 bytes): Starts with `04`

**Note**: This function implements the Bitcoin/Zcash P2PKH address generation algorithm (SHA256 → RIPEMD160 → Base58Check).

#### `verifyMessageSignature(params)`

Verifies a Zcash signed message locally. Pass `message` and `signature`, with optional `pubkey`,
`address`, and `network` (`'mainnet'` by default). The result includes `valid`,
`recoveredPubkey`, and `recoveredAddress`; optional key and address match fields appear when those
values are supplied. Invalid input returns `valid: false` and an `error` message.

### Events

#### `accountsChanged`

Triggered when accounts change (unlock/lock, switch account).

**Data**: `ZcashAddress | [] | null` - Current addresses, `[]` when locked, or `null` when disconnected or the active account is unauthorized.

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
  spendable?: string // Currently selectable before transaction-specific fees
  available?: string // Selectable balance, excluding pending funds
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
// `synced: false` means a zero fallback without current synced data.
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
  fundingSource?: 'shielded' | 'transparent'
}

type FeeTier = 'standard' | 'fast'

interface MaxTransferParams {
  to: string
  memo?: string
  feeTier?: FeeTier
  fundingSource?: 'shielded' | 'transparent'
}

interface MaxTransferEstimate {
  maxAmount: string
  fee: string
}

interface TransactionHistoryEntry {
  txid: string
  type: string
  amount: string // ZEC amount
  status: string
  timestamp: number // Unix ms
  memo?: string
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
  console.error('Connection failed:', error instanceof Error ? error.message : String(error))
}
```

## License

MIT

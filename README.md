# Noir Wallet SDK

Typed TypeScript SDK for integrating web apps with the Noir Wallet Chrome extension.

## Install

```bash
pnpm add @noir-wallet/sdk
```

## Quick start

```ts
import { getNoirWallet } from '@noir-wallet/sdk'

const wallet = getNoirWallet()
if (!wallet) {
  throw new Error('Install Noir Wallet to continue')
}

// Silent check: returns null when this origin is not connected.
const existing = await wallet.zcash.getAccounts()

// Invoke connect() from a deliberate user action when access is needed.
const connection = existing ?? (await wallet.zcash.connect())
console.log(connection.shielded, connection.accounts)
```

`getNoirWallet()` is the public entry point. Transaction destinations use the `to` property, and `getAccounts()` is the silent connection check.

Read the complete [Noir Wallet SDK documentation](https://docs.zknoir.com/noir-sdk-integration).

> `fundingSource` support in `getMaxTransfer()` and `sendTransaction()` requires Noir Wallet 1.0.27 or later. It defaults to shielded funds when omitted.

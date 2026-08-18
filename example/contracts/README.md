# Example test contracts

Testnet-only contracts used by the SDK example to exercise dApp contract calls
through Noir Wallet on the seven built-in EVM testnets.

- `NoirTestBench` — `setValue(uint256)` (state write + event), `deposit()`
  (payable), `withdraw()`, `alwaysRevert()` (guaranteed revert for error-path
  testing), public `storedValue`/`deposits` getters.
- `NoirTestToken` (NTT) — minimal ERC-20 with a free capped `mint`, used for
  `approve`/`transferFrom` approval-flow testing. The token has no value.

## Workflow

All commands run from `packages/sdk/example`.

```bash
# 1. Compile (writes artifacts/*.json, committed)
node contracts/compile.mjs

# 2. Deploy to every unfunded-checked testnet (updates deployments.json)
NOIR_EVM_DEPLOYER_KEY_FILE=/abs/path/evm-testnet-deployer.json node contracts/deploy.mjs

# Deploy a subset
NOIR_EVM_DEPLOYER_KEY_FILE=... node contracts/deploy.mjs ethereum-sepolia base-sepolia

# 3. Verify deployed behavior over plain RPC (no wallet involved)
NOIR_EVM_DEPLOYER_KEY_FILE=... node contracts/verify-calls.mjs
```

The deployer key file lives outside the repository with `0600` permissions:

```json
{ "schemaVersion": 1, "purpose": "evm-testnet-deployer", "privateKey": "0x…" }
```

Never fund the deployer key on mainnet, never commit it, and never paste the
private key into chat, logs, or CI configuration.

## Wallet boundary

The current wallet release intentionally rejects arbitrary contract calldata
(fail-closed). The example's "Contract test bench" section therefore exercises
the approval boundary — write calls surface the wallet's rejection error until
contract-call review ships, while `eth_call` reads work without approval.
`verify-calls.mjs` proves contract behavior independently of the wallet.

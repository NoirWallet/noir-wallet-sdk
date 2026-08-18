// Deploys NoirTestBench and NoirTestToken to the built-in Noir Wallet EVM
// testnets and records addresses in deployments.json. Idempotent: chains that
// already have both contracts recorded are skipped unless --redeploy is given.
//
// The deployer key lives OUTSIDE the repository in a 0600 JSON file:
//   { "schemaVersion": 1, "purpose": "evm-testnet-deployer", "privateKey": "0x..." }
// Point NOIR_EVM_DEPLOYER_KEY_FILE at its absolute path. Testnets only —
// never fund this key on mainnet.
//
// Usage (from packages/sdk/example):
//   NOIR_EVM_DEPLOYER_KEY_FILE=/abs/path node contracts/deploy.mjs [chainKey ...]
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, createWalletClient, defineChain, formatEther, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { TESTNET_NETWORKS } from './networks.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const deploymentsFile = join(here, 'deployments.json')

function loadDeployerAccount() {
  const keyFile = process.env.NOIR_EVM_DEPLOYER_KEY_FILE
  if (!keyFile) throw new Error('Set NOIR_EVM_DEPLOYER_KEY_FILE to the 0600 deployer key file.')
  const stats = statSync(keyFile)
  if ((stats.mode & 0o077) !== 0) throw new Error('Deployer key file must have 0600 permissions.')
  const parsed = JSON.parse(readFileSync(keyFile, 'utf8'))
  if (parsed.schemaVersion !== 1 || parsed.purpose !== 'evm-testnet-deployer') {
    throw new Error('Deployer key file has an unexpected schema.')
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(parsed.privateKey)) {
    throw new Error('Deployer key file does not contain a 32-byte hex private key.')
  }
  return privateKeyToAccount(parsed.privateKey)
}

function loadArtifact(name) {
  return JSON.parse(readFileSync(join(here, 'artifacts', `${name}.json`), 'utf8'))
}

function loadDeployments() {
  try {
    return JSON.parse(readFileSync(deploymentsFile, 'utf8'))
  } catch {
    return { comment: 'Noir Wallet SDK example test contracts, testnets only.', networks: {} }
  }
}

const redeploy = process.argv.includes('--redeploy')
const chainFilter = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
const targets = TESTNET_NETWORKS.filter(
  network => chainFilter.length === 0 || chainFilter.includes(network.key)
)
if (targets.length === 0) {
  throw new Error(`No matching networks. Known keys: ${TESTNET_NETWORKS.map(n => n.key).join(', ')}`)
}

const account = loadDeployerAccount()
const bench = loadArtifact('NoirTestBench')
const token = loadArtifact('NoirTestToken')
const deployments = loadDeployments()
console.log(`deployer: ${account.address}`)

let failures = 0
for (const network of targets) {
  const record = deployments.networks[String(network.chainId)] ?? {}
  if (!redeploy && record.NoirTestBench && record.NoirTestToken) {
    console.log(`${network.name}: already deployed, skipping`)
    continue
  }
  const chain = defineChain({
    id: network.chainId,
    name: network.name,
    nativeCurrency: { name: network.nativeSymbol, symbol: network.nativeSymbol, decimals: 18 },
    rpcUrls: { default: { http: [network.rpcUrl] } }
  })
  const publicClient = createPublicClient({ chain, transport: http() })
  const walletClient = createWalletClient({ account, chain, transport: http() })
  try {
    const balance = await publicClient.getBalance({ address: account.address })
    console.log(`${network.name}: balance ${formatEther(balance)} ${network.nativeSymbol}`)
    if (balance === 0n) {
      console.log(`${network.name}: unfunded, skipping (faucet needed)`)
      failures += 1
      continue
    }
    for (const [name, artifact] of [
      ['NoirTestBench', bench],
      ['NoirTestToken', token]
    ]) {
      if (!redeploy && record[name]) continue
      const hash = await walletClient.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
      if (receipt.status !== 'success' || !receipt.contractAddress) {
        throw new Error(`${name} deployment reverted (tx ${hash})`)
      }
      record[name] = {
        address: receipt.contractAddress,
        deployTx: hash,
        block: Number(receipt.blockNumber)
      }
      console.log(`${network.name}: ${name} at ${receipt.contractAddress}`)
    }
    deployments.networks[String(network.chainId)] = {
      key: network.key,
      name: network.name,
      explorerUrl: network.explorerUrl,
      ...record
    }
    writeFileSync(deploymentsFile, `${JSON.stringify(deployments, null, 2)}\n`)
  } catch (error) {
    failures += 1
    console.error(`${network.name}: FAILED — ${error instanceof Error ? error.message : error}`)
  }
}
process.exit(failures > 0 ? 1 : 0)

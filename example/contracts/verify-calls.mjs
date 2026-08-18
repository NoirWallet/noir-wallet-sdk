// Post-deploy verification over plain RPC (no wallet involved): writes and
// reads back state on every deployed testnet to prove the contracts behave as
// the dApp test expects. Spends only gas plus a dust deposit that is
// immediately withdrawn.
//
// Usage (from packages/sdk/example):
//   NOIR_EVM_DEPLOYER_KEY_FILE=/abs/path node contracts/verify-calls.mjs [chainKey ...]
import { readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { TESTNET_NETWORKS } from './networks.mjs'

const here = dirname(fileURLToPath(import.meta.url))

function loadDeployerAccount() {
  const keyFile = process.env.NOIR_EVM_DEPLOYER_KEY_FILE
  if (!keyFile) throw new Error('Set NOIR_EVM_DEPLOYER_KEY_FILE to the 0600 deployer key file.')
  const stats = statSync(keyFile)
  if ((stats.mode & 0o077) !== 0) throw new Error('Deployer key file must have 0600 permissions.')
  const parsed = JSON.parse(readFileSync(keyFile, 'utf8'))
  if (!/^0x[0-9a-fA-F]{64}$/.test(parsed.privateKey ?? '')) {
    throw new Error('Deployer key file does not contain a 32-byte hex private key.')
  }
  return privateKeyToAccount(parsed.privateKey)
}

const loadJson = relative => JSON.parse(readFileSync(join(here, relative), 'utf8'))
const benchArtifact = loadJson('artifacts/NoirTestBench.json')
const tokenArtifact = loadJson('artifacts/NoirTestToken.json')
const deployments = loadJson('deployments.json')

const chainFilter = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
const account = loadDeployerAccount()
const probeValue = BigInt(Date.now())
let failures = 0

for (const network of TESTNET_NETWORKS) {
  if (chainFilter.length > 0 && !chainFilter.includes(network.key)) continue
  const record = deployments.networks[String(network.chainId)]
  if (!record?.NoirTestBench || !record?.NoirTestToken) {
    console.log(`${network.name}: not deployed, skipping`)
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
  const benchAddress = record.NoirTestBench.address
  const tokenAddress = record.NoirTestToken.address
  const wait = hash => publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })

  try {
    // 1. State write + read-back.
    await wait(
      await walletClient.writeContract({
        address: benchAddress,
        abi: benchArtifact.abi,
        functionName: 'setValue',
        args: [probeValue]
      })
    )
    const stored = await publicClient.readContract({
      address: benchAddress,
      abi: benchArtifact.abi,
      functionName: 'storedValue',
      args: [account.address]
    })
    if (stored !== probeValue) throw new Error(`storedValue mismatch: ${stored} != ${probeValue}`)

    // 2. Payable deposit followed by withdraw so no balance is left behind.
    const dust = parseEther('0.0001')
    await wait(
      await walletClient.writeContract({
        address: benchAddress,
        abi: benchArtifact.abi,
        functionName: 'deposit',
        value: dust
      })
    )
    const deposited = await publicClient.readContract({
      address: benchAddress,
      abi: benchArtifact.abi,
      functionName: 'deposits',
      args: [account.address]
    })
    if (deposited < dust) throw new Error(`deposit not recorded: ${deposited}`)
    await wait(
      await walletClient.writeContract({
        address: benchAddress,
        abi: benchArtifact.abi,
        functionName: 'withdraw'
      })
    )

    // 3. Revert path must surface the exact reason string via eth_call.
    let revertReason = ''
    try {
      await publicClient.simulateContract({
        account: account.address,
        address: benchAddress,
        abi: benchArtifact.abi,
        functionName: 'alwaysRevert'
      })
    } catch (error) {
      if (error instanceof BaseError) {
        const revert = error.walk(cause => cause instanceof ContractFunctionRevertedError)
        revertReason = revert?.reason ?? ''
      }
    }
    if (revertReason !== 'NoirTestBench: intentional revert') {
      throw new Error(`unexpected revert reason: "${revertReason}"`)
    }

    // 4. ERC-20 mint + approve + transferFrom round trip back to the deployer.
    const mintAmount = parseEther('100')
    await wait(
      await walletClient.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: 'mint',
        args: [account.address, mintAmount]
      })
    )
    await wait(
      await walletClient.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: 'approve',
        args: [account.address, mintAmount]
      })
    )
    await wait(
      await walletClient.writeContract({
        address: tokenAddress,
        abi: tokenArtifact.abi,
        functionName: 'transferFrom',
        args: [account.address, account.address, mintAmount]
      })
    )
    const tokenBalance = await publicClient.readContract({
      address: tokenAddress,
      abi: tokenArtifact.abi,
      functionName: 'balanceOf',
      args: [account.address]
    })
    if (tokenBalance < mintAmount) throw new Error(`token balance too low: ${tokenBalance}`)

    console.log(`${network.name}: OK (setValue/deposit/withdraw/revert/mint/approve/transferFrom)`)
  } catch (error) {
    failures += 1
    console.error(`${network.name}: FAILED — ${error instanceof Error ? error.message : error}`)
  }
}
process.exit(failures > 0 ? 1 : 0)

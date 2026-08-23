import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createPublicClient, createWalletClient, http, keccak256 } from 'viem'
import {
  compileContracts,
  DEPLOYMENTS_DIRECTORY,
  deploymentPath,
  loadDeployer
} from './toolkit.mjs'
import { resolveTestnet, TESTNETS, toViemChain } from './testnets.mjs'

function selectedNetworks() {
  const values = process.argv.slice(2)
  if (values.length === 1 && values[0] === '--all') return Object.keys(TESTNETS)
  const networkIndex = values.indexOf('--network')
  if (networkIndex >= 0 && values[networkIndex + 1]) return [values[networkIndex + 1]]
  throw new Error('Use --network <name> or --all')
}

if (process.env.NOIR_EVM_TESTNET_DEPLOY !== '1') {
  throw new Error('Set NOIR_EVM_TESTNET_DEPLOY=1 on the command line to permit testnet deployment')
}

const account = await loadDeployer()
const artifacts = await compileContracts()
await mkdir(DEPLOYMENTS_DIRECTORY, { recursive: true })

for (const networkName of selectedNetworks()) {
  const network = resolveTestnet(networkName)
  const chain = toViemChain(network)
  const transport = http(network.rpcUrl, { timeout: 20_000, retryCount: 2 })
  const publicClient = createPublicClient({ chain, transport })
  const walletClient = createWalletClient({ account, chain, transport })
  const actualChainId = await publicClient.getChainId()
  if (actualChainId !== network.id)
    throw new Error(`${network.name} RPC returned chain ${actualChainId}`)

  const contracts = {}
  for (const [name, artifact] of Object.entries(artifacts)) {
    const transactionHash = await walletClient.deployContract({
      account,
      abi: artifact.abi,
      bytecode: artifact.bytecode
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash })
    if (receipt.status !== 'success' || !receipt.contractAddress) {
      throw new Error(`${name} deployment failed on ${network.name}`)
    }
    const deployedBytecode = await publicClient.getBytecode({ address: receipt.contractAddress })
    if (!deployedBytecode) throw new Error(`${name} bytecode is missing on ${network.name}`)
    contracts[name] = {
      address: receipt.contractAddress,
      transactionHash,
      blockNumber: receipt.blockNumber.toString(),
      bytecodeHash: keccak256(deployedBytecode)
    }
  }
  const deployment = {
    schemaVersion: 1,
    network: networkName,
    chainId: network.id,
    deployer: account.address,
    deployedAt: new Date().toISOString(),
    contracts
  }
  await writeFile(deploymentPath(networkName), `${JSON.stringify(deployment, null, 2)}\n`)
  const exampleManifestPath = join(
    DEPLOYMENTS_DIRECTORY,
    '..',
    '..',
    'example',
    'src',
    'evm-test-contracts.json'
  )
  let exampleManifest = {}
  try {
    exampleManifest = JSON.parse(await readFile(exampleManifestPath, 'utf8'))
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  exampleManifest[network.id.toString()] = {
    network: networkName,
    NoirTestBench: contracts.NoirTestBench.address,
    NoirTestToken: contracts.NoirTestToken.address
  }
  await writeFile(exampleManifestPath, `${JSON.stringify(exampleManifest, null, 2)}\n`)
  console.log(`Deployed test contracts on ${network.name}`)
}

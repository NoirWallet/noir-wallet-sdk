import { readFile } from 'node:fs/promises'
import { createPublicClient, createWalletClient, http } from 'viem'
import { compileContracts, deploymentPath, loadDeployer } from './toolkit.mjs'
import { resolveTestnet, toViemChain } from './testnets.mjs'

const values = process.argv.slice(2)
const networkIndex = values.indexOf('--network')
const networkName = networkIndex >= 0 ? values[networkIndex + 1] : undefined
if (!networkName) throw new Error('Use --network <name>')

const network = resolveTestnet(networkName)
const chain = toViemChain(network)
const publicClient = createPublicClient({
  chain,
  transport: http(network.rpcUrl, { timeout: 20_000, retryCount: 2 })
})
const artifacts = await compileContracts()
const deployment = JSON.parse(await readFile(deploymentPath(networkName), 'utf8'))
if (deployment?.schemaVersion !== 1 || deployment.chainId !== network.id) {
  throw new Error('The deployment manifest does not match the selected network')
}

for (const name of ['NoirTestBench', 'NoirTestToken']) {
  const address = deployment.contracts?.[name]?.address
  if (typeof address !== 'string' || (await publicClient.getBytecode({ address })) === undefined) {
    throw new Error(`${name} is not deployed on ${network.name}`)
  }
}

const benchAddress = deployment.contracts.NoirTestBench.address
const benchAbi = artifacts.NoirTestBench.abi
const currentValue = await publicClient.readContract({
  address: benchAddress,
  abi: benchAbi,
  functionName: 'value'
})

let reverted = false
try {
  await publicClient.simulateContract({
    address: benchAddress,
    abi: benchAbi,
    functionName: 'alwaysRevert',
    account: deployment.deployer
  })
} catch {
  reverted = true
}
if (!reverted) throw new Error('alwaysRevert unexpectedly passed simulation')

console.log(`Verified ${network.name}: value=${currentValue}; expected revert was rejected`)

if (process.env.NOIR_EVM_TESTNET_CONTRACT_CALL === '1') {
  const account = await loadDeployer()
  if (account.address.toLowerCase() !== deployment.deployer.toLowerCase()) {
    throw new Error('The configured deployer does not match the deployment manifest')
  }
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(network.rpcUrl, { timeout: 20_000, retryCount: 2 })
  })
  const send = async request => {
    const transactionHash = await walletClient.writeContract({ account, ...request })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash })
    if (receipt.status !== 'success') throw new Error(`${request.functionName} transaction failed`)
    return transactionHash
  }
  const nextValue = BigInt(currentValue) + 7n
  const transactionHashes = []
  transactionHashes.push(
    await send({
      address: benchAddress,
      abi: benchAbi,
      functionName: 'setValue',
      args: [nextValue]
    })
  )
  const storedValue = await publicClient.readContract({
    address: benchAddress,
    abi: benchAbi,
    functionName: 'value'
  })
  if (storedValue !== nextValue) throw new Error('setValue did not persist the expected value')
  transactionHashes.push(
    await send({
      address: benchAddress,
      abi: benchAbi,
      functionName: 'deposit',
      value: 1n
    })
  )
  transactionHashes.push(
    await send({
      address: benchAddress,
      abi: benchAbi,
      functionName: 'withdraw',
      args: [1n]
    })
  )

  const tokenAddress = deployment.contracts.NoirTestToken.address
  const tokenAbi = artifacts.NoirTestToken.abi
  const recipient = '0x1111111111111111111111111111111111111111'
  transactionHashes.push(
    await send({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: 'mint',
      args: [account.address, 1_000n]
    })
  )
  transactionHashes.push(
    await send({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: 'approve',
      args: [account.address, 400n]
    })
  )
  transactionHashes.push(
    await send({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: 'transferFrom',
      args: [account.address, recipient, 400n]
    })
  )
  const recipientBalance = await publicClient.readContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: [recipient]
  })
  if (recipientBalance < 400n) throw new Error('Token transferFrom verification failed')
  console.log(`Confirmed contract calls: ${transactionHashes.join(', ')}`)
}

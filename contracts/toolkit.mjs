import { readFile, lstat, realpath } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import solc from 'solc'
import { getAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

export const CONTRACTS_DIRECTORY = fileURLToPath(new URL('.', import.meta.url))
export const DEPLOYMENTS_DIRECTORY = join(CONTRACTS_DIRECTORY, 'deployments')

const CONTRACT_NAMES = Object.freeze(['NoirTestBench', 'NoirTestToken'])

export async function compileContracts() {
  const sources = Object.fromEntries(
    await Promise.all(
      CONTRACT_NAMES.map(async name => [
        `${name}.sol`,
        { content: await readFile(join(CONTRACTS_DIRECTORY, 'src', `${name}.sol`), 'utf8') }
      ])
    )
  )
  const output = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: 'Solidity',
        sources,
        settings: {
          optimizer: { enabled: true, runs: 200 },
          outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } }
        }
      })
    )
  )
  const errors = Array.isArray(output.errors) ? output.errors : []
  const failures = errors.filter(entry => entry.severity === 'error')
  if (failures.length > 0) {
    throw new Error(failures.map(entry => entry.formattedMessage).join('\n'))
  }
  return Object.freeze(
    Object.fromEntries(
      CONTRACT_NAMES.map(name => {
        const contract = output.contracts?.[`${name}.sol`]?.[name]
        const bytecode = contract?.evm?.bytecode?.object
        if (
          !Array.isArray(contract?.abi) ||
          typeof bytecode !== 'string' ||
          bytecode.length === 0
        ) {
          throw new Error(`Solidity compiler did not produce ${name}`)
        }
        return [name, Object.freeze({ abi: contract.abi, bytecode: `0x${bytecode}` })]
      })
    )
  )
}

export async function loadDeployer() {
  const configuredPath = process.env.NOIR_EVM_DEPLOYER_KEY_FILE
  if (!configuredPath || !isAbsolute(configuredPath)) {
    throw new Error('NOIR_EVM_DEPLOYER_KEY_FILE must be an absolute path')
  }
  const stats = await lstat(configuredPath)
  if (stats.isSymbolicLink() || !stats.isFile() || (stats.mode & 0o077) !== 0) {
    throw new Error('The EVM deployer file must be a regular 0600 file and not a symbolic link')
  }
  if ((await realpath(configuredPath)) !== configuredPath) {
    throw new Error('The EVM deployer file path must be canonical')
  }
  const fixture = JSON.parse(await readFile(configuredPath, 'utf8'))
  if (
    fixture?.schemaVersion !== 1 ||
    typeof fixture.privateKey !== 'string' ||
    !/^0x[0-9a-fA-F]{64}$/.test(fixture.privateKey) ||
    typeof fixture.address !== 'string'
  ) {
    throw new Error('The EVM deployer fixture is invalid')
  }
  const account = privateKeyToAccount(fixture.privateKey)
  if (getAddress(fixture.address) !== account.address) {
    throw new Error('The EVM deployer fixture address does not match its private key')
  }
  return account
}

export function deploymentPath(networkName) {
  return join(DEPLOYMENTS_DIRECTORY, `${networkName}.json`)
}

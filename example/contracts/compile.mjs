// Compiles the test-bench contracts with the pinned solc and writes
// { abi, bytecode, solcVersion } artifacts that both deploy.mjs and the
// example UI consume. Run from packages/sdk/example: node contracts/compile.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import solc from 'solc'

const here = dirname(fileURLToPath(import.meta.url))
const CONTRACTS = ['NoirTestBench', 'NoirTestToken']

const sources = Object.fromEntries(
  CONTRACTS.map(name => [
    `${name}.sol`,
    { content: readFileSync(join(here, 'src', `${name}.sol`), 'utf8') }
  ])
)

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } }
  }
}

const output = JSON.parse(solc.compile(JSON.stringify(input)))
const fatal = (output.errors ?? []).filter(entry => entry.severity === 'error')
if (fatal.length > 0) {
  for (const entry of fatal) console.error(entry.formattedMessage)
  process.exit(1)
}

for (const name of CONTRACTS) {
  const compiled = output.contracts[`${name}.sol`][name]
  const artifact = {
    contractName: name,
    solcVersion: solc.version(),
    abi: compiled.abi,
    bytecode: `0x${compiled.evm.bytecode.object}`
  }
  const outFile = join(here, 'artifacts', `${name}.json`)
  writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`)
  console.log(`compiled ${name} -> ${outFile}`)
}

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { compileContracts, CONTRACTS_DIRECTORY } from './toolkit.mjs'

const artifacts = await compileContracts()
const outputDirectory = join(CONTRACTS_DIRECTORY, 'artifacts')
await mkdir(outputDirectory, { recursive: true })
for (const [name, artifact] of Object.entries(artifacts)) {
  await writeFile(join(outputDirectory, `${name}.json`), `${JSON.stringify(artifact, null, 2)}\n`)
}
console.log(`Compiled ${Object.keys(artifacts).join(', ')}`)

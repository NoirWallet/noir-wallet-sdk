import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const catalogUrl = new URL('../example/src/evm-network-catalog.ts', import.meta.url)

function extractChainIds(source, mode) {
  const matches = source.matchAll(
    new RegExp(`network\\('${mode}',[\\s\\S]*?chainId: '(0x[0-9a-f]+)'`, 'g')
  )
  return [...matches].map(match => match[1]).sort()
}

test('keeps the example network catalog aligned with the released wallet networks', async () => {
  const source = await readFile(catalogUrl, 'utf8')

  assert.deepEqual(extractChainIds(source, 'mainnet'),
    [
      '0x1',
      '0xa',
      '0x38',
      '0x64',
      '0x89',
      '0x8f',
      '0xc4',
      '0x2105',
      '0x2611',
      '0xa4b1',
      '0xa86a',
      '0x138de'
    ].sort()
  )
  assert.deepEqual(extractChainIds(source, 'testnet'),
    ['0x61', '0xa869', '0xaa36a7', '0xaa37dc', '0x13882', '0x14a34', '0x66eee'].sort()
  )
})

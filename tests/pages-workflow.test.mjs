import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const pagesWorkflowUrl = new URL('../.github/workflows/pages.yml', import.meta.url)
const viteConfigUrl = new URL('../example/vite.config.ts', import.meta.url)

test('publishes V1 and V2 examples in one Pages artifact', async () => {
  const [workflow, viteConfig] = await Promise.all([
    readFile(pagesWorkflowUrl, 'utf8'),
    readFile(viteConfigUrl, 'utf8')
  ])

  assert.match(workflow, /branches: \[main, v2\]/)
  assert.match(workflow, /ref: main\s+path: v1/)
  assert.match(workflow, /ref: v2\s+path: v2/)
  assert.match(workflow, /uses: pnpm\/action-setup@v5\s+with:\s+version: 10\.33\.4/)
  assert.match(workflow, /GITHUB_PAGES_BASE: \/noir-wallet-sdk\/v2\//)
  assert.match(workflow, /cp -R v1\/example\/dist\/\. site\//)
  assert.match(workflow, /cp -R v1\/example\/dist\/\. site\/v1\//)
  assert.match(workflow, /cp -R v2\/example\/dist\/\. site\/v2\//)
  assert.match(workflow, /path: site/)
  assert.match(viteConfig, /process\.env\.GITHUB_PAGES_BASE/)
})

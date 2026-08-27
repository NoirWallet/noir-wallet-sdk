import type { DetectSolanaProviderOptions, SolanaProvider } from './types'
import { detectInjectedProvider } from '../detect-provider'

type NoirWalletWindow = Window & { noirwallet?: { solana?: unknown } }

function isSolanaProvider(value: unknown): value is SolanaProvider {
  if (!value || typeof value !== 'object') return false
  const provider = value as Partial<SolanaProvider>
  return (
    typeof provider.request === 'function' &&
    typeof provider.connect === 'function' &&
    typeof provider.requestAccounts === 'function' &&
    typeof provider.getAccounts === 'function' &&
    typeof provider.getNetwork === 'function' &&
    typeof provider.getBalance === 'function' &&
    typeof provider.getTokenBalance === 'function' &&
    typeof provider.sendTransfer === 'function' &&
    typeof provider.sendTokenTransfer === 'function' &&
    typeof provider.on === 'function' &&
    typeof provider.removeListener === 'function' &&
    typeof provider.disconnect === 'function'
  )
}

export function getSolanaProvider(): SolanaProvider | null {
  if (typeof window === 'undefined') return null
  const candidate = (window as NoirWalletWindow).noirwallet?.solana
  return isSolanaProvider(candidate) ? candidate : null
}

export async function detectSolanaProvider(
  options: DetectSolanaProviderOptions = {}
): Promise<SolanaProvider> {
  return detectInjectedProvider({ label: 'Solana', getProvider: getSolanaProvider, options })
}

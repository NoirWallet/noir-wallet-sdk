import type { DetectSolanaProviderOptions, SolanaProvider } from './types'
import { detectInjectedProvider } from '../detect-provider'

type NoirWalletWindow = Window & { noirwallet?: { solana?: unknown } }

function isSolanaProvider(value: unknown): value is SolanaProvider {
  if (!value || typeof value !== 'object') return false
  const provider = value as Partial<SolanaProvider>
  return (
    provider.isNoirWallet === true &&
    typeof provider.connect === 'function' &&
    typeof provider.signTransaction === 'function' &&
    typeof provider.signAllTransactions === 'function' &&
    typeof provider.signAndSendTransaction === 'function' &&
    typeof provider.signMessage === 'function' &&
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

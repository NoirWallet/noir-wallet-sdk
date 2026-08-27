import type { DetectNearProviderOptions, NearProvider } from './types'
import { detectInjectedProvider } from '../detect-provider'

type NoirWalletWindow = Window & { noirwallet?: { near?: unknown } }

function isNearProvider(value: unknown): value is NearProvider {
  if (!value || typeof value !== 'object') return false
  const provider = value as Partial<NearProvider>
  return (
    typeof provider.requestSignIn === 'function' &&
    typeof provider.signOut === 'function' &&
    typeof provider.isSignedIn === 'function' &&
    typeof provider.getAccountId === 'function' &&
    typeof provider.signTransaction === 'function' &&
    typeof provider.requestSignTransactions === 'function' &&
    typeof provider.signMessage === 'function' &&
    typeof provider.on === 'function' &&
    typeof provider.removeListener === 'function'
  )
}

export function getNearProvider(): NearProvider | null {
  if (typeof window === 'undefined') return null
  const candidate = (window as NoirWalletWindow).noirwallet?.near
  return isNearProvider(candidate) ? candidate : null
}

export async function detectNearProvider(
  options: DetectNearProviderOptions = {}
): Promise<NearProvider> {
  return detectInjectedProvider({ label: 'NEAR', getProvider: getNearProvider, options })
}

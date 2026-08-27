import type { DetectNearProviderOptions, NearProvider } from './types'
import { detectInjectedProvider } from '../detect-provider'

type NoirWalletWindow = Window & { noirwallet?: { near?: unknown } }

function isNearProvider(value: unknown): value is NearProvider {
  if (!value || typeof value !== 'object') return false
  const provider = value as Partial<NearProvider>
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

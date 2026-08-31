import type { BitcoinProvider, DetectBitcoinProviderOptions } from './types'

type NoirWalletWindow = Window & {
  noirwallet?: {
    bitcoin?: unknown
  }
}

function isBitcoinProvider(value: unknown): value is BitcoinProvider {
  if (!value || typeof value !== 'object') return false
  const provider = value as Partial<BitcoinProvider>
  return (
    typeof provider.request === 'function' &&
    typeof provider.connect === 'function' &&
    typeof provider.getAccounts === 'function' &&
    typeof provider.getNetwork === 'function' &&
    typeof provider.sendBitcoin === 'function' &&
    typeof provider.signMessage === 'function' &&
    typeof provider.signPsbt === 'function' &&
    typeof provider.signPsbts === 'function' &&
    typeof provider.pushPsbt === 'function' &&
    typeof provider.pushTx === 'function' &&
    typeof provider.disconnect === 'function'
  )
}

function abortError(): Error {
  const error = new Error('Noir Wallet Bitcoin provider discovery was aborted.')
  error.name = 'AbortError'
  return error
}

export function getBitcoinProvider(): BitcoinProvider | null {
  if (typeof window === 'undefined') return null
  const candidate = (window as NoirWalletWindow).noirwallet?.bitcoin
  return isBitcoinProvider(candidate) ? candidate : null
}

export async function detectBitcoinProvider(
  options: DetectBitcoinProviderOptions = {}
): Promise<BitcoinProvider> {
  if (typeof window === 'undefined') throw new Error('window is undefined')
  if (options.signal?.aborted) throw abortError()

  const direct = getBitcoinProvider()
  if (direct) return direct

  const timeoutMs = options.timeoutMs ?? 3000
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new TypeError('timeoutMs must be a non-negative finite number.')
  }

  return new Promise<BitcoinProvider>((resolve, reject) => {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    let settled = false

    const cleanup = () => {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
      window.removeEventListener('noirwallet#initialized', onInitialized)
      options.signal?.removeEventListener('abort', onAbort)
    }
    const succeed = (provider: BitcoinProvider) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(provider)
    }
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }
    const onInitialized = () => {
      const provider = getBitcoinProvider()
      if (provider) succeed(provider)
    }
    const onAbort = () => fail(abortError())

    window.addEventListener('noirwallet#initialized', onInitialized)
    options.signal?.addEventListener('abort', onAbort, { once: true })
    timeoutHandle = setTimeout(
      () => fail(new Error('Noir Wallet Bitcoin provider was not found.')),
      timeoutMs
    )
  })
}

import type { DetectEvmProviderOptions, Eip6963ProviderDetail, EvmProvider } from './types'

const NOIR_WALLET_RDNS = 'io.github.noirwallet'

type NoirWalletWindow = Window & {
  noirwallet?: {
    ethereum?: unknown
  }
}

function isEvmProvider(value: unknown): value is EvmProvider {
  if (!value || typeof value !== 'object') return false
  const provider = value as Partial<EvmProvider>
  return (
    provider.isNoirWallet === true &&
    typeof provider.request === 'function' &&
    typeof provider.on === 'function' &&
    typeof provider.removeListener === 'function' &&
    typeof provider.isConnected === 'function'
  )
}

function parseAnnouncement(event: Event): Eip6963ProviderDetail | null {
  const detail = (event as CustomEvent<unknown>).detail
  if (!detail || typeof detail !== 'object') return null
  const record = detail as Partial<Eip6963ProviderDetail>
  if (!record.info || typeof record.info !== 'object') return null
  if (record.info.rdns !== NOIR_WALLET_RDNS || !isEvmProvider(record.provider)) return null
  return record as Eip6963ProviderDetail
}

function abortError(): Error {
  const error = new Error('Noir Wallet EVM provider discovery was aborted.')
  error.name = 'AbortError'
  return error
}

export function getEvmProvider(): EvmProvider | null {
  if (typeof window === 'undefined') return null
  const candidate = (window as NoirWalletWindow).noirwallet?.ethereum
  return isEvmProvider(candidate) ? candidate : null
}

/**
 * Discover Noir Wallet without depending on the legacy `window.ethereum` slot.
 * EIP-6963 remains authoritative when several wallets are installed.
 */
export async function detectEvmProvider(
  options: DetectEvmProviderOptions = {}
): Promise<EvmProvider> {
  if (typeof window === 'undefined') throw new Error('window is undefined')
  if (options.signal?.aborted) throw abortError()

  const direct = getEvmProvider()
  if (direct) return direct

  const timeoutMs = options.timeoutMs ?? 3000
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new TypeError('timeoutMs must be a non-negative finite number.')
  }

  return new Promise<EvmProvider>((resolve, reject) => {
    let settled = false
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    const cleanup = () => {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
      window.removeEventListener('eip6963:announceProvider', onAnnouncement)
      window.removeEventListener('noirwallet#initialized', onInitialized)
      options.signal?.removeEventListener('abort', onAbort)
    }
    const succeed = (provider: EvmProvider) => {
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
    const requestAnnouncement = () => {
      window.dispatchEvent(new Event('eip6963:requestProvider'))
    }
    const onAnnouncement = (event: Event) => {
      const announcement = parseAnnouncement(event)
      if (announcement) succeed(announcement.provider)
    }
    const onInitialized = () => {
      const provider = getEvmProvider()
      if (provider) succeed(provider)
      else requestAnnouncement()
    }
    const onAbort = () => fail(abortError())

    window.addEventListener('eip6963:announceProvider', onAnnouncement)
    window.addEventListener('noirwallet#initialized', onInitialized)
    options.signal?.addEventListener('abort', onAbort, { once: true })
    timeoutHandle = setTimeout(
      () => fail(new Error('Noir Wallet EVM provider was not found.')),
      timeoutMs
    )
    requestAnnouncement()
  })
}

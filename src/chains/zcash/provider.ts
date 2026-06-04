import type { ZcashProvider } from './types'

export function getZcashProvider(): ZcashProvider | null {
  if (typeof window === 'undefined') return null
  const noirWallet = window.noirwallet
  if (!noirWallet?.isNoirWallet) return null
  return noirWallet.zcash || null
}

export async function detectProvider(timeout = 3000): Promise<ZcashProvider> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('window is undefined'))
    }

    const provider = getZcashProvider()

    if (provider) {
      return resolve(provider)
    }

    let handled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const cleanup = () => {
      window.removeEventListener('noirwallet#initialized', handleProvider)
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }

    const handleProvider = () => {
      if (handled) return
      handled = true
      cleanup()

      const provider = getZcashProvider()
      if (provider) {
        resolve(provider)
      } else {
        reject(new Error('Noir Wallet is not installed'))
      }
    }

    window.addEventListener('noirwallet#initialized', handleProvider)

    timeoutId = setTimeout(handleProvider, timeout)
  })
}

export function getProvider(): ZcashProvider | null {
  return getZcashProvider()
}

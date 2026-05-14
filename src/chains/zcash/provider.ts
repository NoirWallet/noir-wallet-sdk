import type { ZcashProvider } from './types'

export function getZcashProvider(): ZcashProvider | null {
  if (typeof window === 'undefined') return null
  const noirWallet = (window as any).noirwallet
  return noirWallet?.zcash || null
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
    const handleProvider = () => {
      if (handled) return
      handled = true

      const provider = getZcashProvider()
      if (provider) {
        resolve(provider)
      } else {
        reject(new Error('Noir Wallet is not installed'))
      }
    }

    window.addEventListener('noirwallet#initialized', handleProvider, { once: true })

    setTimeout(() => {
      handleProvider()
    }, timeout)
  })
}

export function getProvider(): ZcashProvider | null {
  return getZcashProvider()
}

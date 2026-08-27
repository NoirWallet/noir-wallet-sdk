export interface DetectInjectedProviderOptions {
  readonly timeoutMs?: number
  readonly signal?: AbortSignal
}

function abortError(label: string): Error {
  const error = new Error(`Noir Wallet ${label} provider discovery was aborted.`)
  error.name = 'AbortError'
  return error
}

export async function detectInjectedProvider<T>(input: {
  readonly label: string
  readonly getProvider: () => T | null
  readonly options: DetectInjectedProviderOptions
}): Promise<T> {
  if (typeof window === 'undefined') throw new Error('window is undefined')
  if (input.options.signal?.aborted) throw abortError(input.label)
  const direct = input.getProvider()
  if (direct) return direct
  const timeoutMs = input.options.timeoutMs ?? 3000
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new TypeError('timeoutMs must be a non-negative finite number.')
  }
  return new Promise<T>((resolve, reject) => {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    let settled = false
    const cleanup = () => {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
      window.removeEventListener('noirwallet#initialized', onInitialized)
      input.options.signal?.removeEventListener('abort', onAbort)
    }
    const succeed = (provider: T) => {
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
      const provider = input.getProvider()
      if (provider) succeed(provider)
    }
    const onAbort = () => fail(abortError(input.label))
    window.addEventListener('noirwallet#initialized', onInitialized)
    input.options.signal?.addEventListener('abort', onAbort, { once: true })
    timeoutHandle = setTimeout(
      () => fail(new Error(`Noir Wallet ${input.label} provider was not found.`)),
      timeoutMs
    )
  })
}

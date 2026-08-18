import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  detectBitcoinProvider,
  detectEvmProvider,
  getNoirWallet,
  type BitcoinBalance,
  type BitcoinProvider,
  type EvmProvider
} from '@noir-wallet/sdk'
import { ContractBench } from './ContractBench'

export type ExampleProviderId = 'zcash' | 'evm' | 'bitcoin'

interface ProviderSwitcherProps {
  active: ExampleProviderId
  onChange: (provider: ExampleProviderId) => void
}

export function ProviderSwitcher({ active, onChange }: ProviderSwitcherProps) {
  const options: ReadonlyArray<{
    id: ExampleProviderId
    label: string
    description: string
    symbol: string
  }> = [
    { id: 'zcash', label: 'Zcash', description: 'Private payments', symbol: 'Z' },
    { id: 'evm', label: 'EVM', description: 'EIP-1193', symbol: 'E' },
    { id: 'bitcoin', label: 'Bitcoin', description: 'BIP-322 & PSBT', symbol: '₿' }
  ]
  return (
    <nav className="provider-switcher" aria-label="Provider examples">
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          className={`provider-switcher-button ${active === option.id ? 'active' : ''}`}
          aria-label={option.label}
          aria-pressed={active === option.id}
          onClick={() => onChange(option.id)}
        >
          <span className={`provider-symbol provider-symbol-${option.id}`}>{option.symbol}</span>
          <span className="provider-option-copy">
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </span>
          <span className="provider-option-check" aria-hidden="true">
            ✓
          </span>
        </button>
      ))}
    </nav>
  )
}

function ExampleLayout({
  active,
  onChange,
  available,
  connected,
  children
}: ProviderSwitcherProps & {
  available: boolean
  connected: boolean
  children: ReactNode
}) {
  const statusClass = !available ? 'unavailable' : connected ? 'connected' : 'ready'
  const statusLabel = !available
    ? 'Provider unavailable'
    : connected
      ? 'Connected'
      : 'Provider ready'

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <a href="/" className="logo-link">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="Noir Wallet"
                className="logo-img"
              />
              <span className="logo-text">
                <span className="logo-noir">Noir </span>
                <span className="logo-wallet">Wallet</span>
              </span>
            </a>
            <span className="logo-badge">SDK Example</span>
          </div>
          <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
        </div>
      </header>
      <main className="main">
        <section className="page-intro">
          <div>
            <p className="eyebrow">Noir Wallet developer tools</p>
            <h1>Multichain provider playground</h1>
            <p className="page-intro-copy">
              Connect a real wallet, exercise provider methods, and inspect responses in one place.
            </p>
          </div>
          <div className="capability-list" aria-label="Supported capabilities">
            <span>Real MV3 provider</span>
            <span>Typed SDK</span>
            <span>Testnet ready</span>
          </div>
        </section>
        <ProviderSwitcher active={active} onChange={onChange} />
        {children}
      </main>
      <footer className="footer">
        <p>Noir Wallet SDK Example</p>
      </footer>
    </div>
  )
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'The wallet request failed.'
}

function utf8ToHex(value: string): string {
  return `0x${Array.from(new TextEncoder().encode(value), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('')}`
}

function parseEther(value: string): string {
  const normalized = value.trim()
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(normalized)) {
    throw new Error('ETH amount must be a non-negative decimal with at most 18 decimal places.')
  }
  const [whole, fraction = ''] = normalized.split('.')
  const wei = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'))
  if (wei <= 0n) throw new Error('ETH amount must be greater than zero.')
  return `0x${wei.toString(16)}`
}

function formatEther(hexWei: string): string {
  if (!/^0x[0-9a-f]+$/i.test(hexWei)) return hexWei
  const wei = BigInt(hexWei)
  const whole = wei / 10n ** 18n
  const fraction = (wei % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-item">
      <span className="label">{label}</span>
      <code className="result-code">{value}</code>
    </div>
  )
}

export function EvmExample({ active, onChange }: ProviderSwitcherProps) {
  const [provider, setProvider] = useState<EvmProvider | null>(
    () => getNoirWallet()?.ethereum ?? null
  )
  const [chainId, setChainId] = useState('')
  const [account, setAccount] = useState('')
  const [balance, setBalance] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('Hello Noir Wallet')
  const [switchChainId, setSwitchChainId] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (provider) return
    const controller = new AbortController()
    detectEvmProvider({ timeoutMs: 3000, signal: controller.signal })
      .then(setProvider)
      .catch(discoveryError => {
        if ((discoveryError as Error).name !== 'AbortError') setError(formatError(discoveryError))
      })
    return () => controller.abort()
  }, [provider])

  const refresh = useCallback(async (current: EvmProvider) => {
    const [nextChainId, accounts] = await Promise.all([
      current.request<string>({ method: 'eth_chainId' }),
      current.request<readonly string[]>({ method: 'eth_accounts' })
    ])
    const nextAccount = accounts[0] ?? ''
    setChainId(nextChainId)
    setAccount(nextAccount)
    setSwitchChainId(value => value || nextChainId)
    setBalance(
      nextAccount
        ? formatEther(
            await current.request<string>({
              method: 'eth_getBalance',
              params: [nextAccount, 'latest']
            })
          )
        : ''
    )
  }, [])

  useEffect(() => {
    if (!provider) return
    const onAccountsChanged = (value: unknown) => {
      const accounts = Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
      setAccount(accounts[0] ?? '')
      void refresh(provider).catch(refreshError => setError(formatError(refreshError)))
    }
    const onChainChanged = (value: unknown) => {
      if (typeof value === 'string') setChainId(value)
      void refresh(provider).catch(refreshError => setError(formatError(refreshError)))
    }
    provider.on('accountsChanged', onAccountsChanged)
    provider.on('chainChanged', onChainChanged)
    void refresh(provider).catch(refreshError => setError(formatError(refreshError)))
    return () => {
      provider.removeListener('accountsChanged', onAccountsChanged)
      provider.removeListener('chainChanged', onChainChanged)
    }
  }, [provider, refresh])

  const run = async (operation: () => Promise<string | void>) => {
    setBusy(true)
    setError('')
    setResult('')
    try {
      const nextResult = await operation()
      if (nextResult) setResult(nextResult)
      if (provider) await refresh(provider)
    } catch (operationError) {
      setError(formatError(operationError))
    } finally {
      setBusy(false)
    }
  }

  const connect = () =>
    run(async () => {
      if (!provider) throw new Error('Noir Wallet EVM provider is unavailable.')
      const accounts = await provider.request<readonly string[]>({ method: 'eth_requestAccounts' })
      if (!accounts[0]) throw new Error('No EVM account was authorized.')
      return `Connected ${accounts[0]}`
    })

  const disconnect = () =>
    run(async () => {
      if (!provider) throw new Error('Noir Wallet EVM provider is unavailable.')
      await provider.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }]
      })
      return 'EVM permission revoked.'
    })

  const sendTransaction = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      if (!provider || !account) throw new Error('Connect an EVM account first.')
      const transactionHash = await provider.request<string>({
        method: 'eth_sendTransaction',
        params: [{ from: account, to: recipient.trim(), value: parseEther(amount) }]
      })
      return `Transaction: ${transactionHash}`
    })
  }

  const signMessage = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      if (!provider || !account) throw new Error('Connect an EVM account first.')
      const signature = await provider.request<string>({
        method: 'personal_sign',
        params: [utf8ToHex(message), account]
      })
      return `Personal signature: ${signature}`
    })
  }

  const signTypedData = () =>
    run(async () => {
      if (!provider || !account || !chainId) throw new Error('Connect an EVM account first.')
      const payload = JSON.stringify({
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
          ],
          Message: [{ name: 'contents', type: 'string' }]
        },
        primaryType: 'Message',
        domain: {
          name: 'Noir Wallet SDK Example',
          version: '1',
          chainId: Number(BigInt(chainId)),
          verifyingContract: account
        },
        message: { contents: message }
      })
      const signature = await provider.request<string>({
        method: 'eth_signTypedData_v4',
        params: [account, payload]
      })
      return `Typed-data signature: ${signature}`
    })

  const switchNetwork = () =>
    run(async () => {
      if (!provider || !/^0x[0-9a-f]+$/i.test(switchChainId)) {
        throw new Error('Enter a hexadecimal EVM chain ID.')
      }
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: switchChainId.toLowerCase() }]
      })
      return `Switched to ${switchChainId.toLowerCase()}`
    })

  return (
    <ExampleLayout
      active={active}
      onChange={onChange}
      available={provider !== null}
      connected={account !== ''}
    >
      {!provider && <div className="message warning">EVM provider is not enabled.</div>}
      <section className="provider-summary card">
        <div className="provider-summary-copy">
          <span className="provider-hero-icon provider-hero-icon-evm">E</span>
          <div>
            <p className="section-kicker">Selected provider</p>
            <h2>EVM provider</h2>
            <p>Discovered through EIP-6963 without replacing another wallet provider.</p>
          </div>
        </div>
        <div className="provider-actions">
          <button
            className="btn btn-primary"
            onClick={() => void connect()}
            disabled={!provider || busy}
          >
            {account ? 'Reconnect EVM' : 'Connect EVM'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => void disconnect()}
            disabled={!account || busy}
          >
            Disconnect
          </button>
        </div>
      </section>
      <div className="tab-panel grid-2">
        <section className="card card-compact">
          <h2>Account &amp; network</h2>
          <Result label="Chain ID" value={chainId || 'Unavailable'} />
          <Result label="Address" value={account || 'Not connected'} />
          <Result
            label="Native balance"
            value={balance ? `${balance} native units` : 'Unavailable'}
          />
          <div className="form-group">
            <label className="label" htmlFor="evm-chain-id">
              Switch built-in chain
            </label>
            <input
              id="evm-chain-id"
              className="input input-sm"
              value={switchChainId}
              onChange={event => setSwitchChainId(event.target.value)}
              placeholder="0x1"
            />
          </div>
          <button
            className="btn btn-secondary btn-full"
            onClick={() => void switchNetwork()}
            disabled={!account || busy}
          >
            Switch chain
          </button>
        </section>
        <section className="card card-compact">
          <h2>Send native asset</h2>
          <form className="form-stack" onSubmit={sendTransaction}>
            <label className="label" htmlFor="evm-recipient">
              Recipient
            </label>
            <input
              id="evm-recipient"
              className="input input-sm"
              value={recipient}
              onChange={event => setRecipient(event.target.value)}
              placeholder="0x…"
              required
            />
            <label className="label" htmlFor="evm-amount">
              Amount (native token)
            </label>
            <input
              id="evm-amount"
              className="input input-sm"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              placeholder="0.001"
              inputMode="decimal"
              required
            />
            <button className="btn btn-primary btn-full" disabled={!account || busy}>
              Send transaction
            </button>
          </form>
        </section>
        <section className="card card-compact grid-span-2">
          <h2>Sign messages</h2>
          <form className="form-stack" onSubmit={signMessage}>
            <label className="label" htmlFor="evm-message">
              Message
            </label>
            <textarea
              id="evm-message"
              className="input textarea"
              value={message}
              onChange={event => setMessage(event.target.value)}
              rows={3}
              required
            />
            <div className="btn-row">
              <button className="btn btn-primary" disabled={!account || busy}>
                Personal sign
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void signTypedData()}
                disabled={!account || busy}
              >
                Sign EIP-712
              </button>
            </div>
          </form>
        </section>
        <ContractBench
          provider={provider}
          account={account}
          chainId={chainId}
          busy={busy}
          run={run}
        />
      </div>
      {result && <div className="message success provider-result">{result}</div>}
      {error && <div className="message error provider-result">{error}</div>}
    </ExampleLayout>
  )
}

export function BitcoinExample({ active, onChange }: ProviderSwitcherProps) {
  const [provider, setProvider] = useState<BitcoinProvider | null>(
    () => getNoirWallet()?.bitcoin ?? null
  )
  const [network, setNetwork] = useState('')
  const [account, setAccount] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [balance, setBalance] = useState<BitcoinBalance | null>(null)
  const [recipient, setRecipient] = useState('')
  const [satoshis, setSatoshis] = useState('')
  const [message, setMessage] = useState('Hello Noir Bitcoin')
  const [psbt, setPsbt] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (provider) return
    const controller = new AbortController()
    detectBitcoinProvider({ timeoutMs: 3000, signal: controller.signal })
      .then(setProvider)
      .catch(discoveryError => {
        if ((discoveryError as Error).name !== 'AbortError') setError(formatError(discoveryError))
      })
    return () => controller.abort()
  }, [provider])

  const refresh = useCallback(async (current: BitcoinProvider) => {
    const [nextNetwork, accounts] = await Promise.all([current.getNetwork(), current.getAccounts()])
    const nextAccount = accounts[0] ?? ''
    setNetwork(nextNetwork)
    setAccount(nextAccount)
    if (!nextAccount) {
      setPublicKey('')
      setBalance(null)
      return
    }
    const [nextPublicKey, nextBalance] = await Promise.all([
      current.getPublicKey(),
      current.getBalance()
    ])
    setPublicKey(nextPublicKey)
    setBalance(nextBalance)
  }, [])

  useEffect(() => {
    if (!provider) return
    const onAccountsChanged = () => {
      void refresh(provider).catch(refreshError => setError(formatError(refreshError)))
    }
    provider.on('accountsChanged', onAccountsChanged)
    void refresh(provider).catch(refreshError => setError(formatError(refreshError)))
    return () => {
      provider.removeListener('accountsChanged', onAccountsChanged)
    }
  }, [provider, refresh])

  const run = async (operation: () => Promise<string | void>) => {
    setBusy(true)
    setError('')
    setResult('')
    try {
      const nextResult = await operation()
      if (nextResult) setResult(nextResult)
      if (provider) await refresh(provider)
    } catch (operationError) {
      setError(formatError(operationError))
    } finally {
      setBusy(false)
    }
  }

  const connect = () =>
    run(async () => {
      if (!provider) throw new Error('Noir Wallet Bitcoin provider is unavailable.')
      const connected = await provider.connect()
      setPublicKey(connected.publicKey)
      return `Connected ${connected.address}`
    })

  const disconnect = () =>
    run(async () => {
      if (!provider) throw new Error('Noir Wallet Bitcoin provider is unavailable.')
      await provider.disconnect()
      return 'Bitcoin permission revoked.'
    })

  const sendBitcoin = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      if (!provider || !account) throw new Error('Connect a Bitcoin account first.')
      if (!/^\d+$/.test(satoshis)) throw new Error('Satoshis must be a positive integer.')
      const amount = Number(satoshis)
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error('Satoshis must be a positive safe integer.')
      }
      const transactionId = await provider.sendBitcoin(recipient.trim(), amount)
      return `Transaction: ${transactionId}`
    })
  }

  const signMessage = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      if (!provider || !account) throw new Error('Connect a Bitcoin account first.')
      return `BIP-322 signature: ${await provider.signMessage(message, 'bip322-simple')}`
    })
  }

  const signPsbt = () =>
    run(async () => {
      if (!provider || !account) throw new Error('Connect a Bitcoin account first.')
      if (!/^(?:[0-9a-f]{2})+$/i.test(psbt.trim())) throw new Error('Enter a PSBT as hex bytes.')
      return `Signed PSBT: ${await provider.signPsbt(psbt.trim(), { autoFinalized: false })}`
    })

  return (
    <ExampleLayout
      active={active}
      onChange={onChange}
      available={provider !== null}
      connected={account !== ''}
    >
      {!provider && <div className="message warning">Bitcoin provider is not enabled.</div>}
      <section className="provider-summary card">
        <div className="provider-summary-copy">
          <span className="provider-hero-icon provider-hero-icon-bitcoin">₿</span>
          <div>
            <p className="section-kicker">Selected provider</p>
            <h2>Bitcoin provider</h2>
            <p>Typed access to accounts, BIP-322 signatures, PSBTs, and transactions.</p>
          </div>
        </div>
        <div className="provider-actions">
          <button
            className="btn btn-primary"
            onClick={() => void connect()}
            disabled={!provider || busy}
          >
            {account ? 'Reconnect Bitcoin' : 'Connect Bitcoin'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => void disconnect()}
            disabled={!account || busy}
          >
            Disconnect
          </button>
        </div>
      </section>
      <div className="tab-panel grid-2">
        <section className="card card-compact">
          <h2>Account &amp; network</h2>
          <Result label="Network" value={network || 'Unavailable'} />
          <Result label="Address" value={account || 'Not connected'} />
          <Result label="Public key" value={publicKey || 'Unavailable'} />
          <Result
            label="Balance"
            value={
              balance ? `${balance.total} sats (${balance.unconfirmed} unconfirmed)` : 'Unavailable'
            }
          />
        </section>
        <section className="card card-compact">
          <h2>Send Bitcoin</h2>
          <form className="form-stack" onSubmit={sendBitcoin}>
            <label className="label" htmlFor="bitcoin-recipient">
              Recipient
            </label>
            <input
              id="bitcoin-recipient"
              className="input input-sm"
              value={recipient}
              onChange={event => setRecipient(event.target.value)}
              placeholder="bc1q… / tb1q…"
              required
            />
            <label className="label" htmlFor="bitcoin-satoshis">
              Amount (satoshis)
            </label>
            <input
              id="bitcoin-satoshis"
              className="input input-sm"
              value={satoshis}
              onChange={event => setSatoshis(event.target.value)}
              inputMode="numeric"
              placeholder="1000"
              required
            />
            <button className="btn btn-primary btn-full" disabled={!account || busy}>
              Send Bitcoin
            </button>
          </form>
        </section>
        <section className="card card-compact">
          <h2>Sign BIP-322 message</h2>
          <form className="form-stack" onSubmit={signMessage}>
            <textarea
              className="input textarea"
              value={message}
              onChange={event => setMessage(event.target.value)}
              rows={3}
              required
            />
            <button className="btn btn-primary btn-full" disabled={!account || busy}>
              Sign message
            </button>
          </form>
        </section>
        <section className="card card-compact">
          <h2>Sign PSBT</h2>
          <textarea
            className="input textarea"
            value={psbt}
            onChange={event => setPsbt(event.target.value)}
            rows={4}
            placeholder="PSBT hex"
          />
          <button
            className="btn btn-secondary btn-full"
            onClick={() => void signPsbt()}
            disabled={!account || !psbt || busy}
          >
            Sign PSBT
          </button>
        </section>
      </div>
      {result && <div className="message success provider-result">{result}</div>}
      {error && <div className="message error provider-result">{error}</div>}
    </ExampleLayout>
  )
}

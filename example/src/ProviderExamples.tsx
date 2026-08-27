import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  addEvmNetwork,
  detectBitcoinProvider,
  detectEvmProvider,
  detectNearProvider,
  detectSolanaProvider,
  getNoirWallet,
  switchEvmChain,
  type BitcoinBalance,
  type BitcoinChainInfo,
  type BitcoinNetwork,
  type BitcoinProvider,
  type EvmProvider,
  type NearProvider,
  type SolanaProvider
} from '@noir-wallet/sdk'
import { encodeFunctionData, isAddress } from 'viem'
import testContractDeployments from './evm-test-contracts.json'
import {
  getEvmNetworkExamples,
  getExampleChainIconUrl,
  type EvmNetworkExample
} from './evm-network-catalog'

const NOIR_TEST_BENCH_ABI = [
  {
    type: 'function',
    name: 'setValue',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'nextValue', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'increment',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'alwaysRevert',
    stateMutability: 'pure',
    inputs: [],
    outputs: []
  }
] as const

const TEST_BENCH_DEPLOYMENTS = testContractDeployments as Readonly<
  Record<string, { readonly NoirTestBench?: string }>
>

export type ExampleProviderId = 'zcash' | 'evm' | 'bitcoin' | 'solana' | 'near'

export interface ExampleNavigationProps {
  active: ExampleProviderId
  onChange: (provider: ExampleProviderId) => void
  networkMode: EvmNetworkExample['mode']
  onNetworkModeChange: (mode: EvmNetworkExample['mode']) => void
  selectedEvmNetwork: EvmNetworkExample
  onSelectEvmNetwork: (network: EvmNetworkExample) => void
}

export function ExampleChainIcon({
  iconUrl,
  label,
  className
}: {
  iconUrl: string
  label: string
  className: string
}) {
  return (
    <span className={`${className} example-chain-icon`} aria-hidden="true">
      <span>{label.slice(0, 1)}</span>
      <img
        src={iconUrl}
        alt=""
        onError={event => {
          event.currentTarget.hidden = true
        }}
      />
    </span>
  )
}

export function ProviderSwitcher({
  active,
  onChange,
  networkMode,
  onNetworkModeChange,
  selectedEvmNetwork,
  onSelectEvmNetwork
}: ExampleNavigationProps) {
  const options = [
    {
      id: 'zcash' as const,
      label: 'Zcash',
      iconUrl: getExampleChainIconUrl('zcash')
    },
    ...getEvmNetworkExamples(networkMode).map(network => ({
      id: 'evm' as const,
      label: network.label,
      iconUrl: network.iconUrl,
      network
    })),
    { id: 'bitcoin' as const, label: 'Bitcoin', iconUrl: getExampleChainIconUrl('bitcoin') },
    {
      id: 'solana' as const,
      label: networkMode === 'mainnet' ? 'Solana' : 'Solana Devnet',
      iconUrl: getExampleChainIconUrl('solana')
    },
    {
      id: 'near' as const,
      label: networkMode === 'mainnet' ? 'NEAR' : 'NEAR Testnet',
      iconUrl: getExampleChainIconUrl('near')
    }
  ]
  return (
    <nav className="provider-network-nav" aria-label="Provider examples">
      <div className="provider-network-nav-heading">
        <div>
          <span className="section-kicker">Provider examples</span>
          <h2>Networks</h2>
        </div>
        <div className="network-mode-tabs" aria-label="Example network mode">
          {(['mainnet', 'testnet'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              className={networkMode === mode ? 'active' : ''}
              aria-pressed={networkMode === mode}
              onClick={() => onNetworkModeChange(mode)}
            >
              {mode === 'mainnet' ? 'Mainnet' : 'Testnet'}
            </button>
          ))}
        </div>
      </div>
      <div className="provider-network-grid">
        {options.map(option => {
          const selected =
            active === option.id && (option.id !== 'evm' || option.network === selectedEvmNetwork)
          return (
            <button
              key={option.id === 'evm' ? option.network.request.chainId : option.id}
              type="button"
              className={`provider-network-button ${selected ? 'active' : ''}`}
              aria-label={option.label}
              aria-pressed={selected}
              onClick={() => {
                if (option.id === 'evm') onSelectEvmNetwork(option.network)
                onChange(option.id)
              }}
            >
              <ExampleChainIcon
                className="provider-network-icon-frame"
                iconUrl={option.iconUrl}
                label={option.label}
              />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function ExampleLayout({
  navigation,
  available,
  connected,
  children
}: {
  navigation: ExampleNavigationProps
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
            <span className="logo-badge">SDK Example V2</span>
          </div>
          <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
        </div>
      </header>
      <main className="main">
        <section className="page-intro">
          <div>
            <p className="eyebrow">Noir Wallet developer tools</p>
            <h1>Multichain SDK Playground</h1>
          </div>
        </section>
        <ProviderSwitcher {...navigation} />
        {children}
      </main>
      <footer className="footer">
        <p>Noir Wallet SDK Example V2</p>
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

export function EvmExample({ navigation }: { navigation: ExampleNavigationProps }) {
  const [provider, setProvider] = useState<EvmProvider | null>(
    () => getNoirWallet()?.ethereum ?? null
  )
  const [chainId, setChainId] = useState('')
  const [account, setAccount] = useState('')
  const [balance, setBalance] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('Hello Noir Wallet')
  const [contractAddress, setContractAddress] = useState('')
  const [contractValue, setContractValue] = useState('42')
  const [contractDeposit, setContractDeposit] = useState('0.0001')
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
    setContractAddress(value => {
      const preset = TEST_BENCH_DEPLOYMENTS[BigInt(nextChainId).toString()]?.NoirTestBench
      return preset ?? value
    })
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

  const lastAutomaticSwitch = useRef('')
  useEffect(() => {
    const targetChainId = navigation.selectedEvmNetwork.request.chainId
    if (!provider || !account || !chainId || chainId === targetChainId) return
    const attemptKey = `${account}:${chainId}:${targetChainId}`
    if (lastAutomaticSwitch.current === attemptKey) return
    lastAutomaticSwitch.current = attemptKey
    void run(async () => {
      await switchEvmChain(provider, targetChainId)
      return `Switched to ${navigation.selectedEvmNetwork.label}`
    })
  }, [account, chainId, navigation.selectedEvmNetwork, provider])

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

  const addSelectedNetwork = () =>
    run(async () => {
      if (!provider) throw new Error('Connect an EVM account first.')
      await addEvmNetwork(provider, navigation.selectedEvmNetwork.request)
      return `${navigation.selectedEvmNetwork.label} is already available in Noir Wallet.`
    })

  const callTestBench = (functionName: 'increment' | 'setValue' | 'deposit' | 'alwaysRevert') =>
    run(async () => {
      if (!provider || !account) throw new Error('Connect an EVM account first.')
      const target = contractAddress.trim()
      if (!isAddress(target)) throw new Error('Enter a valid NoirTestBench contract address.')
      if (!/^\d+$/.test(contractValue)) throw new Error('Test value must be an unsigned integer.')
      const data = encodeFunctionData({
        abi: NOIR_TEST_BENCH_ABI,
        functionName,
        ...(functionName === 'setValue' ? { args: [BigInt(contractValue)] } : {})
      })
      const transactionHash = await provider.request<string>({
        method: 'eth_sendTransaction',
        params: [
          {
            from: account,
            to: target,
            value: functionName === 'deposit' ? parseEther(contractDeposit) : '0x0',
            data
          }
        ]
      })
      return `${functionName} transaction: ${transactionHash}`
    })

  return (
    <ExampleLayout navigation={navigation} available={provider !== null} connected={account !== ''}>
      {!provider && <div className="message warning">EVM provider is not enabled.</div>}
      <section className="provider-summary card">
        <div className="provider-summary-copy">
          <ExampleChainIcon
            className="provider-hero-icon"
            iconUrl={navigation.selectedEvmNetwork.iconUrl}
            label={navigation.selectedEvmNetwork.label}
          />
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
          <details className="network-method-example">
            <summary>EIP-3085 add-network example</summary>
            <p>
              Noir Wallet accepts released built-in chains here. Custom EVM networks stay disabled
              in this release.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => void addSelectedNetwork()}
              disabled={!account || busy}
            >
              Add {navigation.selectedEvmNetwork.label}
            </button>
          </details>
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
          <h2>Smart contract testing</h2>
          <p className="card-hint">
            Exercises arbitrary calldata, payable value, simulation rejection, approval, signing,
            broadcast, and Activity through the real EIP-1193 provider.
          </p>
          <div className="form-stack">
            <label className="label" htmlFor="evm-contract-address">
              NoirTestBench address
            </label>
            <input
              id="evm-contract-address"
              className="input input-sm"
              value={contractAddress}
              onChange={event => setContractAddress(event.target.value)}
              placeholder="0x…"
            />
            <div className="contract-fields">
              <div className="form-group">
                <label className="label" htmlFor="evm-contract-value">
                  setValue argument
                </label>
                <input
                  id="evm-contract-value"
                  className="input input-sm"
                  value={contractValue}
                  onChange={event => setContractValue(event.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="evm-contract-deposit">
                  Deposit amount
                </label>
                <input
                  id="evm-contract-deposit"
                  className="input input-sm"
                  value={contractDeposit}
                  onChange={event => setContractDeposit(event.target.value)}
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="contract-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void callTestBench('increment')}
                disabled={!account || busy}
              >
                Increment
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void callTestBench('setValue')}
                disabled={!account || busy}
              >
                Set value
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void callTestBench('deposit')}
                disabled={!account || busy}
              >
                Payable deposit
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void callTestBench('alwaysRevert')}
                disabled={!account || busy}
              >
                Verify revert block
              </button>
            </div>
          </div>
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
      </div>
      {result && <div className="message success provider-result">{result}</div>}
      {error && <div className="message error provider-result">{error}</div>}
    </ExampleLayout>
  )
}

export function BitcoinExample({ navigation }: { navigation: ExampleNavigationProps }) {
  const [provider, setProvider] = useState<BitcoinProvider | null>(
    () => getNoirWallet()?.bitcoin ?? null
  )
  const [network, setNetwork] = useState<BitcoinNetwork | ''>('')
  const [chain, setChain] = useState<BitcoinChainInfo | null>(null)
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
    const [nextNetwork, nextChain, accounts] = await Promise.all([
      current.getNetwork(),
      current.getChain(),
      current.getAccounts()
    ])
    const nextAccount = accounts[0] ?? ''
    setNetwork(nextNetwork)
    setChain(nextChain)
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

  const validateNetwork = () =>
    run(async () => {
      if (!provider || !network) throw new Error('Connect a Bitcoin account first.')
      await provider.switchNetwork(network)
      return `${network} matches Noir Wallet global mode.`
    })

  const validateChain = () =>
    run(async () => {
      if (!provider || !chain) throw new Error('Connect a Bitcoin account first.')
      await provider.switchChain({ enum: chain.enum })
      return `${chain.name} matches Noir Wallet global mode.`
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
    <ExampleLayout navigation={navigation} available={provider !== null} connected={account !== ''}>
      {!provider && <div className="message warning">Bitcoin provider is not enabled.</div>}
      <section className="provider-summary card">
        <div className="provider-summary-copy">
          <ExampleChainIcon
            className="provider-hero-icon"
            iconUrl={getExampleChainIconUrl('bitcoin')}
            label="Bitcoin"
          />
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
          <Result label="Chain" value={chain?.name ?? 'Unavailable'} />
          <Result label="Address" value={account || 'Not connected'} />
          <Result label="Public key" value={publicKey || 'Unavailable'} />
          <Result
            label="Balance"
            value={
              balance ? `${balance.total} sats (${balance.unconfirmed} unconfirmed)` : 'Unavailable'
            }
          />
          <div className="button-row compact-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void validateNetwork()}
              disabled={!account || busy}
            >
              Validate network
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void validateChain()}
              disabled={!account || busy}
            >
              Validate chain
            </button>
          </div>
          <p className="field-help">
            These compatibility methods validate the active mode. Change Mainnet/Testnet Mode in
            Noir Wallet settings.
          </p>
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

type NativeExampleProvider = SolanaProvider | NearProvider

export function NativeTransferExample({
  navigation,
  chain
}: {
  navigation: ExampleNavigationProps
  chain: 'solana' | 'near'
}) {
  const walletProvider = getNoirWallet()?.[chain] ?? null
  const [provider, setProvider] = useState<NativeExampleProvider | null>(walletProvider)
  const [account, setAccount] = useState('')
  const [network, setNetwork] = useState('')
  const [balance, setBalance] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [tokenAssetId, setTokenAssetId] = useState('')
  const [tokenBalance, setTokenBalance] = useState('')
  const [tokenAmountRaw, setTokenAmountRaw] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const displayName = chain === 'solana' ? 'Solana' : 'NEAR'
  const unitName = chain === 'solana' ? 'lamports' : 'yoctoNEAR'

  useEffect(() => {
    if (provider) return
    const controller = new AbortController()
    const detection =
      chain === 'solana'
        ? detectSolanaProvider({ timeoutMs: 3000, signal: controller.signal })
        : detectNearProvider({ timeoutMs: 3000, signal: controller.signal })
    detection.then(setProvider).catch(discoveryError => {
      if ((discoveryError as Error).name !== 'AbortError') setError(formatError(discoveryError))
    })
    return () => controller.abort()
  }, [chain, provider])

  const refresh = useCallback(async (current: NativeExampleProvider) => {
    const [nextNetwork, accounts] = await Promise.all([current.getNetwork(), current.getAccounts()])
    const nextAccount = accounts[0] ?? ''
    setNetwork(`${nextNetwork.name} (${nextNetwork.chainId})`)
    setAccount(nextAccount)
    setBalance(nextAccount ? (await current.getBalance()).availableRaw : '')
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

  const run = async (operation: () => Promise<string>) => {
    setBusy(true)
    setError('')
    setResult('')
    try {
      setResult(await operation())
      if (provider) await refresh(provider)
    } catch (operationError) {
      setError(formatError(operationError))
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      if (!provider || !account) throw new Error(`Connect a ${displayName} account first.`)
      if (!/^[1-9][0-9]*$/.test(amountRaw)) {
        throw new Error(`${unitName} must be a positive integer string.`)
      }
      return `Transaction: ${await provider.sendTransfer(recipient.trim(), amountRaw)}`
    })
  }

  const submitToken = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      if (!provider || !account) throw new Error(`Connect a ${displayName} account first.`)
      if (!/^[1-9][0-9]*$/.test(tokenAmountRaw)) {
        throw new Error('Token amount must be a positive integer string in base units.')
      }
      return `Transaction: ${await provider.sendTokenTransfer(
        tokenAssetId.trim(),
        recipient.trim(),
        tokenAmountRaw
      )}`
    })
  }

  return (
    <ExampleLayout navigation={navigation} available={provider !== null} connected={account !== ''}>
      {!provider && <div className="message warning">{displayName} provider is not enabled.</div>}
      <section className="provider-summary card">
        <div className="provider-summary-copy">
          <ExampleChainIcon
            className="provider-hero-icon"
            iconUrl={getExampleChainIconUrl(chain)}
            label={displayName}
          />
          <div>
            <p className="section-kicker">Mainnet &amp; Testnet provider</p>
            <h2>{displayName} native and token transfer provider</h2>
            <p>Connect, query base-unit balances, and request approved transfers.</p>
          </div>
        </div>
        <div className="provider-actions">
          <button
            className="btn btn-primary"
            disabled={!provider || busy}
            onClick={() =>
              void run(async () => {
                if (!provider) throw new Error(`${displayName} provider is unavailable.`)
                return `Connected ${(await provider.connect()).address}`
              })
            }
          >
            Connect {displayName}
          </button>
          <button
            className="btn btn-secondary"
            disabled={!account || busy}
            onClick={() =>
              void run(async () => {
                if (!provider) throw new Error(`${displayName} provider is unavailable.`)
                await provider.disconnect()
                return `${displayName} permission revoked.`
              })
            }
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
          <Result label={`Available (${unitName})`} value={balance || 'Unavailable'} />
        </section>
        <section className="card card-compact">
          <h2>Send native {displayName}</h2>
          <form className="form-stack" onSubmit={submit}>
            <label className="label" htmlFor={`${chain}-recipient`}>
              Recipient
            </label>
            <input
              id={`${chain}-recipient`}
              className="input input-sm"
              value={recipient}
              onChange={event => setRecipient(event.target.value)}
              required
            />
            <label className="label" htmlFor={`${chain}-amount`}>
              Amount ({unitName})
            </label>
            <input
              id={`${chain}-amount`}
              className="input input-sm"
              value={amountRaw}
              onChange={event => setAmountRaw(event.target.value)}
              inputMode="numeric"
              required
            />
            <button className="btn btn-primary btn-full" disabled={!account || busy}>
              Send {displayName}
            </button>
          </form>
        </section>
        <section className="card card-compact">
          <h2>Send token</h2>
          <form className="form-stack" onSubmit={submitToken}>
            <label className="label" htmlFor={`${chain}-token-asset`}>
              CAIP-19 token asset ID
            </label>
            <input
              id={`${chain}-token-asset`}
              className="input input-sm"
              value={tokenAssetId}
              onChange={event => setTokenAssetId(event.target.value)}
              required
            />
            <button
              className="btn btn-secondary btn-full"
              type="button"
              disabled={!account || !tokenAssetId || busy}
              onClick={() =>
                void run(async () => {
                  if (!provider) throw new Error(`${displayName} provider is unavailable.`)
                  const token = await provider.getTokenBalance(tokenAssetId.trim())
                  setTokenBalance(token.availableRaw)
                  return `Token available: ${token.availableRaw}`
                })
              }
            >
              Read token balance
            </button>
            <Result label="Token available (base units)" value={tokenBalance || 'Unavailable'} />
            <label className="label" htmlFor={`${chain}-token-amount`}>
              Amount (base units)
            </label>
            <input
              id={`${chain}-token-amount`}
              className="input input-sm"
              value={tokenAmountRaw}
              onChange={event => setTokenAmountRaw(event.target.value)}
              inputMode="numeric"
              required
            />
            <p className="provider-hint">The token transfer uses the recipient entered above.</p>
            <button className="btn btn-primary btn-full" disabled={!account || busy}>
              Send token
            </button>
          </form>
        </section>
      </div>
      {result && <div className="message success provider-result">{result}</div>}
      {error && <div className="message error provider-result">{error}</div>}
    </ExampleLayout>
  )
}

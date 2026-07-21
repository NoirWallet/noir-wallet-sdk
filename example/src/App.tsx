import { useState, useEffect } from 'react'
import {
  getNoirWallet,
  publicKeyToAddress,
  verifyMessageSignature,
  type ZcashAddress,
  type ZcashAccount,
  type ZcashAccountBalance,
  type Balance,
  type MaxTransferEstimate,
  type SignMessageResult,
  type LendingMcaStatus,
  type SigningMode,
  type TransactionHistoryEntry
} from '@noir-wallet/sdk'
import './App.css'

type TabId = 'overview' | 'send' | 'signing' | 'tools' | 'batch' | 'history'

const SIGNING_MODES: { id: SigningMode; label: string }[] = [
  { id: 'current', label: 'Current' },
  { id: 'derived', label: 'Derived' },
  { id: 'legacy_index0', label: 'Legacy Index0' }
]

function SigningModeSelector({
  value,
  onChange
}: {
  value: SigningMode
  onChange: (mode: SigningMode) => void
}) {
  return (
    <div className="mode-selector">
      {SIGNING_MODES.map(mode => (
        <button
          key={mode.id}
          type="button"
          className={`btn btn-xs ${value === mode.id ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}

function CopyButton({
  text,
  id,
  copied,
  onCopy
}: {
  text: string
  id: string
  copied: string | null
  onCopy: (text: string, id: string) => void
}) {
  return (
    <button className="copy-btn" onClick={() => onCopy(text, id)} title="Copy">
      {copied === id ? <span className="copied">✓</span> : <span>📋</span>}
    </button>
  )
}

function ResultField({
  label,
  value,
  copyId,
  copied,
  onCopy
}: {
  label: string
  value: string
  copyId: string
  copied: string | null
  onCopy: (text: string, id: string) => void
}) {
  return (
    <div className="result-item">
      <label className="label">{label}</label>
      <div className="result-row">
        <code className="result-code">{value}</code>
        <CopyButton text={value} id={copyId} copied={copied} onCopy={onCopy} />
      </div>
    </div>
  )
}

function groupTxByDate(
  txs: TransactionHistoryEntry[]
): [string, TransactionHistoryEntry[]][] {
  const map = new Map<string, TransactionHistoryEntry[]>()
  for (const tx of txs) {
    const date =
      tx.timestamp > 0
        ? new Date(tx.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : 'Unknown Date'
    const arr = map.get(date)
    if (arr) arr.push(tx)
    else map.set(date, [tx])
  }
  return Array.from(map.entries())
}

function formatBalance(value: string): string {
  return parseFloat(value).toFixed(8)
}

const TX_ICONS: Record<string, string> = {
  send: '↗',
  receive: '↙',
  shield: '🛡',
  swap: '🔄',
  lending_supply: '📥',
  lending_withdraw: '📤',
  lending_claim: '🎁'
}
const TX_LABELS: Record<string, string> = {
  send: 'Sent',
  receive: 'Received',
  shield: 'Shielded',
  swap: 'Swapped',
  lending_supply: 'Supplied',
  lending_withdraw: 'Withdrawn',
  lending_claim: 'Claimed'
}
const STATUS_LABELS: Record<string, string> = {
  mined: 'Confirmed',
  pending: 'Pending',
  expired: 'Expired',
  failed: 'Failed'
}

function TxRow({
  tx,
  expanded,
  onToggle
}: {
  tx: TransactionHistoryEntry
  expanded: boolean
  onToggle: () => void
}) {
  const kind = tx.type || 'receive'
  return (
    <>
      <div className="tx-row" onClick={onToggle}>
        <div className={`tx-icon ${kind}`}>{TX_ICONS[kind] ?? '↙'}</div>
        <div className="tx-info">
          <div className="tx-info-top">
            <span className="tx-type">{TX_LABELS[kind] ?? kind} ZEC</span>
            <span className={`tx-status ${tx.status}`}>{STATUS_LABELS[tx.status] ?? tx.status}</span>
          </div>
          {tx.timestamp > 0 && (
            <div className="tx-time">
              {new Date(tx.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
        <div className="tx-amount">
          <span className={`tx-amount-value ${kind}`}>
            {kind === 'send' || kind === 'lending_supply' || kind === 'swap' ? '-' : '+'}
            {formatBalance(tx.amount)}
          </span>
          <span className="tx-amount-unit">ZEC</span>
        </div>
      </div>
      {expanded && (
        <div className="tx-detail">
          <table>
            <tbody>
              {Object.entries(tx).map(([key, val]) => {
                if (val === undefined || val === null || val === '') return null
                let display: string
                if (key === 'timestamp' && typeof val === 'number' && val > 0) {
                  display = new Date(val).toLocaleString('en-US')
                } else {
                  display = String(val)
                }
                return (
                  <tr key={key}>
                    <th>{key}</th>
                    <td>
                      {key === 'txid' ? (
                        <a
                          href={`https://blockchair.com/zcash/transaction/${display}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {display}
                        </a>
                      ) : (
                        display
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function App() {
  const [noirWallet, setNoirWallet] = useState(() => getNoirWallet())
  const isInstalled = !!noirWallet

  useEffect(() => {
    if (noirWallet) return
    const onReady = () => setNoirWallet(getNoirWallet())
    window.addEventListener('noirwallet#initialized', onReady)
    return () => window.removeEventListener('noirwallet#initialized', onReady)
  }, [noirWallet])
  const [connected, setConnected] = useState(false)
  const [addresses, setAddresses] = useState<ZcashAddress | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const [sendForm, setSendForm] = useState({ to: '', amount: '', memo: '' })
  const [sending, setSending] = useState(false)
  const [estimatingMax, setEstimatingMax] = useState(false)
  const [maxEstimate, setMaxEstimate] = useState<MaxTransferEstimate | null>(null)
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null)

  const [signingMode, setSigningMode] = useState<SigningMode>('current')
  const [signForm, setSignForm] = useState({ message: '' })
  const [signing, setSigning] = useState(false)
  const [signResult, setSignResult] = useState<{
    success: boolean
    message: string
    data?: SignMessageResult
  } | null>(null)

  const [verifyForm, setVerifyForm] = useState({
    message: '',
    signature: '',
    pubkey: '',
    address: ''
  })
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean
    message: string
    data?: ReturnType<typeof verifyMessageSignature>
  } | null>(null)

  const [publicKeyInfo, setPublicKeyInfo] = useState<{
    pubkey: string
    address: string
    signingMode?: string
    originAddress?: string
  } | null>(null)
  const [loadingPublicKey, setLoadingPublicKey] = useState(false)

  const [convertForm, setConvertForm] = useState({ pubkey: '' })
  const [convertResult, setConvertResult] = useState<{
    success: boolean
    address?: string
    error?: string
  } | null>(null)

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  const [mcaStatus, setMcaStatus] = useState<LendingMcaStatus | null>(null)
  const [loadingMca, setLoadingMca] = useState(false)
  const [mcaError, setMcaError] = useState<string | null>(null)

  const [batchAccounts, setBatchAccounts] = useState<ZcashAccount[]>([])
  const [batchBalances, setBatchBalances] = useState<ZcashAccountBalance[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)

  const [shielding, setShielding] = useState(false)
  const [shieldResult, setShieldResult] = useState<{ success: boolean; message: string } | null>(
    null
  )

  const [txHistory, setTxHistory] = useState<TransactionHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)

  useEffect(() => {
    if (!noirWallet) return

    const zcash = noirWallet.zcash

    zcash.on('accountsChanged', async (accounts: ZcashAddress | null) => {
      setTxHistory([])
      setExpandedTxId(null)
      if (!accounts) {
        setConnected(false)
        setAddresses(null)
        setBalance(null)
        setBatchAccounts([])
        setBatchBalances([])
      } else {
        setConnected(true)
        setAddresses(accounts)
        const result = await zcash.getAccounts()
        setBatchAccounts(result?.accounts ?? [])
        const bal = await zcash.getBalance()
        setBalance(bal)
        setBatchBalances(bal.accounts)
        setHistoryLoading(true)
        setHistoryError(null)
        try {
          const history = await zcash.getTransactionHistory()
          setTxHistory(history)
        } catch (err: any) {
          setHistoryError(err.message || 'Failed to load history')
        } finally {
          setHistoryLoading(false)
        }
      }
    })

    zcash.on('chainChanged', async () => {
      const bal = await zcash.getBalance()
      setBalance(bal)
      setBatchBalances(bal.accounts)
    })

    autoConnect()
  }, [noirWallet])

  const autoConnect = async () => {
    try {
      const zcash = noirWallet?.zcash
      if (!zcash) return
      const result = await zcash.getAccounts()
      if (result) {
        setConnected(true)
        setAddresses(result)
        setBatchAccounts(result.accounts)
        try {
          const bal = await zcash.getBalance()
          setBalance(bal || { transparent: '0', shielded: '0' })
          setBatchBalances(bal.accounts)
        } catch (balanceError) {
          console.warn('Balance fetch failed during autoConnect:', balanceError)
          setBalance({ transparent: '0', shielded: '0' })
        }
        setHistoryLoading(true)
        try {
          const history = await zcash.getTransactionHistory()
          setTxHistory(history)
        } catch {
          /* history is non-critical for autoConnect */
        } finally {
          setHistoryLoading(false)
        }
      } else {
        setConnected(false)
        setAddresses(null)
        setBalance(null)
      }
    } catch (err) {
      console.error('Auto connect failed:', err)
      setConnected(false)
      setAddresses(null)
      setBalance(null)
    }
  }

  const connect = async () => {
    if (!noirWallet) return
    setLoading(true)
    setError(null)
    try {
      const result = await noirWallet.zcash.connect()
      setConnected(true)
      setAddresses(result)
      setBatchAccounts(result.accounts)
      const bal = await noirWallet.zcash.getBalance()
      setBalance(bal)
      setBatchBalances(bal.accounts)
      loadTransactionHistory()
    } catch (err: any) {
      setError(err.message || 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  const disconnect = async () => {
    if (noirWallet) {
      try {
        await noirWallet.zcash.disconnect()
      } catch (error) {
        console.error('Disconnect failed:', error)
      }
    }
    setConnected(false)
    setAddresses(null)
    setBalance(null)
    setBatchAccounts([])
    setBatchBalances([])
    setTxHistory([])
    setExpandedTxId(null)
  }

  const refreshBalance = async () => {
    if (!noirWallet) return
    try {
      const bal = await noirWallet.zcash.getBalance()
      setBalance(bal)
      setBatchBalances(bal.accounts)
    } catch (err: any) {
      console.error('Refresh balance failed:', err)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noirWallet || !sendForm.to || !sendForm.amount) return
    setSending(true)
    setTxResult(null)
    try {
      const txid = await noirWallet.zcash.sendTransaction({
        to: sendForm.to,
        amount: sendForm.amount,
        memo: sendForm.memo || undefined
      })
      setTxResult({ success: true, message: `Transaction Successful! TXID: ${txid}` })
      setSendForm({ to: '', amount: '', memo: '' })
      setMaxEstimate(null)
      await refreshBalance()
    } catch (err: any) {
      setTxResult({ success: false, message: err.message || 'Transaction Failed' })
    } finally {
      setSending(false)
    }
  }

  const handleMaxTransfer = async () => {
    if (!noirWallet || !sendForm.to) return
    setEstimatingMax(true)
    setMaxEstimate(null)
    setTxResult(null)
    try {
      const estimate = await noirWallet.zcash.getMaxTransfer({
        to: sendForm.to,
        memo: sendForm.memo || undefined
      })
      setMaxEstimate(estimate)
      setSendForm(current => ({ ...current, amount: estimate.maxAmount }))
    } catch (err: any) {
      setTxResult({ success: false, message: err.message || 'Max estimation failed' })
    } finally {
      setEstimatingMax(false)
    }
  }

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noirWallet || !signForm.message) return
    setSigning(true)
    setSignResult(null)
    try {
      const result = await noirWallet.zcash.signMessage(signForm.message, { signingMode })
      setSignResult({
        success: true,
        message: `Signed (${result.signingMode})`,
        data: result
      })
    } catch (err: any) {
      setSignResult({ success: false, message: err.message || 'Signing Failed' })
    } finally {
      setSigning(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifyForm.message || !verifyForm.signature) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const result = verifyMessageSignature({
        message: verifyForm.message,
        signature: verifyForm.signature,
        pubkey: verifyForm.pubkey || undefined,
        address: verifyForm.address || undefined,
        network: 'mainnet'
      })
      if (result.error) {
        setVerifyResult({ success: false, message: result.error, data: result })
      } else {
        setVerifyResult({
          success: result.valid,
          message: result.valid ? 'Signature is valid' : 'Signature verification failed',
          data: result
        })
      }
    } catch (err: any) {
      setVerifyResult({ success: false, message: err.message || 'Verification Failed' })
    } finally {
      setVerifying(false)
    }
  }

  const fillVerifyFromSign = () => {
    if (!signResult?.data) return
    setVerifyForm({
      message: signForm.message,
      signature: signResult.data.signature,
      pubkey: signResult.data.pubkey,
      address: signResult.data.address
    })
  }

  const loadWalletPubkeyForVerify = async () => {
    if (!noirWallet) return
    try {
      const result = await noirWallet.zcash.getPublicKey({ signingMode })
      if (!result) {
        setVerifyResult({ success: false, message: 'Failed to load public key' })
        return
      }
      setVerifyForm(prev => ({
        ...prev,
        pubkey: result.pubkey,
        address: result.address
      }))
    } catch (err: any) {
      setVerifyResult({ success: false, message: err.message || 'Failed to load public key' })
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAddress(type)
      setTimeout(() => setCopiedAddress(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleGetPublicKey = async () => {
    if (!noirWallet) return
    setLoadingPublicKey(true)
    try {
      const result = await noirWallet.zcash.getPublicKey({ signingMode })
      setPublicKeyInfo(result)
    } catch (err: any) {
      console.error('Get public key failed:', err)
      setPublicKeyInfo(null)
    } finally {
      setLoadingPublicKey(false)
    }
  }

  const handleCheckMca = async () => {
    if (!noirWallet) return
    setLoadingMca(true)
    setMcaError(null)
    try {
      const result = await noirWallet.zcash.checkLendingMcaAccount()
      setMcaStatus(result)
    } catch (err: any) {
      setMcaError(err.message || 'Failed to check MCA')
      setMcaStatus(null)
    } finally {
      setLoadingMca(false)
    }
  }

  const authorizeMultiple = async () => {
    if (!noirWallet) return
    setBatchLoading(true)
    setBatchError(null)
    try {
      const result = await noirWallet.zcash.connect()
      setConnected(true)
      setAddresses(result)
      setBatchAccounts(result.accounts)
      const bal = await noirWallet.zcash.getBalance()
      setBalance(bal)
      setBatchBalances(bal.accounts)
    } catch (err: any) {
      setBatchError(err.message || 'Authorization failed')
    } finally {
      setBatchLoading(false)
    }
  }

  const refreshBatchBalances = async () => {
    if (!noirWallet || batchAccounts.length === 0) return
    setBatchError(null)
    try {
      const bal = await noirWallet.zcash.getBalance()
      setBatchBalances(bal.accounts)
    } catch (err: any) {
      setBatchError(err.message || 'Failed to load balances')
    }
  }

  const handleConvertPubkey = (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertForm.pubkey) return
    try {
      const address = publicKeyToAddress(convertForm.pubkey, 'mainnet')
      setConvertResult({ success: true, address })
    } catch (err: any) {
      setConvertResult({ success: false, error: err.message || 'Conversion failed' })
    }
  }

  const handleShield = async () => {
    if (!noirWallet) return
    setShielding(true)
    setShieldResult(null)
    try {
      const txid = await noirWallet.zcash.shieldFunds()
      setShieldResult({ success: true, message: `Shield Successful! TXID: ${txid}` })
      await refreshBalance()
    } catch (err: any) {
      setShieldResult({ success: false, message: err.message || 'Shield Failed' })
    } finally {
      setShielding(false)
    }
  }

  const loadTransactionHistory = async () => {
    if (!noirWallet) return
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const history = await noirWallet.zcash.getTransactionHistory()
      setTxHistory(history)
    } catch (err: any) {
      setHistoryError(err.message || 'Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'send', label: 'Send' },
    { id: 'signing', label: 'Sign & Verify' },
    { id: 'tools', label: 'Tools' },
    { id: 'batch', label: 'Batch' },
    { id: 'history', label: 'History' }
  ]

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <a href="/" className="logo-link">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Noir Wallet" className="logo-img" />
              <span className="logo-text">
                <span className="logo-noir">Noir </span>
                <span className="logo-wallet">Wallet</span>
              </span>
            </a>
            <span className="logo-badge">SDK Example</span>
          </div>
          <div className="header-status">
            {!isInstalled && <span className="status-badge disconnected">Not Detected</span>}
            {isInstalled && !connected && (
              <span className="status-badge disconnected">Disconnected</span>
            )}
            {connected && <span className="status-badge connected">Connected</span>}
          </div>
        </div>
      </header>

      <main className="main">
        {error && <div className="message error">{error}</div>}

        {!isInstalled && (
          <div className="card install-prompt">
            <h2>🔒 Wallet Not Detected</h2>
            <p>Install the Noir Wallet extension to use this example.</p>
          </div>
        )}

        {isInstalled && !connected && (
          <div className="card connect-section">
            <h2>🔗 Connect Wallet</h2>
            <p>Click below to connect your Noir Wallet</p>
            <button className="btn btn-primary" onClick={connect} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Connecting...
                </>
              ) : (
                'Connect Noir Wallet'
              )}
            </button>
          </div>
        )}

        {connected && (
          <>
            <nav className="tab-nav">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
              <button className="btn btn-danger btn-xs tab-disconnect" onClick={disconnect}>
                Disconnect
              </button>
            </nav>

            {activeTab === 'overview' && (
              <div className="tab-panel grid-2">
                <div className="card card-compact">
                  <h2>📦 Account</h2>
                  <div className="account-addresses">
                    <div className="address-item">
                      <label className="label">Transparent</label>
                      <div className="address-display">
                        <div className="address-text">{addresses?.transparent || ''}</div>
                        <CopyButton
                          text={addresses?.transparent || ''}
                          id="transparent"
                          copied={copiedAddress}
                          onCopy={copyToClipboard}
                        />
                      </div>
                    </div>
                    <div className="address-item">
                      <label className="label">Shielded</label>
                      <div className="address-display">
                        <div className="address-text">{addresses?.shielded || ''}</div>
                        <CopyButton
                          text={addresses?.shielded || ''}
                          id="shielded"
                          copied={copiedAddress}
                          onCopy={copyToClipboard}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card card-compact">
                  <div className="card-header">
                    <h2>💰 Balance</h2>
                    <button className="btn btn-secondary btn-xs" onClick={refreshBalance}>
                      Refresh
                    </button>
                  </div>
                  <div className="balance-grid balance-grid-compact">
                    <div className="balance-item">
                      <span className="balance-label">Transparent</span>
                      <span className="balance-value">
                        {formatBalance(balance?.transparent || '0')}
                      </span>
                    </div>
                    <div className="balance-item">
                      <span className="balance-label">Shielded</span>
                      <span className="balance-value highlight">
                        {formatBalance(balance?.shielded || '0')}
                      </span>
                    </div>
                    {balance?.available && (
                      <div className="balance-item balance-item-full">
                        <span className="balance-label">Available (cached fallback)</span>
                        <span className="balance-value highlight">
                          {formatBalance(balance.available)}
                        </span>
                      </div>
                    )}
                  </div>
                  {balance && parseFloat(balance.transparent) > 0 && (
                    <div className="shield-section">
                      <button
                        className="btn btn-primary btn-full"
                        onClick={handleShield}
                        disabled={shielding}
                      >
                        {shielding ? (
                          <>
                            <span className="spinner"></span>
                            Shielding...
                          </>
                        ) : (
                          `🛡️ Shield ${formatBalance(balance.transparent)} ZEC`
                        )}
                      </button>
                      {shieldResult && (
                        <div
                          className={`message ${shieldResult.success ? 'success' : 'error'}`}
                          style={{ marginTop: '8px' }}
                        >
                          {shieldResult.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'send' && (
              <div className="tab-panel">
                <div className="card card-compact">
                  <h2>📤 Send Transaction</h2>
                  <p className="card-hint">
                    Cached available:{' '}
                    <strong>
                      {formatBalance(balance?.available || balance?.shielded || '0')} ZEC
                    </strong>
                  </p>
                  {balance && parseFloat(balance.transparent) > 0 && (
                    <div className="message warning">
                      ⚠️ Transparent balance ({formatBalance(balance.transparent)} ZEC) cannot be
                      sent here. Shield it in the extension first.
                    </div>
                  )}
                  <form onSubmit={handleSend} className="form-stack">
                    <div className="form-group">
                      <label className="label">Recipient Address</label>
                      <input
                        type="text"
                        className="input input-sm"
                        placeholder="Enter Zcash Address"
                        value={sendForm.to}
                        onChange={e => {
                          setMaxEstimate(null)
                          setSendForm({ ...sendForm, to: e.target.value })
                        }}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Amount (ZEC)</label>
                      <input
                        type="number"
                        className="input input-sm"
                        placeholder="0.0"
                        step="0.00000001"
                        min="0"
                        value={sendForm.amount}
                        onChange={e => {
                          setMaxEstimate(null)
                          setSendForm({ ...sendForm, amount: e.target.value })
                        }}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs max-transfer-btn"
                        onClick={handleMaxTransfer}
                        disabled={estimatingMax || !sendForm.to}
                      >
                        {estimatingMax ? 'Calculating...' : 'Calculate Exact Max'}
                      </button>
                      {maxEstimate && (
                        <span className="max-transfer-fee">
                          Proposal fee: {maxEstimate.fee} ZEC
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="label">Memo (optional, max 512 bytes)</label>
                      <textarea
                        className="input input-sm"
                        placeholder="Add a private memo"
                        rows={2}
                        value={sendForm.memo}
                        onChange={e => {
                          const encoded = new TextEncoder().encode(e.target.value)
                          if (encoded.length <= 512) {
                            setMaxEstimate(null)
                            setSendForm({ ...sendForm, memo: e.target.value })
                          }
                        }}
                        style={{ resize: 'none' }}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary btn-full"
                      disabled={sending || !sendForm.to || !sendForm.amount}
                    >
                      {sending ? (
                        <>
                          <span className="spinner"></span>
                          Sending...
                        </>
                      ) : (
                        'Send Transaction'
                      )}
                    </button>
                  </form>
                  {txResult && (
                    <div className={`message ${txResult.success ? 'success' : 'error'}`}>
                      {txResult.message}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'signing' && (
              <div className="tab-panel grid-2">
                <div className="card card-compact">
                  <h2>✍️ Sign Message</h2>
                  <div className="form-group">
                    <label className="label">Signing Mode</label>
                    <SigningModeSelector value={signingMode} onChange={setSigningMode} />
                  </div>
                  <form onSubmit={handleSign} className="form-stack">
                    <div className="form-group">
                      <label className="label">Message</label>
                      <textarea
                        className="input textarea textarea-sm"
                        placeholder="Enter message..."
                        rows={3}
                        value={signForm.message}
                        onChange={e => setSignForm({ message: e.target.value })}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary btn-full"
                      disabled={signing || !signForm.message}
                    >
                      {signing ? (
                        <>
                          <span className="spinner"></span>
                          Signing...
                        </>
                      ) : (
                        `Sign (${signingMode})`
                      )}
                    </button>
                  </form>
                  {signResult && (
                    <div className={`message ${signResult.success ? 'success' : 'error'}`}>
                      <div>{signResult.message}</div>
                      {signResult.data && (
                        <div className="signature-result">
                          <ResultField
                            label="Signature"
                            value={signResult.data.signature}
                            copyId="sig"
                            copied={copiedAddress}
                            onCopy={copyToClipboard}
                          />
                          <ResultField
                            label="Public Key"
                            value={signResult.data.pubkey}
                            copyId="sig-pubkey"
                            copied={copiedAddress}
                            onCopy={copyToClipboard}
                          />
                          <ResultField
                            label="Address"
                            value={signResult.data.address}
                            copyId="sig-addr"
                            copied={copiedAddress}
                            onCopy={copyToClipboard}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="card card-compact">
                  <h2>✅ Verify Signature</h2>
                  <p className="card-hint">
                    Recovers signer from message + signature; optionally checks against pubkey or
                    address.
                  </p>
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={fillVerifyFromSign}
                      disabled={!signResult?.data}
                    >
                      Fill from Sign
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={loadWalletPubkeyForVerify}
                    >
                      Load Wallet Pubkey
                    </button>
                  </div>
                  <form onSubmit={handleVerify} className="form-stack">
                    <div className="form-group">
                      <label className="label">Message</label>
                      <textarea
                        className="input textarea textarea-sm"
                        placeholder="Original message..."
                        rows={2}
                        value={verifyForm.message}
                        onChange={e => setVerifyForm({ ...verifyForm, message: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Signature (hex)</label>
                      <input
                        type="text"
                        className="input input-sm"
                        placeholder="65-byte hex signature..."
                        value={verifyForm.signature}
                        onChange={e => setVerifyForm({ ...verifyForm, signature: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Public Key (optional)</label>
                      <input
                        type="text"
                        className="input input-sm"
                        placeholder="Expected public key..."
                        value={verifyForm.pubkey}
                        onChange={e => setVerifyForm({ ...verifyForm, pubkey: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Address (optional)</label>
                      <input
                        type="text"
                        className="input input-sm"
                        placeholder="Expected address..."
                        value={verifyForm.address}
                        onChange={e => setVerifyForm({ ...verifyForm, address: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary btn-full"
                      disabled={verifying || !verifyForm.message || !verifyForm.signature}
                    >
                      {verifying ? (
                        <>
                          <span className="spinner"></span>
                          Verifying...
                        </>
                      ) : (
                        'Verify Signature'
                      )}
                    </button>
                  </form>
                  {verifyResult && (
                    <div className={`message ${verifyResult.success ? 'success' : 'error'}`}>
                      <div>{verifyResult.message}</div>
                      {verifyResult.data && !verifyResult.data.error && (
                        <div className="signature-result">
                          <ResultField
                            label="Recovered Pubkey"
                            value={verifyResult.data.recoveredPubkey}
                            copyId="v-pubkey"
                            copied={copiedAddress}
                            onCopy={copyToClipboard}
                          />
                          <ResultField
                            label="Recovered Address"
                            value={verifyResult.data.recoveredAddress}
                            copyId="v-addr"
                            copied={copiedAddress}
                            onCopy={copyToClipboard}
                          />
                          {verifyResult.data.pubkeyMatch !== undefined && (
                            <div className="result-item">
                              <label className="label">Pubkey Match</label>
                              <code className="result-code">
                                {verifyResult.data.pubkeyMatch ? 'Yes' : 'No'}
                              </code>
                            </div>
                          )}
                          {verifyResult.data.addressMatch !== undefined && (
                            <div className="result-item">
                              <label className="label">Address Match</label>
                              <code className="result-code">
                                {verifyResult.data.addressMatch ? 'Yes' : 'No'}
                              </code>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tools' && (
              <div className="tab-panel grid-2">
                <div className="card card-compact">
                  <h2>🔑 Public Key</h2>
                  <div className="form-group">
                    <label className="label">Signing Mode</label>
                    <SigningModeSelector value={signingMode} onChange={setSigningMode} />
                  </div>
                  <button
                    className="btn btn-primary btn-full"
                    onClick={handleGetPublicKey}
                    disabled={loadingPublicKey}
                  >
                    {loadingPublicKey ? (
                      <>
                        <span className="spinner"></span>
                        Loading...
                      </>
                    ) : (
                      `Get Public Key (${signingMode})`
                    )}
                  </button>
                  {publicKeyInfo && (
                    <div className="signature-result">
                      <ResultField
                        label="Public Key"
                        value={publicKeyInfo.pubkey}
                        copyId="pubkey"
                        copied={copiedAddress}
                        onCopy={copyToClipboard}
                      />
                      <ResultField
                        label="Address"
                        value={publicKeyInfo.address}
                        copyId="pubkey-address"
                        copied={copiedAddress}
                        onCopy={copyToClipboard}
                      />
                      {publicKeyInfo.originAddress && (
                        <ResultField
                          label="Origin Address"
                          value={publicKeyInfo.originAddress}
                          copyId="origin-address"
                          copied={copiedAddress}
                          onCopy={copyToClipboard}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="card card-compact">
                  <h2>🔄 Pubkey → Address</h2>
                  <form onSubmit={handleConvertPubkey} className="form-stack">
                    <div className="form-group">
                      <label className="label">Public Key (hex)</label>
                      <input
                        type="text"
                        className="input input-sm"
                        placeholder="Enter public key..."
                        value={convertForm.pubkey}
                        onChange={e => setConvertForm({ pubkey: e.target.value })}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary btn-full"
                      disabled={!convertForm.pubkey}
                    >
                      Convert
                    </button>
                  </form>
                  {convertResult && (
                    <div className={`message ${convertResult.success ? 'success' : 'error'}`}>
                      {convertResult.success ? (
                        <ResultField
                          label="Address"
                          value={convertResult.address || ''}
                          copyId="converted-address"
                          copied={copiedAddress}
                          onCopy={copyToClipboard}
                        />
                      ) : (
                        convertResult.error
                      )}
                    </div>
                  )}
                </div>

                <div className="card card-compact grid-span-2">
                  <h2>🏦 Lending MCA</h2>
                  <button
                    className="btn btn-primary btn-full"
                    onClick={handleCheckMca}
                    disabled={loadingMca}
                  >
                    {loadingMca ? (
                      <>
                        <span className="spinner"></span>
                        Checking...
                      </>
                    ) : (
                      'Check Lending MCA'
                    )}
                  </button>
                  {mcaError && <div className="message error">{mcaError}</div>}
                  {mcaStatus && (
                    <div className="signature-result">
                      <ResultField
                        label="MCA ID"
                        value={mcaStatus.mcaId || 'None'}
                        copyId="mca-id"
                        copied={copiedAddress}
                        onCopy={copyToClipboard}
                      />
                      <ResultField
                        label="Public Key"
                        value={mcaStatus.publicKey || 'None'}
                        copyId="mca-pk"
                        copied={copiedAddress}
                        onCopy={copyToClipboard}
                      />
                      <div className="result-item">
                        <label className="label">Signing Mode</label>
                        <code className="result-code">{mcaStatus.signingMode}</code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="tab-panel">
                <div className="card card-compact">
                  <div className="card-header">
                    <h2>Transaction History</h2>
                    <button
                      className="btn btn-primary btn-xs"
                      onClick={loadTransactionHistory}
                      disabled={historyLoading}
                    >
                      {historyLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                  {historyLoading && txHistory.length === 0 && (
                    <div className="message">Loading transactions...</div>
                  )}
                  {historyError && <div className="message error">{historyError}</div>}
                  {txHistory.length === 0 && !historyError && !historyLoading && (
                    <div className="message">No transactions found.</div>
                  )}
                  {txHistory.length > 0 && (
                    <div className="tx-list">
                      {groupTxByDate(txHistory).map(([date, txs]) => (
                        <div key={date}>
                          <div className="tx-date-group">{date}</div>
                          {txs.map((tx, i) => (
                            <TxRow
                              key={`${tx.txid}-${i}`}
                              tx={tx}
                              expanded={expandedTxId === tx.txid}
                              onToggle={() =>
                                setExpandedTxId(prev => (prev === tx.txid ? null : tx.txid))
                              }
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'batch' && (
              <div className="tab-panel">
                <div className="card card-compact">
                  <div className="card-header">
                    <h2>👛 Multi-Wallet Access</h2>
                    <div className="btn-row">
                      <button
                        className="btn btn-primary btn-xs"
                        onClick={authorizeMultiple}
                        disabled={batchLoading}
                      >
                        {batchLoading
                          ? 'Connecting...'
                          : batchAccounts.length
                            ? 'Re-authorize'
                            : 'Connect Multiple'}
                      </button>
                      {batchAccounts.length > 0 && (
                        <button className="btn btn-secondary btn-xs" onClick={refreshBatchBalances}>
                          Refresh Balances
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="card-hint">
                    Authorize several independent wallets in one approval. The dApp can then read
                    each wallet's transparent &amp; shielded addresses and balances.
                  </p>
                  {batchError && <div className="message error">{batchError}</div>}
                  {batchAccounts.length === 0 && !batchError && (
                    <div className="message">
                      No wallets authorized yet. Click "Connect Multiple" and pick wallets in the
                      popup.
                    </div>
                  )}
                  {batchAccounts.length > 0 && (
                    <div className="batch-list">
                      {batchAccounts.map(acc => {
                        const bal = batchBalances.find(b => b.id === acc.id)
                        return (
                          <div key={acc.id} className="batch-item">
                            <div className="batch-item-header">
                              <span className="batch-label">{acc.label}</span>
                              {bal && (
                                <span
                                  className={`status-badge ${bal.synced ? 'connected' : 'disconnected'}`}
                                >
                                  {bal.synced ? 'synced' : 'cached'}
                                </span>
                              )}
                            </div>
                            <ResultField
                              label="Shielded Address"
                              value={acc.addresses.shielded}
                              copyId={`batch-zs-${acc.id}`}
                              copied={copiedAddress}
                              onCopy={copyToClipboard}
                            />
                            <ResultField
                              label="Transparent Address"
                              value={acc.addresses.transparent}
                              copyId={`batch-t-${acc.id}`}
                              copied={copiedAddress}
                              onCopy={copyToClipboard}
                            />
                            {bal && (
                              <div className="balance-grid balance-grid-compact">
                                <div className="balance-item">
                                  <span className="balance-label">Shielded</span>
                                  <span className="balance-value highlight">
                                    {formatBalance(bal.balance.shielded)}
                                  </span>
                                </div>
                                <div className="balance-item">
                                  <span className="balance-label">Transparent</span>
                                  <span className="balance-value">
                                    {formatBalance(bal.balance.transparent)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>Noir Wallet SDK Example</p>
      </footer>
    </div>
  )
}

export default App

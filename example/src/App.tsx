import { useState, useEffect, useMemo } from 'react'
import {
  getNoirWallet,
  publicKeyToAddress,
  type ZcashAddress,
  type Balance,
  type SignMessageResult
} from '@noir-wallet/sdk'
import './App.css'

interface VersionInfo {
  version: string
  filename: string
  downloadUrl: string
  buildTime: string
}

function App() {
  const noirWallet = useMemo(() => getNoirWallet(), [])
  const isInstalled = !!noirWallet
  const [connected, setConnected] = useState(false)
  const [addresses, setAddresses] = useState<ZcashAddress | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)

  const [sendForm, setSendForm] = useState({ to: '', amount: '' })
  const [sending, setSending] = useState(false)
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null)

  const [signForm, setSignForm] = useState({ message: '' })
  const [signing, setSigning] = useState(false)
  const [signResult, setSignResult] = useState<{
    success: boolean
    message: string
    data?: SignMessageResult
  } | null>(null)

  const [publicKeyInfo, setPublicKeyInfo] = useState<{
    pubkey: string
    address: string
  } | null>(null)
  const [loadingPublicKey, setLoadingPublicKey] = useState(false)

  const [convertForm, setConvertForm] = useState({ pubkey: '' })
  const [convertResult, setConvertResult] = useState<{
    success: boolean
    address?: string
    error?: string
  } | null>(null)

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  useEffect(() => {
    if (!noirWallet) return

    const zcash = noirWallet.zcash

    zcash.on('accountsChanged', async (accounts: ZcashAddress | null) => {
      if (!accounts) {
        setConnected(false)
        setAddresses(null)
        setBalance(null)
      } else {
        setConnected(true)
        setAddresses(accounts)
        const balance = await zcash.getBalance()
        setBalance(balance)
      }
    })

    zcash.on('chainChanged', async () => {
      const balance = await zcash.getBalance()
      setBalance(balance)
    })

    autoConnect()
  }, [noirWallet])

  useEffect(() => {
    fetch('/extension/version.json')
      .then(res => res.json())
      .then(data => setVersionInfo(data))
      .catch(() => console.warn('Version info not available'))
  }, [])

  const autoConnect = async () => {
    try {
      const zcash = noirWallet?.zcash
      if (!zcash) return
      const accounts = await zcash.getAccounts()
      if (accounts) {
        setConnected(true)
        setAddresses(accounts)

        // Add error handling for balance fetch
        try {
          const balance = await zcash.getBalance()
          setBalance(balance || { transparent: '0', shielded: '0' })
        } catch (balanceError) {
          console.warn('Balance fetch failed during autoConnect:', balanceError)
          // Set zero balance instead of failing
          setBalance({ transparent: '0', shielded: '0' })
        }
      } else {
        // Explicitly set disconnected state
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
      const accounts = await noirWallet.zcash.connect()
      setConnected(true)
      setAddresses(accounts)

      const balance = await noirWallet.zcash.getBalance()
      setBalance(balance)
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
  }

  const refreshBalance = async () => {
    if (!noirWallet) return
    try {
      const bal = await noirWallet.zcash.getBalance()
      setBalance(bal)
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
        amount: sendForm.amount
      })
      setTxResult({
        success: true,
        message: `Transaction Successful! TXID: ${txid}`
      })
      setSendForm({ to: '', amount: '' })
      await refreshBalance()
    } catch (err: any) {
      setTxResult({
        success: false,
        message: err.message || 'Transaction Failed'
      })
    } finally {
      setSending(false)
    }
  }

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noirWallet || !signForm.message) return

    setSigning(true)
    setSignResult(null)

    try {
      const result = await noirWallet.zcash.signMessage(signForm.message)
      setSignResult({
        success: true,
        message: 'Message signed successfully!',
        data: result
      })
    } catch (err: any) {
      setSignResult({
        success: false,
        message: err.message || 'Signing Failed'
      })
    } finally {
      setSigning(false)
    }
  }

  const formatBalance = (value: string) => {
    const num = parseFloat(value)
    return num.toFixed(8)
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAddress(type)
      setTimeout(() => {
        setCopiedAddress(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleGetPublicKey = async () => {
    if (!noirWallet) return

    setLoadingPublicKey(true)
    try {
      const result = await noirWallet.zcash.getPublicKey()
      setPublicKeyInfo(result)
    } catch (err: any) {
      console.error('Get public key failed:', err)
      setPublicKeyInfo(null)
    } finally {
      setLoadingPublicKey(false)
    }
  }

  const handleConvertPubkey = (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertForm.pubkey) return

    try {
      const address = publicKeyToAddress(convertForm.pubkey, 'mainnet')
      setConvertResult({
        success: true,
        address
      })
    } catch (err: any) {
      setConvertResult({
        success: false,
        error: err.message || 'Conversion failed'
      })
    }
  }

  const handleDownloadExtension = () => {
    if (versionInfo) {
      // Use R2 CDN URL instead of local path
      window.open(versionInfo.downloadUrl, '_blank', 'noopener,noreferrer')
      setShowInstallGuide(true)
    }
  }

  const handleOpenStore = () => {
    window.open(
      'https://chromewebstore.google.com/detail/noir-wallet/coming-soon',
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <h1>Noir Wallet DApp Example</h1>
          </div>
          <div className="header-status">
            {!isInstalled && <span className="status-badge disconnected">Wallet Not Detected</span>}
            {isInstalled && !connected && (
              <span className="status-badge disconnected">Not Connected</span>
            )}
            {connected && <span className="status-badge connected">Connected</span>}
          </div>
        </div>
      </header>

      <main className="main">
        {error && <div className="message error">{error}</div>}

        {!isInstalled && (
          <div className="card install-prompt">
            <h2>🔒 Install Noir Wallet</h2>
            <p>Choose an installation method to get started:</p>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}
            >
              <div
                style={{
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>📦 Install Latest Build</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
                  Download the latest build for testing
                  {versionInfo && ` (v${versionInfo.version})`}
                </p>
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadExtension}
                  disabled={!versionInfo}
                >
                  {versionInfo ? 'Download Extension' : 'Loading...'}
                </button>
              </div>

              <div
                style={{
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>🏪 Chrome Web Store</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
                  Coming Soon - Official store release
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenStore}
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                >
                  View Store Page
                </button>
              </div>
            </div>

            {showInstallGuide && (
              <details style={{ marginTop: '20px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                  📖 Installation Guide
                </summary>
                <ol
                  style={{
                    marginTop: '12px',
                    paddingLeft: '20px',
                    lineHeight: '1.8',
                    fontSize: '14px'
                  }}
                >
                  <li>Unzip the downloaded file to a folder</li>
                  <li>
                    Open Chrome and navigate to{' '}
                    <code
                      style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}
                    >
                      chrome://extensions
                    </code>
                  </li>
                  <li>Enable "Developer mode" in the top right corner</li>
                  <li>Click "Load unpacked" button</li>
                  <li>Select the unzipped extension folder</li>
                  <li>Noir Wallet should now appear in your extensions</li>
                  <li>Refresh this page to connect</li>
                </ol>
              </details>
            )}
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
          <div className="connected-content">
            <div className="card account-card">
              <div className="card-header">
                <h2>📦 Account</h2>
                <button className="btn btn-danger btn-sm" onClick={disconnect}>
                  Disconnect
                </button>
              </div>

              <div className="account-addresses">
                <div className="address-item">
                  <label className="label">Transparent Address</label>
                  <div className="address-display">
                    <div className="address-text">{addresses?.transparent || ''}</div>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(addresses?.transparent || '', 'transparent')}
                      title="Copy address"
                    >
                      {copiedAddress === 'transparent' ? (
                        <span className="copied">✓ Copied</span>
                      ) : (
                        <span>📋</span>
                      )}
                    </button>
                  </div>
                </div>
                <div className="address-item">
                  <label className="label">Shielded Address</label>
                  <div className="address-display">
                    <div className="address-text">{addresses?.shielded || ''}</div>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(addresses?.shielded || '', 'shielded')}
                      title="Copy address"
                    >
                      {copiedAddress === 'shielded' ? (
                        <span className="copied">✓ Copied</span>
                      ) : (
                        <span>📋</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card balance-card">
              <div className="card-header">
                <h2>💰 Balance</h2>
                <button className="btn btn-secondary btn-sm" onClick={refreshBalance}>
                  Refresh
                </button>
              </div>

              <div className="balance-grid">
                <div className="balance-item">
                  <span className="balance-label">Transparent</span>
                  <span className="balance-value">
                    {formatBalance(balance?.transparent || '0')} ZEC
                  </span>
                </div>
                <div className="balance-item">
                  <span className="balance-label">Shielded</span>
                  <span className="balance-value highlight">
                    {formatBalance(balance?.shielded || '0')} ZEC
                  </span>
                </div>
                {balance?.available && (
                  <div className="balance-item">
                    <span className="balance-label">Available</span>
                    <span className="balance-value highlight">
                      {formatBalance(balance.available)} ZEC
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="card send-card">
              <h2>📤 Send Transaction</h2>
              <p className="card-hint" style={{ marginBottom: '8px' }}>
                Available:{' '}
                <strong>
                  {balance ? formatBalance(balance.available || balance.shielded) : '0.00000000'}{' '}
                  ZEC
                </strong>
              </p>

              {balance && parseFloat(balance.transparent) > 0 && (
                <div className="message warning" style={{ marginBottom: '12px' }}>
                  ⚠️ You have {formatBalance(balance.transparent)} ZEC in transparent balance which
                  cannot be used for sending. Please shield it in the wallet extension first.
                </div>
              )}

              <form onSubmit={handleSend} className="send-form">
                <div className="form-group">
                  <label className="label">Recipient Address</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter Zcash Address"
                    value={sendForm.to}
                    onChange={e => setSendForm({ ...sendForm, to: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">Amount (ZEC)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0.0"
                    step="0.00000001"
                    min="0"
                    value={sendForm.amount}
                    onChange={e => setSendForm({ ...sendForm, amount: e.target.value })}
                    required
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

            <div className="card sign-card">
              <h2>🔑 Public Key</h2>
              <p className="card-hint">Get the public key of your transparent address</p>

              <button
                className="btn btn-primary btn-full"
                onClick={handleGetPublicKey}
                disabled={loadingPublicKey}
                style={{ marginBottom: '16px' }}
              >
                {loadingPublicKey ? (
                  <>
                    <span className="spinner"></span>
                    Loading...
                  </>
                ) : (
                  'Get Public Key'
                )}
              </button>

              {publicKeyInfo && (
                <div className="signature-result">
                  <div className="result-item">
                    <label className="label">Public Key:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code className="result-code" style={{ flex: 1 }}>
                        {publicKeyInfo.pubkey}
                      </code>
                      <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(publicKeyInfo.pubkey, 'pubkey')}
                        title="Copy public key"
                      >
                        {copiedAddress === 'pubkey' ? (
                          <span className="copied">✓</span>
                        ) : (
                          <span>📋</span>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="result-item">
                    <label className="label">Address:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code className="result-code" style={{ flex: 1 }}>
                        {publicKeyInfo.address}
                      </code>
                      <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(publicKeyInfo.address, 'pubkey-address')}
                        title="Copy address"
                      >
                        {copiedAddress === 'pubkey-address' ? (
                          <span className="copied">✓</span>
                        ) : (
                          <span>📋</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card sign-card">
              <h2>🔄 Convert Public Key to Address</h2>
              <p className="card-hint">Convert any public key to transparent address (mainnet)</p>

              <form onSubmit={handleConvertPubkey} className="sign-form">
                <div className="form-group">
                  <label className="label">Public Key (hex)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter public key in hex format..."
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
                  Convert to Address
                </button>
              </form>

              {convertResult && (
                <div className={`message ${convertResult.success ? 'success' : 'error'}`}>
                  {convertResult.success ? (
                    <div className="signature-result">
                      <div className="result-item">
                        <label className="label">Converted Address:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <code className="result-code" style={{ flex: 1 }}>
                            {convertResult.address}
                          </code>
                          <button
                            className="copy-btn"
                            onClick={() =>
                              copyToClipboard(convertResult.address || '', 'converted-address')
                            }
                            title="Copy address"
                          >
                            {copiedAddress === 'converted-address' ? (
                              <span className="copied">✓</span>
                            ) : (
                              <span>📋</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>{convertResult.error}</div>
                  )}
                </div>
              )}
            </div>

            <div className="card sign-card">
              <h2>✍️ Sign Message</h2>
              <p className="card-hint">Note: Message signing uses the transparent address</p>

              <form onSubmit={handleSign} className="sign-form">
                <div className="form-group">
                  <label className="label">Message to Sign</label>
                  <textarea
                    className="input textarea"
                    placeholder="Enter your message here..."
                    rows={4}
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
                    'Sign Message'
                  )}
                </button>
              </form>

              {signResult && (
                <div className={`message ${signResult.success ? 'success' : 'error'}`}>
                  <div>{signResult.message}</div>
                  {signResult.data && (
                    <div className="signature-result">
                      <div className="result-item">
                        <label className="label">Signature:</label>
                        <code className="result-code">{signResult.data.signature}</code>
                      </div>
                      <div className="result-item">
                        <label className="label">Public Key:</label>
                        <code className="result-code">{signResult.data.pubkey}</code>
                      </div>
                      <div className="result-item">
                        <label className="label">Address:</label>
                        <code className="result-code">{signResult.data.address}</code>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Noir Wallet DApp Integration Example</p>
        <p className="footer-hint">A sample DApp demonstrating Noir Wallet integration</p>
      </footer>
    </div>
  )
}

export default App

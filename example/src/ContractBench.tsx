import { useState, type FormEvent } from 'react'
import type { EvmProvider } from '@noir-wallet/sdk'
import deployments from '../contracts/deployments.json'

// Function selectors are fixed by the committed contract sources
// (contracts/src/*.sol); regenerate with viem toFunctionSelector if the ABI
// ever changes.
const SELECTORS = {
  setValue: '0x55241077', // setValue(uint256)
  deposit: '0xd0e30db0', // deposit()
  withdraw: '0x3ccfd60b', // withdraw()
  alwaysRevert: '0x9fb37853', // alwaysRevert()
  storedValue: '0x8d48538d', // storedValue(address)
  mint: '0x40c10f19', // mint(address,uint256)
  approve: '0x095ea7b3', // approve(address,uint256)
  transferFrom: '0x23b872dd', // transferFrom(address,address,uint256)
  balanceOf: '0x70a08231' // balanceOf(address)
} as const

interface DeployedContract {
  address: string
}

interface DeployedNetwork {
  key: string
  name: string
  explorerUrl: string
  NoirTestBench?: DeployedContract
  NoirTestToken?: DeployedContract
}

const DEPLOYED_NETWORKS: Record<string, DeployedNetwork> = deployments.networks

function encodeUint256(value: bigint): string {
  if (value < 0n) throw new Error('Value must not be negative.')
  return value.toString(16).padStart(64, '0')
}

function encodeAddress(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) throw new Error('Enter a 20-byte hex address.')
  return normalized.slice(2).padStart(64, '0')
}

function parseTokenAmount(value: string): bigint {
  const normalized = value.trim()
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(normalized)) {
    throw new Error('Amount must be a non-negative decimal with at most 18 decimal places.')
  }
  const [whole, fraction = ''] = normalized.split('.')
  const raw = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'))
  if (raw <= 0n) throw new Error('Amount must be greater than zero.')
  return raw
}

function formatTokenAmount(raw: bigint): string {
  const whole = raw / 10n ** 18n
  const fraction = (raw % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

interface ContractBenchProps {
  provider: EvmProvider | null
  account: string
  chainId: string
  busy: boolean
  run: (operation: () => Promise<string | void>) => Promise<void>
}

export function ContractBench({ provider, account, chainId, busy, run }: ContractBenchProps) {
  const [setValueInput, setSetValueInput] = useState('42')
  const [depositInput, setDepositInput] = useState('0.0001')
  const [mintInput, setMintInput] = useState('100')

  const deployed = /^0x[0-9a-f]+$/i.test(chainId)
    ? DEPLOYED_NETWORKS[String(Number(BigInt(chainId)))]
    : undefined
  const bench = deployed?.NoirTestBench?.address ?? ''
  const token = deployed?.NoirTestToken?.address ?? ''

  const requireReady = (contract: string): { current: EvmProvider; from: string } => {
    if (!provider || !account) throw new Error('Connect an EVM account first.')
    if (!contract) throw new Error('Test contracts are not deployed on this network.')
    return { current: provider, from: account }
  }

  const sendContractCall = (contract: string, data: string, value?: bigint) =>
    run(async () => {
      const { current, from } = requireReady(contract)
      const transaction: Record<string, string> = { from, to: contract, data }
      if (value !== undefined) transaction.value = `0x${value.toString(16)}`
      const hash = await current.request<string>({
        method: 'eth_sendTransaction',
        params: [transaction]
      })
      return `Transaction: ${hash}`
    })

  const submitSetValue = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      const { current, from } = requireReady(bench)
      const value = BigInt(setValueInput.trim())
      const hash = await current.request<string>({
        method: 'eth_sendTransaction',
        params: [{ from, to: bench, data: `${SELECTORS.setValue}${encodeUint256(value)}` }]
      })
      return `setValue(${value}) transaction: ${hash}`
    })
  }

  const submitDeposit = (event: FormEvent) => {
    event.preventDefault()
    void sendContractCall(bench, SELECTORS.deposit, parseTokenAmount(depositInput))
  }

  const readStoredValue = () =>
    run(async () => {
      const { current, from } = requireReady(bench)
      const result = await current.request<string>({
        method: 'eth_call',
        params: [{ to: bench, data: `${SELECTORS.storedValue}${encodeAddress(from)}` }, 'latest']
      })
      return `storedValue(${from}) = ${BigInt(result)}`
    })

  const submitMint = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      const { current, from } = requireReady(token)
      const amount = parseTokenAmount(mintInput)
      const data = `${SELECTORS.mint}${encodeAddress(from)}${encodeUint256(amount)}`
      const hash = await current.request<string>({
        method: 'eth_sendTransaction',
        params: [{ from, to: token, data }]
      })
      return `mint(${formatTokenAmount(amount)} NTT) transaction: ${hash}`
    })
  }

  const submitApprove = () =>
    run(async () => {
      const { current, from } = requireReady(token)
      const amount = parseTokenAmount(mintInput)
      const data = `${SELECTORS.approve}${encodeAddress(from)}${encodeUint256(amount)}`
      const hash = await current.request<string>({
        method: 'eth_sendTransaction',
        params: [{ from, to: token, data }]
      })
      return `approve(self, ${formatTokenAmount(amount)} NTT) transaction: ${hash}`
    })

  const submitTransferFrom = () =>
    run(async () => {
      const { current, from } = requireReady(token)
      const amount = parseTokenAmount(mintInput)
      const data = `${SELECTORS.transferFrom}${encodeAddress(from)}${encodeAddress(from)}${encodeUint256(amount)}`
      const hash = await current.request<string>({
        method: 'eth_sendTransaction',
        params: [{ from, to: token, data }]
      })
      return `transferFrom(self, self, ${formatTokenAmount(amount)} NTT) transaction: ${hash}`
    })

  const readTokenBalance = () =>
    run(async () => {
      const { current, from } = requireReady(token)
      const result = await current.request<string>({
        method: 'eth_call',
        params: [{ to: token, data: `${SELECTORS.balanceOf}${encodeAddress(from)}` }, 'latest']
      })
      return `balanceOf(${from}) = ${formatTokenAmount(BigInt(result))} NTT`
    })

  return (
    <section className="card card-compact grid-span-2">
      <h2>Contract test bench</h2>
      {deployed ? (
        <>
          <div className="result-item">
            <span className="label">NoirTestBench</span>
            <code className="result-code">{bench || 'Not deployed'}</code>
          </div>
          <div className="result-item">
            <span className="label">NoirTestToken</span>
            <code className="result-code">{token || 'Not deployed'}</code>
          </div>
        </>
      ) : (
        <div className="message warning">
          Test contracts are not deployed on the current network. Switch to a built-in testnet
          listed in contracts/deployments.json.
        </div>
      )}
      <form className="form-stack" onSubmit={submitSetValue}>
        <label className="label" htmlFor="bench-set-value">
          setValue(uint256) — state-changing call
        </label>
        <div className="btn-row">
          <input
            id="bench-set-value"
            className="input input-sm"
            value={setValueInput}
            onChange={event => setSetValueInput(event.target.value)}
            inputMode="numeric"
            required
          />
          <button className="btn btn-primary" disabled={!account || !bench || busy}>
            Set value
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void readStoredValue()}
            disabled={!account || !bench || busy}
          >
            Read back
          </button>
        </div>
      </form>
      <form className="form-stack" onSubmit={submitDeposit}>
        <label className="label" htmlFor="bench-deposit">
          deposit() — payable call (native units)
        </label>
        <div className="btn-row">
          <input
            id="bench-deposit"
            className="input input-sm"
            value={depositInput}
            onChange={event => setDepositInput(event.target.value)}
            inputMode="decimal"
            required
          />
          <button className="btn btn-primary" disabled={!account || !bench || busy}>
            Deposit
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void sendContractCall(bench, SELECTORS.withdraw)}
            disabled={!account || !bench || busy}
          >
            Withdraw
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void sendContractCall(bench, SELECTORS.alwaysRevert)}
            disabled={!account || !bench || busy}
          >
            Always revert
          </button>
        </div>
      </form>
      <form className="form-stack" onSubmit={submitMint}>
        <label className="label" htmlFor="token-amount">
          NoirTestToken (NTT) — mint / approve / transferFrom
        </label>
        <div className="btn-row">
          <input
            id="token-amount"
            className="input input-sm"
            value={mintInput}
            onChange={event => setMintInput(event.target.value)}
            inputMode="decimal"
            required
          />
          <button className="btn btn-primary" disabled={!account || !token || busy}>
            Mint
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void submitApprove()}
            disabled={!account || !token || busy}
          >
            Approve
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void submitTransferFrom()}
            disabled={!account || !token || busy}
          >
            TransferFrom
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void readTokenBalance()}
            disabled={!account || !token || busy}
          >
            Balance
          </button>
        </div>
      </form>
      <p className="section-note">
        The current wallet release intentionally rejects arbitrary contract calldata
        (fail-closed), so the write buttons above exercise the approval boundary and surface the
        wallet error until contract-call review ships. Read calls (eth_call) do not require
        approval.
      </p>
    </section>
  )
}

import { useState } from 'react'
import { stakedMusd, vaultMusd, type Portfolio } from '../lib/engine'
import { fmt, trimAmount } from '../lib/format'

type Mode = 'deposit' | 'withdraw' | 'stake' | 'unstake'

const MODES: { id: Mode; label: string }[] = [
  { id: 'deposit', label: 'Deposit' },
  { id: 'withdraw', label: 'Withdraw' },
  { id: 'stake', label: 'Stake' },
  { id: 'unstake', label: 'Unstake' },
]

export function ActionsCard({
  book,
  error,
  onDeposit,
  onWithdraw,
  onStake,
  onUnstake,
  onReset,
}: {
  book: Portfolio
  error: string | null
  onDeposit: (musd: number) => void
  onWithdraw: (musd: number) => void
  onStake: (shares: number) => void
  onUnstake: (shares: number) => void
  onReset: () => void
}) {
  const [mode, setMode] = useState<Mode>('deposit')
  const [amount, setAmount] = useState('250')

  const parsed = Number(amount)
  const vaultValue = vaultMusd(book)
  const gaugeValue = stakedMusd(book)

  const meta: Record<Mode, { unit: string; max: number; hint: string; cta: string }> = {
    deposit: {
      unit: 'MUSD',
      max: book.idleMusd,
      hint: 'Mints mock sMUSD at the current exchange rate.',
      cta: 'Deposit to vault',
    },
    withdraw: {
      unit: 'MUSD',
      max: vaultValue,
      hint: 'Burns vault sMUSD and returns MUSD to idle.',
      cta: 'Withdraw to idle',
    },
    stake: {
      unit: 'sMUSD',
      max: book.vaultShares,
      hint: `Moves vault shares into the gauge. ${fmt(parsed > 0 ? parsed : 0, 4)} sMUSD ≈ ${fmt((parsed > 0 ? parsed : 0) * book.exchangeRate)} MUSD. Fee accrual on them stops.`,
      cta: 'Stake to gauge',
    },
    unstake: {
      unit: 'sMUSD',
      max: book.stakedShares,
      hint: `Returns frozen value at today's rate. ${fmt(parsed > 0 ? parsed : 0, 4)} sMUSD is frozen at ≈ ${fmt((parsed > 0 ? parsed : 0) * book.stakedEntryRate)} MUSD.`,
      cta: 'Unstake to vault',
    },
  }
  const current = meta[mode]
  const invalid = !(parsed > 0) || parsed > current.max + 1e-6

  function submit() {
    if (mode === 'deposit') onDeposit(parsed)
    else if (mode === 'withdraw') onWithdraw(parsed)
    else if (mode === 'stake') onStake(parsed)
    else onUnstake(parsed)
  }

  return (
    <section className="card" aria-labelledby="actions-title">
      <div className="card-head">
        <h2 id="actions-title">Book actions</h2>
        <span className="eyebrow">Local simulation</span>
      </div>
      <div className="seg" role="radiogroup" aria-label="Book action">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={mode === item.id}
            className={mode === item.id ? 'on' : ''}
            onClick={() => setMode(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="amount-row">
        <label className="field grow">
          <span>Amount · {current.unit}</span>
          <input
            inputMode="decimal"
            type="number"
            min={0}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
          />
        </label>
        <button
          type="button"
          className="btn"
          onClick={() => setAmount(trimAmount(current.max))}
        >
          Max
        </button>
        <button type="button" className="btn primary" disabled={invalid} onClick={submit}>
          {current.cta}
        </button>
      </div>
      <p className="hint-line">
        Available {fmt(current.max, mode === 'deposit' || mode === 'withdraw' ? 2 : 4)}{' '}
        {current.unit}. {current.hint} Each action is written to the epoch log. No vault
        or gauge transaction is sent.
      </p>
      <p className="fine">
        Gauge book value {fmt(gaugeValue)} MUSD · vault book value {fmt(vaultValue)} MUSD.
      </p>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn ghost reset" onClick={onReset}>
        Reset simulated book
      </button>
    </section>
  )
}

import { useRef } from 'react'
import { ACCRUAL_MULTIPLIER, type Portfolio } from '../lib/engine'
import { fmt, fmtApr } from '../lib/format'

export function RatesCard({
  book,
  onApr,
}: {
  book: Portfolio
  onApr: (patch: { holdAprPct?: number; gaugeAprPct?: number }) => void
}) {
  const opened = useRef(book.exchangeRate)
  const spread = book.gaugeAprPct - book.holdAprPct
  const delta = book.exchangeRate - opened.current
  const scale = Math.max(book.holdAprPct, book.gaugeAprPct, 1)

  return (
    <section className="card" aria-labelledby="rates-title">
      <div className="card-head">
        <h2 id="rates-title">Rates</h2>
        <span className="eyebrow">Mock APRs</span>
      </div>
      <div className="rates">
        <article className="rate-box hold">
          <div className="label">Hold path · protocol fee</div>
          <div className="apr">{fmtApr(book.holdAprPct)}</div>
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${(book.holdAprPct / scale) * 100}%` }} />
          </div>
          <label className="field">
            <span>Scenario hold APR %</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={book.holdAprPct}
              onChange={(e) => onApr({ holdAprPct: Number(e.target.value) })}
            />
          </label>
        </article>
        <article className="rate-box gauge">
          <div className="label">Gauge path · MEZO emissions</div>
          <div className="apr">{fmtApr(book.gaugeAprPct)}</div>
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${(book.gaugeAprPct / scale) * 100}%` }} />
          </div>
          <label className="field">
            <span>Scenario gauge APR %</span>
            <input
              type="number"
              min={0}
              max={200}
              step={0.1}
              value={book.gaugeAprPct}
              onChange={(e) => onApr({ gaugeAprPct: Number(e.target.value) })}
            />
          </label>
        </article>
      </div>
      <div className="rate-meta">
        <div>
          <div className="label">Spread · gauge minus hold</div>
          <div className={spread >= 0.25 ? 'spread up' : 'spread'}>
            {spread >= 0 ? '+' : ''}
            {fmt(spread, 2)} pp
          </div>
        </div>
        <div>
          <div className="label">sMUSD → MUSD</div>
          <div className="spread mono">{fmt(book.exchangeRate, 6)}</div>
          <div className="fine">
            {delta >= 0 ? '+' : ''}
            {fmt(delta, 6)} since this page opened
          </div>
        </div>
      </div>
      <p className="hint-line">
        Unstaked sMUSD earns the fee through the exchange rate. Staked sMUSD redirects
        that fee to veBTC voters and earns MEZO emissions instead. The rate creeps on an{' '}
        {ACCRUAL_MULTIPLIER.toLocaleString('en-US')}× demo clock. Emissions are quoted
        here and are not paid into the book.
      </p>
    </section>
  )
}

import {
  INDIFFERENCE_PP,
  recommend,
  savingsMusd,
  stakedMusd,
  type Portfolio,
} from '../lib/engine'
import { fmt } from '../lib/format'

export function PolicyCard({
  book,
  onPatch,
  onRun,
  onApply,
}: {
  book: Portfolio
  onPatch: (
    patch: Partial<Pick<Portfolio, 'reserveMusd' | 'maxStakePct' | 'kill'>>,
  ) => void
  onRun: () => void
  onApply: () => void
}) {
  const preview = recommend(book)
  const last = book.lastDecision
  const drifted =
    !!last &&
    (last.recommendation !== preview.recommendation || last.stakePct !== preview.stakePct)
  const savings = savingsMusd(book)
  const gaugeNowPct = savings > 0 ? (stakedMusd(book) / savings) * 100 : 0
  const idleGap = book.idleMusd - book.reserveMusd
  const lastLabel = last
    ? `${last.recommendation}${last.recommendation === 'MIXED' ? ` ${fmt(last.stakePct, 0)}%` : ''}`
    : null

  return (
    <section className={`card ${book.kill ? 'killed' : ''}`} aria-labelledby="policy-title">
      <div className="card-head">
        <h2 id="policy-title">Policy</h2>
        <span className="eyebrow">Operator limits · simulated</span>
      </div>
      <p className="hint-line policy-lede">
        Surplus idle MUSD is deployed into vault sMUSD. The epoch choice is then{' '}
        <strong>hold</strong> that sMUSD for the fee, or <strong>stake</strong> up to
        the cap in the gauge for MEZO.
      </p>
      <div className="policy-grid">
        <label className="field">
          <span>Spend reserve · MUSD</span>
          <input
            type="number"
            min={0}
            step={100}
            value={book.reserveMusd}
            onChange={(e) => onPatch({ reserveMusd: Number(e.target.value) })}
          />
          <span className="fine">Idle floor the desk keeps. Surplus goes to the vault on apply.</span>
        </label>
        <label className="field">
          <span>Max stake · %</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={book.maxStakePct}
            onChange={(e) => onPatch({ maxStakePct: Number(e.target.value) })}
          />
          <span className="fine">Cap on savings value that may sit in the gauge vs stay on hold.</span>
        </label>
      </div>
      <button
        type="button"
        className={`kill ${book.kill ? 'on' : ''}`}
        aria-pressed={book.kill}
        onClick={() => onPatch({ kill: !book.kill })}
      >
        <span className="kill-knob" aria-hidden="true" />
        <span>
          <strong>Kill switch {book.kill ? 'on' : 'off'}</strong>
          <span className="fine">
            {book.kill
              ? 'Forces HOLD and a full gauge unstake, even when emissions look better.'
              : 'Off. The agent may stake up to the cap when gauge APR clears hold.'}
          </span>
        </span>
      </button>

      {book.kill && (
        <p className="alert kill-alert" role="status">
          Kill is on. The simulated read is HOLD. Run, then Apply, to unstake the gauge
          and restore the fee path.
        </p>
      )}

      <div className={`preview ${book.kill ? 'preview-kill' : ''}`} aria-live="polite">
        <div className="preview-top">
          <span className="label">Simulated read</span>
          <span className={`pill ${preview.recommendation}`}>
            {preview.recommendation}
            {preview.recommendation === 'MIXED' ? ` ${fmt(preview.stakePct, 0)}%` : ''}
          </span>
        </div>
        <p>{preview.rationale}</p>
        <dl className="target-grid" aria-label="Apply targets for this read">
          <div>
            <dt>Idle → reserve</dt>
            <dd>
              {fmt(book.idleMusd)} → {fmt(book.reserveMusd)} MUSD
              {idleGap > 0.01
                ? ` · park ${fmt(idleGap)} surplus`
                : idleGap < -0.01
                  ? ` · refill ${fmt(-idleGap)}`
                  : ' · already at floor'}
            </dd>
          </div>
          <div>
            <dt>Gauge share of savings</dt>
            <dd>
              {fmt(gaugeNowPct, 0)}% → {fmt(preview.stakePct, 0)}%
              {preview.recommendation === 'HOLD' ? ' · full unstake' : ''}
            </dd>
          </div>
        </dl>
      </div>

      <div className="epoch-steps" aria-label="Epoch workflow">
        <div className="epoch-step">
          <span className="step-num">1</span>
          <button type="button" className="btn primary" onClick={onRun}>
            Run epoch decision
          </button>
        </div>
        <div className="epoch-step">
          <span className="step-num">2</span>
          <button
            type="button"
            className={`btn ${last && !drifted ? 'primary' : ''}`}
            disabled={!last}
            onClick={onApply}
          >
            Apply last decision
          </button>
        </div>
      </div>

      {lastLabel ? (
        <p className="last-logged">
          Last logged: <span className={`pill ${last!.recommendation}`}>{lastLabel}</span>
          {drifted
            ? ' · policy drifted — Run again before Apply if you want the new read.'
            : ' · Apply rebalances the simulated book to that row.'}
        </p>
      ) : (
        <p className="fine">
          Step 1 writes one row to this browser. Step 2 moves idle / vault / gauge to match
          and does not send a transaction. Indifference band is {INDIFFERENCE_PP} pp.
        </p>
      )}
    </section>
  )
}

import { recommend, type Portfolio } from '../lib/engine'
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

      <div className="preview" aria-live="polite">
        <div className="preview-top">
          <span className="label">Simulated read</span>
          <span className={`pill ${preview.recommendation}`}>
            {preview.recommendation}
            {preview.recommendation === 'MIXED' ? ` ${fmt(preview.stakePct, 0)}%` : ''}
          </span>
        </div>
        <p>{preview.rationale}</p>
      </div>

      <div className="row">
        <button type="button" className="btn primary" onClick={onRun}>
          Run epoch decision
        </button>
        <button type="button" className="btn" disabled={!last} onClick={onApply}>
          Apply last decision
        </button>
      </div>
      <p className="fine">
        Run writes one row to this browser. Apply rebalances the simulated book to that
        row and does not send a transaction.
        {drifted && last
          ? ` Policy has moved since the logged ${last.recommendation}. Run again to log the new read.`
          : ''}
      </p>
    </section>
  )
}

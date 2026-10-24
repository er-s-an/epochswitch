import type { LogRow } from '../lib/engine'
import { fmt, fmtTime } from '../lib/format'

function SnapChips({ snap }: { snap: LogRow['snapshot'] }) {
  const chips = [
    ['Idle', `${fmt(snap.idleMusd)} MUSD`],
    ['Vault', `${fmt(snap.vaultShares, 2)} sMUSD`],
    ['Gauge', `${fmt(snap.stakedShares, 2)} sMUSD`],
    ['Rate', fmt(snap.exchangeRate, 6)],
    ['Hold', `${fmt(snap.holdAprPct)}%`],
    ['Gauge APR', `${fmt(snap.gaugeAprPct)}%`],
    ['Reserve', fmt(snap.reserveMusd)],
    ['Max', `${fmt(snap.maxStakePct, 0)}%`],
  ] as const
  return (
    <dl className="snap-chips">
      {chips.map(([k, v]) => (
        <div key={k} className="snap-chip">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
      {snap.kill ? (
        <div className="snap-chip kill-chip">
          <dt>Kill</dt>
          <dd>on</dd>
        </div>
      ) : null}
    </dl>
  )
}

export function LogCard({ rows, flashId }: { rows: LogRow[]; flashId: string | null }) {
  return (
    <section className="card log-card" aria-labelledby="log-title">
      <div className="card-head">
        <h2 id="log-title">Epoch log</h2>
        <span className="eyebrow">localStorage · this browser</span>
      </div>
      <p className="hint-line">
        Simulated decisions and book moves only. Times are Asia/Hong Kong. Nothing here
        is an on-chain receipt.
      </p>
      {rows.length === 0 ? (
        <p className="empty">No rows yet. Run an epoch decision or move the book.</p>
      ) : (
        <ol className="log">
          {rows.map((row) => (
            <li key={row.id} className={row.id === flashId ? 'flash' : ''}>
              <div className="log-meta">
                <time dateTime={row.at}>{fmtTime(row.at)}</time>
                <span className="kind">{row.kind}</span>
                {row.recommendation ? (
                  <span className={`pill ${row.recommendation}`}>
                    {row.recommendation}
                    {row.recommendation === 'MIXED' && row.stakePct != null
                      ? ` ${fmt(row.stakePct, 0)}%`
                      : ''}
                  </span>
                ) : (
                  <span className="pill neutral">{row.title}</span>
                )}
              </div>
              <div className="detail">
                <p>{row.detail}</p>
                <SnapChips snap={row.snapshot} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

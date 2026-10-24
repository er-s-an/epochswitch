import { fmt, fmtApr } from './format'

/** Stake only when gauge APR clears hold APR by at least this many percentage points. */
export const INDIFFERENCE_PP = 0.25

/**
 * Demo clock. 8,000× makes a 5% hold APR move the exchange rate within a
 * short walkthrough. Catch-up on load is capped so a stale tab cannot explode the rate.
 */
export const ACCRUAL_MULTIPLIER = 8_000
const YEAR_SECONDS = 365.25 * 24 * 3600
const MAX_CATCHUP_SECONDS = 6 * 3600
export const LOG_LIMIT = 40

export type Recommendation = 'HOLD' | 'STAKE' | 'MIXED'
export type LogKind = 'deposit' | 'withdraw' | 'stake' | 'unstake' | 'decision' | 'apply'

export type Snapshot = {
  idleMusd: number
  vaultShares: number
  stakedShares: number
  stakedEntryRate: number
  exchangeRate: number
  vaultMusd: number
  stakedMusd: number
  holdAprPct: number
  gaugeAprPct: number
  reserveMusd: number
  maxStakePct: number
  kill: boolean
}

export type Decision = {
  recommendation: Recommendation
  stakePct: number
  rationale: string
  snapshot: Snapshot
}

export type LogRow = {
  id: string
  at: string
  kind: LogKind
  title: string
  detail: string
  recommendation: Recommendation | null
  stakePct: number | null
  snapshot: Snapshot
}

export type Portfolio = {
  idleMusd: number
  vaultShares: number
  stakedShares: number
  /** MUSD value frozen per staked sMUSD. Staking redirects the fee, so this does not creep. */
  stakedEntryRate: number
  /** MUSD redeemable per unstaked sMUSD. Creeps at the hold APR. */
  exchangeRate: number
  lastAccrualAt: number
  holdAprPct: number
  gaugeAprPct: number
  reserveMusd: number
  maxStakePct: number
  kill: boolean
  log: LogRow[]
  lastDecision: Decision | null
}

export type ActionResult = {
  error: string | null
  portfolio: Portfolio
}

export function defaultPortfolio(now = Date.now()): Portfolio {
  return {
    idleMusd: 12_500,
    vaultShares: 4_200,
    stakedShares: 1_800,
    stakedEntryRate: 1.02,
    exchangeRate: 1.0482,
    lastAccrualAt: now,
    holdAprPct: 5.2,
    gaugeAprPct: 14.8,
    reserveMusd: 10_000,
    maxStakePct: 60,
    kill: false,
    log: [],
    lastDecision: null,
  }
}

export function round(n: number, dp: number): number {
  if (!Number.isFinite(n)) return 0
  const p = 10 ** dp
  return Math.round((n + Number.EPSILON) * p) / p
}

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function vaultMusd(p: Portfolio): number {
  return p.vaultShares * p.exchangeRate
}

export function stakedMusd(p: Portfolio): number {
  return p.stakedShares * p.stakedEntryRate
}

export function savingsMusd(p: Portfolio): number {
  return vaultMusd(p) + stakedMusd(p)
}

/** MUSD of fee yield the gauge position has missed since it was staked. */
export function forgoneYield(p: Portfolio): number {
  return Math.max(0, p.stakedShares * (p.exchangeRate - p.stakedEntryRate))
}

export function snapshot(p: Portfolio): Snapshot {
  return {
    idleMusd: p.idleMusd,
    vaultShares: p.vaultShares,
    stakedShares: p.stakedShares,
    stakedEntryRate: p.stakedEntryRate,
    exchangeRate: p.exchangeRate,
    vaultMusd: vaultMusd(p),
    stakedMusd: stakedMusd(p),
    holdAprPct: p.holdAprPct,
    gaugeAprPct: p.gaugeAprPct,
    reserveMusd: p.reserveMusd,
    maxStakePct: p.maxStakePct,
    kill: p.kill,
  }
}

function rid(): string {
  return `ep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function tidy(p: Portfolio): Portfolio {
  const stakedShares = p.stakedShares < 1e-8 ? 0 : round(Math.max(0, p.stakedShares), 8)
  return {
    ...p,
    idleMusd: round(Math.max(0, p.idleMusd), 6),
    vaultShares: p.vaultShares < 1e-8 ? 0 : round(Math.max(0, p.vaultShares), 8),
    stakedShares,
    stakedEntryRate: stakedShares === 0 ? 0 : round(Math.max(0, p.stakedEntryRate), 8),
    exchangeRate: round(Math.max(1e-6, p.exchangeRate), 8),
    holdAprPct: clamp(p.holdAprPct, 0, 100),
    gaugeAprPct: clamp(p.gaugeAprPct, 0, 200),
    reserveMusd: round(Math.max(0, p.reserveMusd), 2),
    maxStakePct: clamp(p.maxStakePct, 0, 100),
  }
}

function fail(p: Portfolio, error: string): ActionResult {
  return { error, portfolio: p }
}

function withRow(
  before: Portfolio,
  after: Portfolio,
  row: Omit<LogRow, 'id' | 'at' | 'snapshot'>,
  lastDecision: Decision | null,
): ActionResult {
  const entry: LogRow = {
    id: rid(),
    at: new Date().toISOString(),
    snapshot: snapshot(before),
    ...row,
  }
  return {
    error: null,
    portfolio: tidy({
      ...after,
      log: [entry, ...before.log].slice(0, LOG_LIMIT),
      lastDecision,
    }),
  }
}

export function accrue(p: Portfolio, now: number): Portfolio {
  const dt = Math.max(0, (now - p.lastAccrualAt) / 1000)
  if (dt < 0.25) return p
  const apr = Math.max(0, p.holdAprPct) / 100
  if (apr === 0) return { ...p, lastAccrualAt: now }
  const sim = Math.min(dt * ACCRUAL_MULTIPLIER, MAX_CATCHUP_SECONDS)
  const factor = Math.exp(Math.log(1 + apr) * (sim / YEAR_SECONDS))
  return {
    ...p,
    exchangeRate: round(p.exchangeRate * factor, 8),
    lastAccrualAt: now,
  }
}

export function deposit(p: Portfolio, musd: number): ActionResult {
  const amount = round(musd, 6)
  if (!(amount > 0)) return fail(p, 'Enter a MUSD amount greater than zero.')
  if (amount > p.idleMusd + 1e-6) {
    return fail(p, `Idle MUSD in the simulated book is ${fmt(p.idleMusd)}.`)
  }
  const take = Math.min(amount, p.idleMusd)
  const shares = take / p.exchangeRate
  const after: Portfolio = {
    ...p,
    idleMusd: p.idleMusd - take,
    vaultShares: p.vaultShares + shares,
  }
  return withRow(
    p,
    after,
    {
      kind: 'deposit',
      title: `Deposited ${fmt(take)} MUSD`,
      detail: `Minted ${fmt(shares, 4)} sMUSD at exchange rate ${fmt(p.exchangeRate, 6)}. Simulated vault only. No transaction was sent.`,
      recommendation: null,
      stakePct: null,
    },
    p.lastDecision,
  )
}

export function withdraw(p: Portfolio, musd: number): ActionResult {
  const amount = round(musd, 6)
  if (!(amount > 0)) return fail(p, 'Enter a MUSD amount greater than zero.')
  const available = vaultMusd(p)
  if (amount > available + 1e-6) {
    return fail(p, `Vault sMUSD can redeem ${fmt(available)} MUSD.`)
  }
  const take = Math.min(amount, available)
  const shares = take / p.exchangeRate
  const after: Portfolio = {
    ...p,
    idleMusd: p.idleMusd + take,
    vaultShares: p.vaultShares - shares,
  }
  return withRow(
    p,
    after,
    {
      kind: 'withdraw',
      title: `Withdrew ${fmt(take)} MUSD`,
      detail: `Burned ${fmt(shares, 4)} vault sMUSD at exchange rate ${fmt(p.exchangeRate, 6)}. Simulated vault only.`,
      recommendation: null,
      stakePct: null,
    },
    p.lastDecision,
  )
}

export function stake(p: Portfolio, sharesIn: number): ActionResult {
  const shares = round(sharesIn, 8)
  if (!(shares > 0)) return fail(p, 'Enter an sMUSD amount greater than zero.')
  if (shares > p.vaultShares + 1e-8) {
    return fail(p, `Vault holds ${fmt(p.vaultShares, 4)} sMUSD.`)
  }
  const move = Math.min(shares, p.vaultShares)
  const musdValue = move * p.exchangeRate
  const newStaked = p.stakedShares + move
  const entry = (p.stakedShares * p.stakedEntryRate + musdValue) / newStaked
  const after: Portfolio = {
    ...p,
    vaultShares: p.vaultShares - move,
    stakedShares: newStaked,
    stakedEntryRate: entry,
  }
  return withRow(
    p,
    after,
    {
      kind: 'stake',
      title: `Staked ${fmt(move, 4)} sMUSD`,
      detail: `Froze ${fmt(musdValue)} MUSD of value at rate ${fmt(p.exchangeRate, 6)}. In this simulation those shares stop accruing the protocol fee and would earn the gauge's MEZO APR instead. MEZO is not minted here.`,
      recommendation: null,
      stakePct: null,
    },
    p.lastDecision,
  )
}

export function unstake(p: Portfolio, sharesIn: number): ActionResult {
  const shares = round(sharesIn, 8)
  if (!(shares > 0)) return fail(p, 'Enter an sMUSD amount greater than zero.')
  if (shares > p.stakedShares + 1e-8) {
    return fail(p, `Gauge holds ${fmt(p.stakedShares, 4)} sMUSD.`)
  }
  if (!(p.stakedEntryRate > 0) || !(p.exchangeRate > 0)) {
    return fail(p, 'Exchange rate is not ready.')
  }
  const move = Math.min(shares, p.stakedShares)
  const musdValue = move * p.stakedEntryRate
  const returned = musdValue / p.exchangeRate
  const newStaked = p.stakedShares - move
  const after: Portfolio = {
    ...p,
    stakedShares: newStaked,
    stakedEntryRate: newStaked < 1e-8 ? 0 : p.stakedEntryRate,
    vaultShares: p.vaultShares + returned,
  }
  return withRow(
    p,
    after,
    {
      kind: 'unstake',
      title: `Unstaked ${fmt(move, 4)} sMUSD`,
      detail: `Frozen value ${fmt(musdValue)} MUSD re-entered the vault as ${fmt(returned, 4)} sMUSD at rate ${fmt(p.exchangeRate, 6)}. The share gap is fee yield that stayed redirected while the position was staked.`,
      recommendation: null,
      stakePct: null,
    },
    p.lastDecision,
  )
}

function reserveSentence(p: Portfolio): string {
  const gap = p.reserveMusd - p.idleMusd
  if (gap > 0.01) {
    return `Idle is ${fmt(p.idleMusd)} MUSD, short of the ${fmt(p.reserveMusd)} spend reserve by ${fmt(gap)}. Applying this decision refills the reserve from the vault first.`
  }
  const surplus = p.idleMusd - p.reserveMusd
  if (surplus > 0.01) {
    return `Spend reserve of ${fmt(p.reserveMusd)} MUSD is covered. Surplus idle is ${fmt(surplus)} MUSD and, on apply, goes into the vault before the gauge is set to target.`
  }
  return `Spend reserve of ${fmt(p.reserveMusd)} MUSD is covered by idle MUSD.`
}

export function recommend(p: Portfolio): Decision {
  const edge = p.gaugeAprPct - p.holdAprPct
  const snap = snapshot(p)
  let recommendation: Recommendation = 'HOLD'
  let stakePct = 0
  let lead: string

  if (p.kill) {
    lead = `Kill switch is on. Recommend HOLD and unstake the full gauge so fee accrual returns to the vault. Emissions are ignored (gauge ${fmtApr(p.gaugeAprPct)} versus hold ${fmtApr(p.holdAprPct)}).`
  } else if (p.maxStakePct <= 0) {
    lead = `Max stake is 0%, so policy keeps the gauge closed. Recommend HOLD and unstake.`
  } else if (edge < INDIFFERENCE_PP) {
    lead = `Gauge APR ${fmtApr(p.gaugeAprPct)} does not clear hold APR ${fmtApr(p.holdAprPct)} by the ${INDIFFERENCE_PP} percentage-point band (spread ${fmt(edge, 2)} pp). Recommend HOLD and unstake. Staked sMUSD gives up the MUSD fee for emissions that do not win this epoch.`
  } else if (p.maxStakePct >= 100) {
    recommendation = 'STAKE'
    stakePct = 100
    lead = `Gauge APR ${fmtApr(p.gaugeAprPct)} beats hold APR ${fmtApr(p.holdAprPct)} by ${fmt(edge, 2)} pp, past the ${INDIFFERENCE_PP} pp band. Max stake is 100%, so recommend STAKE. Savings value goes to the gauge, those shares stop accruing the MUSD fee here, and MEZO is quoted rather than minted.`
  } else {
    recommendation = 'MIXED'
    stakePct = p.maxStakePct
    lead = `Gauge APR ${fmtApr(p.gaugeAprPct)} beats hold APR ${fmtApr(p.holdAprPct)} by ${fmt(edge, 2)} pp. Policy caps the gauge at ${fmt(p.maxStakePct, 0)}% of savings value, so recommend MIXED: stake ${fmt(p.maxStakePct, 0)}% and leave ${fmt(100 - p.maxStakePct, 0)}% in the vault on the fee path.`
  }

  return {
    recommendation,
    stakePct,
    rationale: `${lead} ${reserveSentence(p)}`,
    snapshot: snap,
  }
}

export function commitDecision(p: Portfolio): ActionResult {
  const decision = recommend(p)
  const pct =
    decision.recommendation === 'MIXED' ? ` ${fmt(decision.stakePct, 0)}%` : ''
  return withRow(
    p,
    p,
    {
      kind: 'decision',
      title: `${decision.recommendation}${pct}`,
      detail: decision.rationale,
      recommendation: decision.recommendation,
      stakePct: decision.stakePct,
    },
    decision,
  )
}

type Move =
  | { type: 'withdraw'; musd: number; shares: number }
  | { type: 'deposit'; musd: number; shares: number }
  | { type: 'stake'; shares: number; musd: number }
  | { type: 'unstake'; sharesIn: number; sharesOut: number; musd: number }

function describeMove(m: Move): string {
  switch (m.type) {
    case 'withdraw':
      return `Withdrew ${fmt(m.musd)} MUSD from the vault (${fmt(m.shares, 4)} sMUSD) toward the spend reserve.`
    case 'deposit':
      return `Deposited ${fmt(m.musd)} MUSD of surplus idle for ${fmt(m.shares, 4)} sMUSD.`
    case 'stake':
      return `Staked ${fmt(m.shares, 4)} sMUSD (${fmt(m.musd)} MUSD). Fee accrual on these shares stops in the simulation.`
    case 'unstake':
      return `Unstaked ${fmt(m.sharesIn, 4)} gauge sMUSD (${fmt(m.musd)} MUSD frozen) and returned ${fmt(m.sharesOut, 4)} sMUSD to the vault.`
  }
}

export function applyDecision(p: Portfolio): ActionResult {
  const decision = p.lastDecision
  if (!decision) return fail(p, 'Run an epoch decision before applying it.')

  const moves: Move[] = []
  let cur: Portfolio = { ...p }

  const pullVault = (musd: number) => {
    const available = cur.vaultShares * cur.exchangeRate
    const take = Math.min(Math.max(0, musd), available)
    if (take <= 1e-6) return 0
    const shares = take / cur.exchangeRate
    cur = { ...cur, vaultShares: cur.vaultShares - shares, idleMusd: cur.idleMusd + take }
    moves.push({ type: 'withdraw', musd: take, shares })
    return take
  }

  const freeFromGauge = (musd: number) => {
    if (!(cur.stakedEntryRate > 0) || cur.stakedShares <= 0 || !(cur.exchangeRate > 0)) return 0
    const available = cur.stakedShares * cur.stakedEntryRate
    const take = Math.min(Math.max(0, musd), available)
    if (take <= 1e-6) return 0
    const sharesIn = take / cur.stakedEntryRate
    const sharesOut = take / cur.exchangeRate
    const newStaked = cur.stakedShares - sharesIn
    cur = {
      ...cur,
      stakedShares: newStaked,
      stakedEntryRate: newStaked < 1e-8 ? 0 : cur.stakedEntryRate,
      vaultShares: cur.vaultShares + sharesOut,
    }
    moves.push({ type: 'unstake', sharesIn, sharesOut, musd: take })
    return take
  }

  const parkSurplus = (musd: number) => {
    const take = Math.min(Math.max(0, musd), cur.idleMusd)
    if (take <= 1e-6) return
    const shares = take / cur.exchangeRate
    cur = { ...cur, idleMusd: cur.idleMusd - take, vaultShares: cur.vaultShares + shares }
    moves.push({ type: 'deposit', musd: take, shares })
  }

  const pushGauge = (musd: number) => {
    const available = cur.vaultShares * cur.exchangeRate
    const take = Math.min(Math.max(0, musd), available)
    if (take <= 1e-6 || !(cur.exchangeRate > 0)) return
    const shares = take / cur.exchangeRate
    const newStaked = cur.stakedShares + shares
    const entry = (cur.stakedShares * cur.stakedEntryRate + take) / newStaked
    cur = {
      ...cur,
      vaultShares: cur.vaultShares - shares,
      stakedShares: newStaked,
      stakedEntryRate: entry,
    }
    moves.push({ type: 'stake', shares, musd: take })
  }

  let short = cur.reserveMusd - cur.idleMusd
  if (short > 1e-4) short -= pullVault(short)
  if (short > 1e-4) {
    freeFromGauge(short)
    pullVault(cur.reserveMusd - cur.idleMusd)
  }

  const surplus = cur.idleMusd - cur.reserveMusd
  if (surplus > 1e-4) parkSurplus(surplus)

  const total = cur.vaultShares * cur.exchangeRate + cur.stakedShares * cur.stakedEntryRate
  const target = (total * decision.stakePct) / 100
  const held = cur.stakedShares * cur.stakedEntryRate
  if (held > target + 1e-4) freeFromGauge(held - target)
  else if (target > held + 1e-4) pushGauge(target - held)

  const pct = decision.recommendation === 'MIXED' ? ` ${fmt(decision.stakePct, 0)}%` : ''
  const body =
    moves.length > 0
      ? moves.map(describeMove).join(' ')
      : 'Book already matched this decision. Idle reserve and the stake split were left as they were.'
  const afterNote = `Book now: idle ${fmt(cur.idleMusd)} MUSD, vault ${fmt(cur.vaultShares, 4)} sMUSD, gauge ${fmt(cur.stakedShares, 4)} sMUSD.`

  return withRow(
    p,
    cur,
    {
      kind: 'apply',
      title: `Applied ${decision.recommendation}${pct}`,
      detail: `${body} ${afterNote}`,
      recommendation: decision.recommendation,
      stakePct: decision.stakePct,
    },
    decision,
  )
}

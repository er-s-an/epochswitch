import {
  clamp,
  defaultPortfolio,
  type Decision,
  type LogRow,
  type Portfolio,
  type Recommendation,
  round,
} from './engine'

export const STORAGE_KEY = 'epochswitch.v2'

const RECS: readonly Recommendation[] = ['HOLD', 'STAKE', 'MIXED']

function isRecommendation(v: unknown): v is Recommendation {
  return typeof v === 'string' && RECS.includes(v as Recommendation)
}

function isLogRow(v: unknown): v is LogRow {
  if (!v || typeof v !== 'object') return false
  const row = v as Partial<LogRow>
  return (
    typeof row.id === 'string' &&
    typeof row.at === 'string' &&
    typeof row.title === 'string' &&
    typeof row.detail === 'string' &&
    typeof row.kind === 'string' &&
    !!row.snapshot &&
    typeof row.snapshot === 'object'
  )
}

function isDecision(v: unknown): v is Decision {
  if (!v || typeof v !== 'object') return false
  const d = v as Partial<Decision>
  return (
    isRecommendation(d.recommendation) &&
    typeof d.stakePct === 'number' &&
    typeof d.rationale === 'string' &&
    !!d.snapshot &&
    typeof d.snapshot === 'object'
  )
}

export function normalizePortfolio(raw: unknown): Portfolio {
  const base = defaultPortfolio()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Partial<Portfolio>
  const exchangeRate = Math.max(1e-6, Number(o.exchangeRate))
  const stakedShares = Math.max(0, Number(o.stakedShares))
  if (!Number.isFinite(exchangeRate) || !Number.isFinite(stakedShares)) return base
  const entry = Number(o.stakedEntryRate)
  return {
    idleMusd: round(Math.max(0, Number(o.idleMusd) || 0), 6),
    vaultShares: round(Math.max(0, Number(o.vaultShares) || 0), 8),
    stakedShares: round(stakedShares, 8),
    stakedEntryRate:
      stakedShares > 0 ? round(Math.max(1e-6, Number.isFinite(entry) ? entry : exchangeRate), 8) : 0,
    exchangeRate: round(exchangeRate, 8),
    lastAccrualAt: Number.isFinite(Number(o.lastAccrualAt)) ? Number(o.lastAccrualAt) : Date.now(),
    holdAprPct: clamp(Number(o.holdAprPct), 0, 100),
    gaugeAprPct: clamp(Number(o.gaugeAprPct), 0, 200),
    reserveMusd: round(Math.max(0, Number(o.reserveMusd) || 0), 2),
    maxStakePct: clamp(Number(o.maxStakePct), 0, 100),
    kill: Boolean(o.kill),
    log: Array.isArray(o.log) ? o.log.filter(isLogRow).slice(0, 40) : [],
    lastDecision: isDecision(o.lastDecision) ? o.lastDecision : null,
  }
}

export function loadPortfolio(): Portfolio {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPortfolio()
    return normalizePortfolio(JSON.parse(raw) as unknown)
  } catch {
    return defaultPortfolio()
  }
}

export function savePortfolio(p: Portfolio) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

import {
  applyDecision,
  commitDecision,
  defaultPortfolio,
  deposit,
  recommend,
  stake,
  unstake,
  vaultMusd,
  stakedMusd,
  type Portfolio,
} from './engine'

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message)
}

function book(partial: Partial<Portfolio>): Portfolio {
  return { ...defaultPortfolio(1_700_000_000_000), ...partial, log: [], lastDecision: null }
}

export function runSelfCheck() {
  const seed = defaultPortfolio(1_700_000_000_000)
  const opened = recommend(seed)
  assert(opened.recommendation === 'MIXED' && opened.stakePct === 60, 'seed should be MIXED 60')

  const killed = recommend({ ...seed, kill: true })
  assert(killed.recommendation === 'HOLD' && killed.stakePct === 0, 'kill is HOLD / unstake')

  const full = recommend({ ...seed, maxStakePct: 100 })
  assert(full.recommendation === 'STAKE' && full.stakePct === 100, 'cap 100 is STAKE')

  const tight = recommend({ ...seed, gaugeAprPct: 5.3 })
  assert(tight.recommendation === 'HOLD', '0.10 pp spread stays HOLD')

  const closed = recommend({ ...seed, maxStakePct: 0, gaugeAprPct: 40 })
  assert(closed.recommendation === 'HOLD', 'zero cap is HOLD')

  const deposited = deposit(seed, 100)
  assert(deposited.error === null, 'deposit should succeed')
  assert(Math.abs(deposited.portfolio.idleMusd - (seed.idleMusd - 100)) < 1e-6, 'idle drops')
  assert(
    deposited.portfolio.vaultShares > seed.vaultShares,
    'deposit mints shares',
  )
  assert(deposited.portfolio.log[0]?.kind === 'deposit', 'deposit logs')
  assert(deposit(seed, 999_999).error !== null, 'oversize deposit fails')

  const tiny = book({
    idleMusd: 0,
    vaultShares: 100,
    stakedShares: 0,
    stakedEntryRate: 0,
    exchangeRate: 1,
    reserveMusd: 0,
    holdAprPct: 5,
  })
  const staked = stake(tiny, 100)
  assert(staked.error === null, 'stake all')
  assert(Math.abs(stakedMusd(staked.portfolio) - 100) < 1e-6, 'frozen at 100')
  const richer: Portfolio = { ...staked.portfolio, exchangeRate: 2 }
  assert(Math.abs(vaultMusd(richer)) < 1e-6, 'vault empty')
  assert(Math.abs(stakedMusd(richer) - 100) < 1e-6, 'stake does not accrue the fee')
  const back = unstake(richer, 100)
  assert(back.error === null, 'unstake')
  assert(Math.abs(back.portfolio.vaultShares - 50) < 1e-4, 'redirected yield returns fewer shares')
  assert(back.portfolio.log[0]?.kind === 'unstake', 'unstake logs')

  const logged = commitDecision(seed)
  assert(logged.portfolio.lastDecision?.recommendation === 'MIXED', 'commit stores decision')
  assert(logged.portfolio.log[0]?.kind === 'decision', 'decision logs')
  const applied = applyDecision(logged.portfolio)
  assert(applied.error === null, 'apply')
  assert(Math.abs(applied.portfolio.idleMusd - seed.reserveMusd) < 0.05, 'idle meets reserve')
  const savings =
    applied.portfolio.vaultShares * applied.portfolio.exchangeRate +
    applied.portfolio.stakedShares * applied.portfolio.stakedEntryRate
  const gaugeShare = (applied.portfolio.stakedShares * applied.portfolio.stakedEntryRate) / savings
  assert(Math.abs(gaugeShare - 0.6) < 0.01, `gauge share ${gaugeShare}`)

  const holdLogged = commitDecision({ ...seed, kill: true })
  const holdApplied = applyDecision(holdLogged.portfolio)
  assert(holdApplied.portfolio.stakedShares < 1e-6, 'kill apply unstakes')
  assert(Math.abs(holdApplied.portfolio.idleMusd - seed.reserveMusd) < 0.05, 'hold keeps reserve')
}

runSelfCheck()

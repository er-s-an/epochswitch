import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { MUSD_EXPLORER, MUSD_TESTNET, mezoTestnet } from '../config/chain'
import { erc20Abi } from '../config/erc20'
import { forgoneYield, savingsMusd, stakedMusd, vaultMusd, type Portfolio } from '../lib/engine'
import { fmt } from '../lib/format'

export function PositionsCard({ book }: { book: Portfolio }) {
  const { address, isConnected } = useAccount()
  const balance = useReadContract({
    address: MUSD_TESTNET,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: mezoTestnet.id,
    query: { enabled: Boolean(address), refetchInterval: 20_000 },
  })
  const decimals = useReadContract({
    address: MUSD_TESTNET,
    abi: erc20Abi,
    functionName: 'decimals',
    chainId: mezoTestnet.id,
    query: { enabled: Boolean(address) },
  })

  const onChain =
    balance.data !== undefined
      ? Number(formatUnits(balance.data, decimals.data ?? 18))
      : null

  const vaultValue = vaultMusd(book)
  const stakedValue = stakedMusd(book)
  const total = savingsMusd(book)
  const holdPct = total > 0 ? (vaultValue / total) * 100 : 0
  const gaugePct = total > 0 ? (stakedValue / total) * 100 : 0
  const redirected = forgoneYield(book)
  const surplus = book.idleMusd - book.reserveMusd

  let chainLine = 'Connect a wallet to read testnet MUSD.'
  if (isConnected && balance.isLoading) chainLine = 'Reading testnet MUSD…'
  else if (isConnected && balance.isError) {
    chainLine = 'Could not read MUSD on Mezo testnet. The simulated book still works.'
  } else if (onChain !== null) chainLine = `${fmt(onChain, 4)} MUSD`

  let surplusLine: string
  if (surplus > 0.01) {
    surplusLine = `Surplus ${fmt(surplus)} MUSD above the ${fmt(book.reserveMusd)} spend reserve — Apply parks it in the vault (hold), then may stake up to the gauge cap.`
  } else if (surplus < -0.01) {
    surplusLine = `Idle is ${fmt(-surplus)} MUSD short of the ${fmt(book.reserveMusd)} spend reserve — Apply refills idle from vault/gauge first.`
  } else {
    surplusLine = `Idle matches the ${fmt(book.reserveMusd)} spend reserve. Apply only rebalances vault hold vs gauge stake.`
  }

  return (
    <section className="card" aria-labelledby="positions-title">
      <div className="card-head">
        <h2 id="positions-title">Positions</h2>
        <span className="eyebrow">Simulated book</span>
      </div>
      <div className="stats">
        <article className="stat">
          <div className="label">Idle MUSD</div>
          <div className="value">{fmt(book.idleMusd)}</div>
          <div className="hint">Spendable cash · reserve {fmt(book.reserveMusd)}</div>
        </article>
        <article className="stat">
          <div className="label">Vault sMUSD · hold</div>
          <div className="value">{fmt(book.vaultShares, 4)}</div>
          <div className="hint">≈ {fmt(vaultValue)} MUSD at {fmt(book.exchangeRate, 6)}</div>
        </article>
        <article className="stat">
          <div className="label">Staked sMUSD · gauge</div>
          <div className="value">{fmt(book.stakedShares, 4)}</div>
          <div className="hint">Frozen ≈ {fmt(stakedValue)} MUSD at {fmt(book.stakedEntryRate, 6)}</div>
        </article>
      </div>

      <p className={`surplus-callout ${surplus > 0.01 ? 'above' : surplus < -0.01 ? 'short' : 'flat'}`}>
        {surplusLine}
      </p>

      <div className="split" aria-hidden="true">
        <span className="split-hold" style={{ width: `${holdPct}%` }} />
        <span className="split-gauge" style={{ width: `${gaugePct}%` }} />
      </div>
      <div className="split-legend">
        <span>Hold {fmt(holdPct, 0)}% · fee path</span>
        <span>Gauge {fmt(gaugePct, 0)}% · MEZO path</span>
        <span>Savings {fmt(total)} MUSD</span>
      </div>
      <p className="hint-line">
        Fee redirected while staked: <strong>{fmt(redirected)} MUSD</strong>. Unstaking
        restores the fee path and does not pay that yield back.
      </p>

      <div className="chain-row">
        <div>
          <div className="label">
            <span className="tag live tiny">LIVE</span> Wallet MUSD · Mezo testnet
          </div>
          <div className="chain-value">{chainLine}</div>
          <div className="fine">On-chain read only. The positions above stay simulated.</div>
        </div>
        <a href={MUSD_EXPLORER} target="_blank" rel="noreferrer">
          {MUSD_TESTNET.slice(0, 6)}…{MUSD_TESTNET.slice(-4)}
        </a>
      </div>
      {balance.error && (
        <p className="fine">{balance.error.message.slice(0, 160)}</p>
      )}
    </section>
  )
}

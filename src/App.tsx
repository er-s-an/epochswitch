import { MAINNET_SAVINGS_VAULT_REFERENCE, MEZO_MAINNET_REFERENCE, MUSD_TESTNET } from './config/chain'
import { ActionsCard } from './components/ActionsCard'
import { HeaderBar } from './components/HeaderBar'
import { LogCard } from './components/LogCard'
import { PolicyCard } from './components/PolicyCard'
import { PositionsCard } from './components/PositionsCard'
import { RatesCard } from './components/RatesCard'
import { applyDecision, commitDecision, deposit, stake, unstake, withdraw } from './lib/engine'
import { useBook } from './lib/useBook'

export default function App() {
  const { book, error, flashId, commit, patch, reset } = useBook()

  return (
    <div className="shell">
      <div className="mockbar" role="status">
        <div className="mockbar-row">
          <span className="tag mock">MOCK</span>
          <span>
            Vault deposit, sMUSD balances, gauge stake, APRs, and the epoch log live in
            this browser. No vault or gauge transaction is sent.
          </span>
        </div>
        <div className="mockbar-row">
          <span className="tag live">LIVE</span>
          <span>
            Wallet connect, Mezo Testnet chain id 31611, and the MUSD balance read use
            testnet when a wallet is connected.
          </span>
        </div>
      </div>
      <div className="wrap">
        <HeaderBar />
        <p className="lede">
          Idle MUSD above the spend reserve can sit in the savings vault as sMUSD and
          earn the protocol fee, or stake in the gauge for MEZO emissions. Each epoch
          the agent picks hold, stake, or a mix, writes it to the log, and can apply
          that choice to the simulated book.
        </p>
        <div className="layout">
          <div className="stack">
            <PositionsCard book={book} />
            <ActionsCard
              book={book}
              error={error}
              onDeposit={(amount) => commit((current) => deposit(current, amount))}
              onWithdraw={(amount) => commit((current) => withdraw(current, amount))}
              onStake={(shares) => commit((current) => stake(current, shares))}
              onUnstake={(shares) => commit((current) => unstake(current, shares))}
              onReset={reset}
            />
          </div>
          <div className="stack">
            <RatesCard book={book} onApr={patch} />
            <PolicyCard
              book={book}
              onPatch={patch}
              onRun={() => commit(commitDecision)}
              onApply={() => commit(applyDecision)}
            />
          </div>
        </div>
        <LogCard rows={book.log} flashId={flashId} />
        <footer className="footer">
          <p>
            EpochSwitch · Mezo Soft Wave 1 thin demo · window closes about 2026-10-26.
            Do not re-enroll and do not submit this build.
          </p>
          <p>
            Testnet MUSD {MUSD_TESTNET}. Mainnet MEZO reference {MEZO_MAINNET_REFERENCE}.
            Mainnet savings vault reference {MAINNET_SAVINGS_VAULT_REFERENCE} is not called.
            Testnet vault, sMUSD, and savings gauge addresses are unpublished.
          </p>
        </footer>
      </div>
    </div>
  )
}

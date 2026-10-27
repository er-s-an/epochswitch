import { MAINNET_SAVINGS_VAULT_REFERENCE, MEZO_MAINNET_REFERENCE, MUSD_TESTNET } from './config/chain'
import { ActionsCard } from './components/ActionsCard'
import { HeaderBar } from './components/HeaderBar'
import { LogCard } from './components/LogCard'
import { PolicyCard } from './components/PolicyCard'
import { PositionsCard } from './components/PositionsCard'
import { RatesCard } from './components/RatesCard'
import { applyDecision, commitDecision, deposit, stake, unstake, withdraw } from './lib/engine'
import { useBook } from './lib/useBook'

const EXPLAINER = 'https://review-clips.vercel.app/v/mezo-epochswitch-explainer'
const REPO = 'https://github.com/er-s-an/epochswitch'

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
          Keep a spend reserve in idle MUSD. Each epoch, park the surplus as vault
          sMUSD and choose <strong>HOLD</strong> (protocol fee via the exchange rate)
          or <strong>STAKE</strong> (MEZO emissions) up to a max-stake cap. The agent
          logs the choice and can apply it to the simulated book. Kill switch forces
          HOLD and a full unstake.
        </p>
        <ol className="walkthrough" aria-label="Judge walkthrough">
          <li>
            <span className="walk-num">1</span>
            <span>
              <strong>Positions</strong> — idle cash, vault hold, gauge stake. Surplus
              above the spend reserve is what the agent deploys.
            </span>
          </li>
          <li>
            <span className="walk-num">2</span>
            <span>
              <strong>Rates → Policy</strong> — read Epoch lean, then{' '}
              <strong>1 · Run</strong> (write the log) and <strong>2 · Apply</strong>{' '}
              (rebalance the simulated book).
            </span>
          </li>
          <li>
            <span className="walk-num">3</span>
            <span>
              <strong>Kill switch</strong> — forces HOLD and a full unstake; the epoch
              log keeps both reasons.
            </span>
          </li>
        </ol>
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
          <p className="footer-links">
            <a href={REPO} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <span aria-hidden="true">·</span>
            <a href={EXPLAINER} target="_blank" rel="noreferrer">
              Explainer (2–3 min)
            </a>
            <span aria-hidden="true">·</span>
            <a href="https://epochswitch.vercel.app" target="_blank" rel="noreferrer">
              Live demo
            </a>
          </p>
          <p>
            EpochSwitch · Mezo Soft Wave 2 demo · building window Nov 2–15 2026.
            Vault / gauge / APRs / log are simulated. Wallet + MUSD balance are testnet.
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

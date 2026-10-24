import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { mezoTestnet } from '../config/chain'

export function HeaderBar() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending, error } = useSwitchChain()
  const onMezo = isConnected && chainId === mezoTestnet.id
  const wrong = isConnected && chainId !== mezoTestnet.id

  return (
    <header className="header">
      <div className="brand">
        <span className="mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="32" height="32">
            <rect width="32" height="32" rx="9" fill="#1a090b" />
            <path
              d="M7 21.5h7.2l2.6-8.2 3.4 12.2 2.6-6.5H25"
              fill="none"
              stroke="#ff2a36"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <h1>EpochSwitch</h1>
          <p>Idle MUSD, one epoch at a time</p>
        </div>
      </div>
      <div className="header-actions">
        <div className={`net ${onMezo ? 'on' : wrong ? 'off' : 'idle'}`}>
          <span className="dot" aria-hidden="true" />
          {onMezo && <span>Mezo Testnet · 31611</span>}
          {wrong && <span>Wrong network · {chainId}</span>}
          {!isConnected && <span>Mezo Testnet · 31611</span>}
          {wrong && (
            <button
              type="button"
              className="btn tiny"
              disabled={isPending}
              onClick={() => switchChain({ chainId: mezoTestnet.id })}
            >
              {isPending ? 'Switching…' : 'Switch'}
            </button>
          )}
        </div>
        {error && <span className="net-error">{error.message}</span>}
        <ConnectButton accountStatus="address" chainStatus="none" showBalance={false} />
      </div>
    </header>
  )
}

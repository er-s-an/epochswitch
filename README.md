# EpochSwitch

A thin Mezo Soft Wave 1 demo. An operator keeps a spend reserve in idle MUSD and, once each epoch, chooses between two uses of the rest:

- **Hold** sMUSD and earn the protocol fee. The fee shows up as a rising sMUSD → MUSD exchange rate.
- **Stake** sMUSD in the savings gauge and earn MEZO emissions. While staked, that fee share is redirected to veBTC voters.

The policy agent writes the choice to an epoch log. Spend reserve, max-stake percent, and a kill switch bound the choice. With the kill switch on, the agent recommends **HOLD** and a full unstake.

Contest window: Wave 1 closes about **2026-10-26**. This build is already enrolled. Do not re-enroll. Do not submit it.

## Run

```bash
cd /workspace/competitions/mezo/epochswitch
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build
npm run preview   # http://localhost:4173
```

Optional: set `VITE_WC_PROJECT_ID` to a WalletConnect Cloud project id if you want a working QR code. Injected wallets (MetaMask and other browser wallets) connect without it.

Live demo: https://epochswitch.vercel.app (production redeployed 2026-10-23 ~22:09 Asia/Shanghai with this revision).

## Chain

| | |
|---|---|
| Network | Mezo Testnet |
| chainId | `31611` (`0x7b7b`, checked 2026-10-19) |
| RPC | `https://rpc.test.mezo.org` (browser CORS is open) |
| Explorer | https://explorer.test.mezo.org |
| Gas | BTC, 18 decimals |
| Testnet MUSD | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` (`decimals()` = 18) |
| Mainnet MEZO (reference only) | `0x7B7c000000000000000000000000000000000001` |
| Mainnet savings vault (reference only, not called) | `0xb4D498029af77680cD1eF828b967f010d06C51CC` |

## What is real

- Wagmi + RainbowKit wallet connect
- Mezo Testnet in the wallet config, network badge, and switch to chain 31611
- `balanceOf` on the testnet MUSD token when a wallet is connected

## What is mocked

Public Mezo docs list testnet MUSD and do not publish a testnet MUSD Savings Vault, sMUSD receipt, or savings-gauge address (checked 2026-10-19). These surfaces stay in the browser:

- Idle / vault / gauge balances and every deposit, withdraw, stake, and unstake
- Hold APR and gauge MEZO APR (editable scenario inputs, not a live gauge)
- sMUSD → MUSD exchange rate. It creeps at the hold APR on an **8,000×** clock so the move is visible in a short demo. Catch-up is capped at six simulated hours
- MEZO emissions. The APR is quoted. The book does not mint MEZO
- The epoch log, stored in `localStorage` under `epochswitch.v2`

Mock economics follow the [MUSD Savings Vault](https://mezo.org/docs/users/mezo-earn/vaults/musd-savings-vault/) tradeoff: unstaked sMUSD accrues the fee; staked sMUSD freezes its MUSD value and gives that fee up. Unstaking returns shares at the new rate, so the missed fee does not come back.

No vault or gauge transaction is ever sent.

## Scope

In: connect, positions, book actions, rates, policy, epoch decision, log.

Out: CDP mint, leverage, a custom AMM, bridge, KYB, and any video render.

See `SCRIPT.md` for a two-to-three minute walkthrough, and `/workspace/competitions/mezo/BUILD-STATUS.md` for status.

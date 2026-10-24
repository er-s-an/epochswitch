# EpochSwitch · 2–3 minute demo script

Spoken walkthrough of the local app. No render. Open `npm run dev` and, if a previous session is still in the browser, click **Reset simulated book** so the seed is visible: about 12,500 idle MUSD, 4,200 vault sMUSD, 1,800 staked sMUSD.

**0:00 — The choice**
“Idle MUSD can sit in the savings vault as sMUSD and earn the protocol fee, or it can be staked in the gauge for MEZO. Staking gives the fee up. EpochSwitch picks one each epoch and writes it down.”
Point at the MOCK / LIVE banner. “Vault, gauge, APRs, and the log are simulated. Wallet connect and the MUSD balance read are Mezo testnet.”

**0:25 — The book**
Point at Positions. “Idle is the cash. Vault sMUSD is the hold path. Staked sMUSD is frozen — that gap is fee yield already redirected. The exchange rate on the right is creeping, which is the fee.”

**0:50 — A manual move**
Deposit 250 MUSD. “That mints sMUSD at today’s rate and lands in the epoch log. No transaction.”

**1:05 — The policy**
“Spend reserve stays idle. Max stake caps how much of the savings value may sit in the gauge. Right now the gauge APR is 14.8% and the hold fee is 5.2%, so the simulated read is MIXED 60%.”
Click **Run epoch decision**. Read the row. Click **Apply last decision**. “Idle falls to the 10,000 reserve. Sixty percent of savings value is in the gauge. The rest keeps earning the fee.”

**1:45 — Kill switch**
Turn the kill switch on. “The read flips to HOLD even though emissions are still higher. The agent must unstake.”
Run the epoch, then apply. “Gauge goes to zero. The shares that come back are slightly fewer, because the fee they missed does not return.”

**2:15 — The other way**
Turn the kill switch off and set the gauge APR below the hold APR, inside the 0.25 point band. “Now it holds on the numbers, not the kill switch.”
Run once more so the log shows both reasons.

**2:40 — Close**
“The log is in this browser. Connect a wallet if you want the real testnet MUSD balance. The savings vault on testnet is still unpublished, so the book stays a simulation.”

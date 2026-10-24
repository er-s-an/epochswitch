import { defineChain } from 'viem'

/** Mezo testnet. Verified 2026-10-19: eth_chainId 0x7b7b = 31611, MUSD decimals() = 18. */
export const mezoTestnet = defineChain({
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.test.mezo.org'],
      webSocket: ['wss://rpc-ws.test.mezo.org'],
    },
  },
  blockExplorers: {
    default: { name: 'Mezo Explorer', url: 'https://explorer.test.mezo.org' },
  },
  testnet: true,
})

/** Real testnet MUSD from the Mezo contracts reference. */
export const MUSD_TESTNET = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503' as const

/**
 * Mainnet addresses kept as reference only. This demo does not call them.
 * The public contracts reference lists testnet MUSD and does not publish a
 * testnet MUSD Savings Vault, sMUSD receipt, or savings gauge.
 */
export const MEZO_MAINNET_REFERENCE = '0x7B7c000000000000000000000000000000000001' as const
export const MAINNET_SAVINGS_VAULT_REFERENCE =
  '0xb4D498029af77680cD1eF828b967f010d06C51CC' as const

export const MOCK_MODE = true

export const MUSD_EXPLORER = `https://explorer.test.mezo.org/token/${MUSD_TESTNET}`

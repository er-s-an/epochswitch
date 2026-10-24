import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { mezoTestnet } from './chain'

/**
 * WalletConnect project id is optional. Injected wallets work without one.
 * Set VITE_WC_PROJECT_ID for a WalletConnect QR from cloud.reown.com.
 */
const projectId =
  (import.meta.env.VITE_WC_PROJECT_ID as string | undefined) ||
  'epochswitch_demo_placeholder_project_id'

export const wagmiConfig = getDefaultConfig({
  appName: 'EpochSwitch',
  projectId,
  chains: [mezoTestnet],
  transports: {
    [mezoTestnet.id]: http('https://rpc.test.mezo.org'),
  },
  ssr: false,
})

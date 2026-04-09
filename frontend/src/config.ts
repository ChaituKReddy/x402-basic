import { baseSepolia } from "viem/chains";
import { createConfig, http, injected } from "wagmi";
import { metaMask } from "wagmi/connectors";

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [metaMask(), injected()],
  transports: {
    [baseSepolia.id]: http(),
  },
});

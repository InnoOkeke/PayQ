import { http, createConfig, injected } from "wagmi";
import { qdayAevumTestnet, AEVUM_CONFIG } from "@/lib/aevum/config";

export const SUPPORTED_EVM_CHAINS = [qdayAevumTestnet] as const;

export const wagmiConfig = createConfig({
  chains: [qdayAevumTestnet],
  connectors: [injected()],
  transports: {
    [qdayAevumTestnet.id]: http(AEVUM_CONFIG.rpcUrl),
  },
  ssr: true,
});

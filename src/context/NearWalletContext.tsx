"use client";

import { useWallet, WalletProvider } from "@/context/WalletContext";

export const NearWalletProvider = WalletProvider;

export function useNearWallet() {
  const wallet = useWallet();
  return {
    ...wallet,
    sendNearPayment: wallet.sendTusd8Payment,
    sendChainSignaturePayment: wallet.sendTusd8Payment,
  };
}

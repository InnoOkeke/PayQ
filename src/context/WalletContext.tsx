"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useReadContract,
  useWriteContract,
  useSendTransaction,
  useSwitchChain,
  usePublicClient,
} from "wagmi";
import { parseUnits, formatUnits, parseEther } from "viem";
import {
  AEVUM_CONFIG,
  AEVUM_CHAIN_ID,
  ERC20_ABI,
  PAYQ_REGISTRY_ABI,
  qdayAevumTestnet,
} from "@/lib/aevum/config";

interface WalletContextType {
  accountId: string | null;
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  chainId: number | undefined;
  balance: string; // tUSD8 balance formatted
  nativeBalance: string; // tQDAY gas balance formatted
  networkId: string;
  isFetchingBalance: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchToAevum: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  sendTusd8Payment: (
    recipient: string,
    amount: string,
    invoiceRef?: string,
    expectedName?: string
  ) => Promise<string>;
  sendNativePayment: (recipient: string, amount: string) => Promise<string>;
  registerPayeeOnChain: (
    payeeAddress: string,
    legalName: string,
    paymentId: string
  ) => Promise<string | null>;
  updateGuardrailsOnChain: (
    maxSingleTxTusd8: number,
    dailyCapTusd8: number,
    paused: boolean
  ) => Promise<string | null>;
  setPausedOnChain: (paused: boolean) => Promise<string | null>;
}

const WalletContext = createContext<WalletContextType>({
  accountId: null,
  address: undefined,
  isConnected: false,
  isConnecting: false,
  isWrongNetwork: false,
  chainId: undefined,
  balance: "0.00",
  nativeBalance: "0.00",
  networkId: AEVUM_CONFIG.networkName,
  isFetchingBalance: false,
  connect: async () => {},
  disconnect: async () => {},
  switchToAevum: async () => {},
  refreshBalance: async () => {},
  sendTusd8Payment: async () => "",
  sendNativePayment: async () => "",
  registerPayeeOnChain: async () => null,
  updateGuardrailsOnChain: async () => null,
  setPausedOnChain: async () => null,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient({ chainId: AEVUM_CHAIN_ID });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const isWrongNetwork = Boolean(isConnected && chainId && chainId !== AEVUM_CHAIN_ID);

  // Native tQDAY balance
  const {
    data: nativeBalData,
    refetch: refetchNative,
    isLoading: loadingNative,
  } = useBalance({
    address,
    chainId: AEVUM_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  // tUSD8 ERC-20 balance (6 decimals)
  const {
    data: tusd8BalRaw,
    refetch: refetchTusd8,
    isLoading: loadingTusd8,
  } = useReadContract({
    address: AEVUM_CONFIG.tusd8Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: AEVUM_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const balance =
    tusd8BalRaw !== undefined
      ? Number(formatUnits(tusd8BalRaw as bigint, AEVUM_CONFIG.tusd8Decimals)).toFixed(2)
      : "0.00";

  const nativeBalance = nativeBalData
    ? Number(formatUnits(nativeBalData.value, nativeBalData.decimals)).toFixed(4)
    : "0.0000";

  const switchToAevum = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: AEVUM_CHAIN_ID });
    } catch {
      // Fallback: prompt MetaMask / injected wallet to add QDay Aevum Testnet
      if (typeof window !== "undefined" && (window as any).ethereum) {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: AEVUM_CONFIG.chainIdHex,
              chainName: qdayAevumTestnet.name,
              nativeCurrency: qdayAevumTestnet.nativeCurrency,
              rpcUrls: [AEVUM_CONFIG.rpcUrl],
              blockExplorerUrls: [AEVUM_CONFIG.explorerUrl],
            },
          ],
        });
      }
    }
  }, [switchChainAsync]);

  useEffect(() => {
    if (isWrongNetwork) {
      switchToAevum().catch(() => {});
    }
  }, [isWrongNetwork, switchToAevum]);

  const connect = useCallback(async () => {
    const connector = connectors[0];
    if (!connector) {
      throw new Error("No EVM wallet found. Please install MetaMask or an EVM wallet extension.");
    }
    await connectAsync({ connector });
    await switchToAevum().catch(() => {});
  }, [connectors, connectAsync, switchToAevum]);

  const disconnect = useCallback(async () => {
    await disconnectAsync();
  }, [disconnectAsync]);

  const refreshBalance = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchNative(), refetchTusd8()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchNative, refetchTusd8]);

  const sendTusd8Payment = useCallback(
    async (
      recipient: string,
      amount: string,
      invoiceRef = "",
      expectedName = ""
    ): Promise<string> => {
      if (!address) throw new Error("Wallet not connected");
      if (isWrongNetwork) await switchToAevum();

      const parsedAmount = parseUnits(amount, AEVUM_CONFIG.tusd8Decimals);
      const registryAddr = AEVUM_CONFIG.payqRegistryAddress;

      // If PayQRegistry is deployed & configured, settle via CoP-enforced contract
      if (registryAddr && registryAddr.startsWith("0x") && registryAddr.length === 42) {
        if (publicClient) {
          const allowance = (await publicClient.readContract({
            address: AEVUM_CONFIG.tusd8Address,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address, registryAddr],
          })) as bigint;

          if (allowance < parsedAmount) {
            const approveHash = await writeContractAsync({
              address: AEVUM_CONFIG.tusd8Address,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [registryAddr, parsedAmount],
              chainId: AEVUM_CHAIN_ID,
            });
            await publicClient.waitForTransactionReceipt({ hash: approveHash });
          }
        }

        const txHash = await writeContractAsync({
          address: registryAddr,
          abi: PAYQ_REGISTRY_ABI,
          functionName: "payInvoice",
          args: [recipient as `0x${string}`, parsedAmount, invoiceRef, expectedName],
          chainId: AEVUM_CHAIN_ID,
        });
        await refreshBalance();
        return txHash;
      }

      // Direct tUSD8 ERC-20 transfer on QDay Aevum Testnet
      const txHash = await writeContractAsync({
        address: AEVUM_CONFIG.tusd8Address,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipient as `0x${string}`, parsedAmount],
        chainId: AEVUM_CHAIN_ID,
      });
      await refreshBalance();
      return txHash;
    },
    [address, isWrongNetwork, switchToAevum, publicClient, writeContractAsync, refreshBalance]
  );

  const sendNativePayment = useCallback(
    async (recipient: string, amount: string): Promise<string> => {
      if (!address) throw new Error("Wallet not connected");
      if (isWrongNetwork) await switchToAevum();

      const hash = await sendTransactionAsync({
        to: recipient as `0x${string}`,
        value: parseEther(amount),
        chainId: AEVUM_CHAIN_ID,
      });
      await refreshBalance();
      return hash;
    },
    [address, isWrongNetwork, switchToAevum, sendTransactionAsync, refreshBalance]
  );

  const registerPayeeOnChain = useCallback(
    async (
      payeeAddress: string,
      legalName: string,
      paymentId: string
    ): Promise<string | null> => {
      const registryAddr = AEVUM_CONFIG.payqRegistryAddress;
      if (!registryAddr || !registryAddr.startsWith("0x")) return null;
      if (isWrongNetwork) await switchToAevum();

      return writeContractAsync({
        address: registryAddr,
        abi: PAYQ_REGISTRY_ABI,
        functionName: "registerPayee",
        args: [payeeAddress as `0x${string}`, legalName, paymentId],
        chainId: AEVUM_CHAIN_ID,
      });
    },
    [isWrongNetwork, switchToAevum, writeContractAsync]
  );

  const updateGuardrailsOnChain = useCallback(
    async (
      maxSingleTxTusd8: number,
      dailyCapTusd8: number,
      paused: boolean
    ): Promise<string | null> => {
      const registryAddr = AEVUM_CONFIG.payqRegistryAddress;
      if (!registryAddr || !registryAddr.startsWith("0x")) return null;
      if (isWrongNetwork) await switchToAevum();

      const txHash = await writeContractAsync({
        address: registryAddr,
        abi: PAYQ_REGISTRY_ABI,
        functionName: "updateGuardrails",
        args: [
          parseUnits(String(maxSingleTxTusd8), AEVUM_CONFIG.tusd8Decimals),
          parseUnits(String(dailyCapTusd8), AEVUM_CONFIG.tusd8Decimals),
          paused,
        ],
        chainId: AEVUM_CHAIN_ID,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }
      return txHash;
    },
    [isWrongNetwork, switchToAevum, writeContractAsync, publicClient]
  );

  const setPausedOnChain = useCallback(
    async (paused: boolean): Promise<string | null> => {
      const registryAddr = AEVUM_CONFIG.payqRegistryAddress;
      if (!registryAddr || !registryAddr.startsWith("0x")) return null;
      if (isWrongNetwork) await switchToAevum();

      const txHash = await writeContractAsync({
        address: registryAddr,
        abi: PAYQ_REGISTRY_ABI,
        functionName: "setPaused",
        args: [paused],
        chainId: AEVUM_CHAIN_ID,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }
      return txHash;
    },
    [isWrongNetwork, switchToAevum, writeContractAsync, publicClient]
  );

  return (
    <WalletContext.Provider
      value={{
        accountId: address || null,
        address,
        isConnected,
        isConnecting,
        isWrongNetwork,
        chainId,
        balance,
        nativeBalance,
        networkId: AEVUM_CONFIG.networkName,
        isFetchingBalance: loadingNative || loadingTusd8 || isRefreshing,
        connect,
        disconnect,
        switchToAevum,
        refreshBalance,
        sendTusd8Payment,
        sendNativePayment,
        registerPayeeOnChain,
        updateGuardrailsOnChain,
        setPausedOnChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}

import { defineChain, isAddress, parseAbi } from "viem";

export const AEVUM_CHAIN_ID = 44005;

export const qdayAevumTestnet = defineChain({
  id: AEVUM_CHAIN_ID,
  name: "QDay Aevum Testnet",
  nativeCurrency: {
    name: "Test QDay",
    symbol: "tQDAY",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_AEVUM_RPC_URL || "https://rpc-test.qday.info"],
      webSocket: ["wss://rpc-test.qday.info"],
    },
  },
  blockExplorers: {
    default: {
      name: "QDay Aevum Explorer",
      url: process.env.NEXT_PUBLIC_AEVUM_EXPLORER_URL || "https://explorer-test.qday.info",
    },
  },
  testnet: true,
});

export const AEVUM_CONFIG = {
  chainId: AEVUM_CHAIN_ID,
  chainIdHex: "0xABE5",
  networkName: "QDay Aevum Testnet",
  rpcUrl: process.env.NEXT_PUBLIC_AEVUM_RPC_URL || "https://rpc-test.qday.info",
  wsUrl: "wss://rpc-test.qday.info",
  explorerUrl: process.env.NEXT_PUBLIC_AEVUM_EXPLORER_URL || "https://explorer-test.qday.info",
  faucetUrl: "https://faucet.qday.info",
  faucetContractAddress: "0xE5074CBbd046AFb491EB8692abD6cF7ECCC6dEE5" as `0x${string}`,
  tusd8Address: (process.env.NEXT_PUBLIC_TUSD8_ADDRESS ||
    "0x456569838f1d43009A91ebA4263147Afd7233483") as `0x${string}`,
  tusd8Decimals: 6,
  tusd8Symbol: "tUSD8",
  nativeSymbol: "tQDAY",
  nativeDecimals: 18,
  payqRegistryAddress: (process.env.NEXT_PUBLIC_PAYQ_REGISTRY_ADDRESS ||
    "0x6e9ba39CedDa49eb2647Aef28ae30da9B005fc21") as `0x${string}` | "",
};

export const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

export const PAYQ_REGISTRY_ABI = parseAbi([
  "function registerPayee(address payee, string legalName, string paymentId)",
  "function verifyPayee(address payee, string expectedName) view returns (string status, string registeredName, uint8 trustScore)",
  "function payInvoice(address payee, uint256 amount, string invoiceRef, string expectedName)",
  "function updateGuardrails(uint256 _maxSingleTxAmount, uint256 _dailyVelocityCap, bool _paused)",
  "function setPaused(bool _paused)",
  "function maxSingleTxAmount() view returns (uint256)",
  "function dailyVelocityCap() view returns (uint256)",
  "function paused() view returns (bool)",
  "function owner() view returns (address)",
  "function windowSpent(address account) view returns (uint256)",
]);

export function isValidAevumAddress(addr: string): addr is `0x${string}` {
  return isAddress(addr.trim());
}

export function explorerTxUrl(txHash: string): string {
  return `${AEVUM_CONFIG.explorerUrl}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${AEVUM_CONFIG.explorerUrl}/address/${address}`;
}

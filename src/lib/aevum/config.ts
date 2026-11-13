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
    "0xD64086b23C7d4499C0FD7524a47E404994097BA0") as `0x${string}` | "",
  erc8004RegistryAddress: (process.env.NEXT_PUBLIC_ERC8004_REGISTRY_ADDRESS ||
    "0x8BaB5415A1b8949F659F632012c8f222978d11d0") as `0x${string}`,
  erc8004AgentId: 1,
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
  "function getGuardrails(address wallet) view returns (uint256 _maxSingleTxAmount, uint256 _dailyVelocityCap, bool _paused, bool _configured)",
  "function updateMyGuardrails(uint256 _maxSingleTxAmount, uint256 _dailyVelocityCap, bool _paused)",
  "function setMyPaused(bool _paused)",
  "function updateGuardrails(uint256 _maxSingleTxAmount, uint256 _dailyVelocityCap, bool _paused)",
  "function setPaused(bool _paused)",
  "function maxSingleTxAmount() view returns (uint256)",
  "function dailyVelocityCap() view returns (uint256)",
  "function paused() view returns (bool)",
  "function owner() view returns (address)",
  "function windowSpent(address account) view returns (uint256)",
]);

export const ERC8004_REGISTRY_ABI = parseAbi([
  "function register(string agentURI) returns (uint256 agentId)",
  "function ownerOf(uint256 agentId) view returns (address)",
  "function tokenURI(uint256 agentId) view returns (string)",
  "function getAgentWallet(uint256 agentId) view returns (address)",
  "function totalAgents() view returns (uint256)",
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string feedbackURI, bytes32 feedbackHash)",
  "function getSummary(uint256 agentId) view returns (uint64 count, int128 averageValue, uint8 decimals)",
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

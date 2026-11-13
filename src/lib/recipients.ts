import { prisma } from "@/lib/prisma";

export interface CounterpartyRecord {
  id: string;
  displayName: string;
  paymentId: string;
  walletAddress: string; // Primary tUSD8 identifier
  evmAddress?: string; // Base / Ethereum / Arbitrum
  bitcoinAddress?: string; // Bitcoin native (SegWit / Taproot)
  solanaAddress?: string; // Solana
  xrpAddress?: string; // Ripple XRP
  cosmosAddress?: string; // Cosmos Hub
  stacksAddress?: string; // Stacks Bitcoin L2
  stellarAddress?: string; // Stellar
  verificationStatus: "VERIFIED" | "WARNING" | "UNVERIFIED" | "MISMATCH";
  notes?: string;
  createdAt: string;
}

// Global in-memory & file-compatible store for server lifetime
declare global {
  var __PayQ_recipients: CounterpartyRecord[] | undefined;
}

const DEFAULT_RECIPIENTS: CounterpartyRecord[] = [];

function getStore(): CounterpartyRecord[] {
  if (!globalThis.__PayQ_recipients) {
    globalThis.__PayQ_recipients = [...DEFAULT_RECIPIENTS];
  }
  return globalThis.__PayQ_recipients;
}

export function detectChainFromAddress(addr: string): {
  chain: string;
  rail: string;
  currency: string;
} {
  const clean = addr.trim();

  // QDay Aevum / EVM
  if (/^0x[a-fA-F0-9]{40}$/.test(clean)) {
    return {
      chain: "QDay Aevum Testnet (EVM)",
      rail: "QDay Aevum (tUSD8 / ERC-20)",
      currency: "tUSD8",
    };
  }

  // Bitcoin (SegWit, Taproot, Legacy)
  if (/^(bc1|[13]|tb1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(clean)) {
    return {
      chain: "Bitcoin",
      rail: "PayQRegistry CoP (MPC)",
      currency: "BTC",
    };
  }

  // Solana (Base58, 32-44 characters)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean) && !clean.includes(".")) {
    return {
      chain: "Solana",
      rail: "tUSD8 Intent Solver (Model A)",
      currency: "SOL / USDC",
    };
  }

  // Ripple / XRP (Starts with r, 25-35 base58 characters)
  if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(clean)) {
    return {
      chain: "Ripple (XRP)",
      rail: "tUSD8 Intent Solver (Model A)",
      currency: "XRP",
    };
  }

  // Cosmos Hub (Starts with cosmos1)
  if (/^cosmos1[a-z0-9]{38,45}$/.test(clean)) {
    return {
      chain: "Cosmos",
      rail: "tUSD8 Intent Solver (Model A)",
      currency: "ATOM",
    };
  }

  // Stacks Bitcoin L2 (Starts with SP or ST)
  if (/^S[PT][a-zA-Z0-9]{28,42}$/.test(clean)) {
    return {
      chain: "Stacks (Bitcoin L2)",
      rail: "tUSD8 Intent Solver (Model A)",
      currency: "STX",
    };
  }

  // Stellar (Starts with G, exactly 56 chars)
  if (/^G[A-Z2-7]{55}$/.test(clean)) {
    return {
      chain: "Stellar",
      rail: "tUSD8 Intent Solver (Model A)",
      currency: "XLM",
    };
  }

  // QDay Aevum
  return {
    chain: "QDay Aevum",
    rail: "QDay Aevum",
    currency: "tUSD8",
  };
}

export async function listAllRecipients(): Promise<CounterpartyRecord[]> {
  const store = getStore();

  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
    try {
      const dbRecipients = await prisma.recipient.findMany({
        orderBy: { createdAt: "desc" },
      });
      if (dbRecipients && dbRecipients.length > 0) {
        // Merge DB with store
        const merged: CounterpartyRecord[] = dbRecipients.map((r: any) => ({
          id: r.id,
          displayName: r.displayName,
          paymentId: r.paymentId,
          walletAddress: r.walletAddress,
          evmAddress: r.evmAddress || undefined,
          bitcoinAddress: r.bitcoinAddress || undefined,
          solanaAddress: r.solanaAddress || undefined,
          xrpAddress: r.xrpAddress || undefined,
          cosmosAddress: r.cosmosAddress || undefined,
          stacksAddress: r.stacksAddress || undefined,
          stellarAddress: r.stellarAddress || undefined,
          verificationStatus: r.verificationStatus as any,
          notes: r.notes || "",
          createdAt: r.createdAt.toISOString(),
        }));

        // Add any store records not in DB
        for (const item of store) {
          if (!merged.some((m) => m.walletAddress.toLowerCase() === item.walletAddress.toLowerCase())) {
            merged.push(item);
          }
        }
        return merged;
      }
    } catch (e) {
      // Prisma failed, fallback to store
    }
  }

  return store;
}

export async function addCounterparty(data: {
  displayName: string;
  paymentId: string;
  walletAddress: string;
  evmAddress?: string;
  bitcoinAddress?: string;
  solanaAddress?: string;
  xrpAddress?: string;
  cosmosAddress?: string;
  stacksAddress?: string;
  stellarAddress?: string;
  notes?: string;
  verificationStatus?: "VERIFIED" | "WARNING" | "UNVERIFIED" | "MISMATCH";
}): Promise<CounterpartyRecord> {
  const store = getStore();
  const cleanAddr = data.walletAddress.trim().toLowerCase();
  const cleanPaymentId = data.paymentId.trim().toLowerCase();

  const newRecord: CounterpartyRecord = {
    id: `rec-${Date.now()}`,
    displayName: data.displayName.trim(),
    paymentId: cleanPaymentId,
    walletAddress: cleanAddr,
    evmAddress: data.evmAddress ? data.evmAddress.trim() : undefined,
    bitcoinAddress: data.bitcoinAddress ? data.bitcoinAddress.trim() : undefined,
    solanaAddress: data.solanaAddress ? data.solanaAddress.trim() : undefined,
    xrpAddress: data.xrpAddress ? data.xrpAddress.trim() : undefined,
    cosmosAddress: data.cosmosAddress ? data.cosmosAddress.trim() : undefined,
    stacksAddress: data.stacksAddress ? data.stacksAddress.trim() : undefined,
    stellarAddress: data.stellarAddress ? data.stellarAddress.trim() : undefined,
    verificationStatus: data.verificationStatus || "VERIFIED",
    notes: data.notes || "Attested corporate counterparty in PayQ Directory.",
    createdAt: new Date().toISOString(),
  };

  // Upsert in memory store
  const existingIndex = store.findIndex(
    (r) =>
      r.walletAddress.toLowerCase() === cleanAddr ||
      r.paymentId.toLowerCase() === cleanPaymentId ||
      (newRecord.evmAddress && r.evmAddress?.toLowerCase() === newRecord.evmAddress.toLowerCase()) ||
      (newRecord.solanaAddress && r.solanaAddress?.toLowerCase() === newRecord.solanaAddress.toLowerCase())
  );
  if (existingIndex >= 0) {
    store[existingIndex] = { ...store[existingIndex], ...newRecord };
  } else {
    store.unshift(newRecord);
  }

  // Also sync to DB if DATABASE_URL is available
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
    try {
      await prisma.recipient.upsert({
        where: { paymentId: cleanPaymentId },
        update: {
          displayName: newRecord.displayName,
          walletAddress: cleanAddr,
          evmAddress: newRecord.evmAddress,
          bitcoinAddress: newRecord.bitcoinAddress,
          solanaAddress: newRecord.solanaAddress,
          xrpAddress: newRecord.xrpAddress,
          cosmosAddress: newRecord.cosmosAddress,
          stacksAddress: newRecord.stacksAddress,
          stellarAddress: newRecord.stellarAddress,
          verificationStatus: newRecord.verificationStatus,
          notes: newRecord.notes,
        },
        create: {
          displayName: newRecord.displayName,
          paymentId: cleanPaymentId,
          walletAddress: cleanAddr,
          evmAddress: newRecord.evmAddress,
          bitcoinAddress: newRecord.bitcoinAddress,
          solanaAddress: newRecord.solanaAddress,
          xrpAddress: newRecord.xrpAddress,
          cosmosAddress: newRecord.cosmosAddress,
          stacksAddress: newRecord.stacksAddress,
          stellarAddress: newRecord.stellarAddress,
          verificationStatus: newRecord.verificationStatus,
          notes: newRecord.notes,
        },
      });
    } catch (e) {
      console.warn("Could not save to DB, persisted to memory store:", e);
    }
  }

  return newRecord;
}

export async function findCounterparty(cleanAddress: string, paymentId?: string): Promise<CounterpartyRecord | null> {
  const all = await listAllRecipients();
  const normalizedAddr = cleanAddress.trim();
  const lowerAddr = normalizedAddr.toLowerCase();

  // 1. Direct tUSD8 address match
  let match = all.find((r) => r.walletAddress.toLowerCase() === lowerAddr);
  if (match) return match;

  // 2. EVM address match
  if (lowerAddr.startsWith("0x")) {
    match = all.find((r) => r.evmAddress && r.evmAddress.toLowerCase() === lowerAddr);
    if (match) return match;
    match = all.find((r) => r.walletAddress.toLowerCase() === lowerAddr);
    if (match) return match;
  }

  // 3. Bitcoin address match
  match = all.find((r) => r.bitcoinAddress && r.bitcoinAddress.toLowerCase() === lowerAddr);
  if (match) return match;

  // 4. Solana address match (case-sensitive Base58)
  match = all.find((r) => r.solanaAddress && r.solanaAddress === normalizedAddr);
  if (match) return match;

  // 5. Ripple XRP match
  match = all.find((r) => r.xrpAddress && r.xrpAddress === normalizedAddr);
  if (match) return match;

  // 6. Cosmos match
  match = all.find((r) => r.cosmosAddress && r.cosmosAddress.toLowerCase() === lowerAddr);
  if (match) return match;

  // 7. Stacks match
  match = all.find((r) => r.stacksAddress && r.stacksAddress === normalizedAddr);
  if (match) return match;

  // 8. Stellar match
  match = all.find((r) => r.stellarAddress && r.stellarAddress === normalizedAddr);
  if (match) return match;

  // 9. Handle common tUSD8 typo like .tesnet -> .testnet
  if (lowerAddr.endsWith(".tesnet")) {
    const fixed = lowerAddr.replace(/\.tesnet$/, ".testnet");
    match = all.find((r) => r.walletAddress.toLowerCase() === fixed);
    if (match) return match;
  }

  // 10. If address has no extension, check if appending .testnet matches
  if (!lowerAddr.includes(".") && !lowerAddr.startsWith("0x")) {
    const withTestnet = `${lowerAddr}.testnet`;
    match = all.find((r) => r.walletAddress.toLowerCase() === withTestnet);
    if (match) return match;
  }

  // 11. PaymentId match
  if (paymentId) {
    const normalizedPid = paymentId.trim().toLowerCase();
    match = all.find((r) => r.paymentId.toLowerCase() === normalizedPid);
    if (match) return match;
  }

  // 12. Display name match
  match = all.find((r) => r.displayName.toLowerCase() === lowerAddr);
  if (match) return match;

  return null;
}

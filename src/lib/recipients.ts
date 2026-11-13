import { prisma } from "@/lib/prisma";

export interface CounterpartyRecord {
  id: string;
  displayName: string;
  paymentId: string;
  walletAddress: string; // QDay Aevum 0x address
  verificationStatus: "VERIFIED" | "WARNING" | "UNVERIFIED" | "MISMATCH";
  notes?: string;
  createdAt: string;
}

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

export function detectChainFromAddress(_addr: string): {
  chain: string;
  rail: string;
  currency: string;
} {
  return {
    chain: "QDay Aevum Testnet (Chain ID 44005)",
    rail: "PayQRegistry (tUSD8)",
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
        const merged: CounterpartyRecord[] = dbRecipients.map((r: any) => ({
          id: r.id,
          displayName: r.displayName,
          paymentId: r.paymentId,
          walletAddress: r.walletAddress,
          verificationStatus: r.verificationStatus as any,
          notes: r.notes || "",
          createdAt: r.createdAt.toISOString(),
        }));

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
  notes?: string;
  verificationStatus?: "VERIFIED" | "WARNING" | "UNVERIFIED" | "MISMATCH";
}): Promise<CounterpartyRecord> {
  const store = getStore();
  const cleanAddr = data.walletAddress.trim();
  const cleanPaymentId = data.paymentId.trim().toLowerCase();

  const newRecord: CounterpartyRecord = {
    id: `rec-${Date.now()}`,
    displayName: data.displayName.trim(),
    paymentId: cleanPaymentId,
    walletAddress: cleanAddr,
    verificationStatus: data.verificationStatus || "VERIFIED",
    notes: data.notes || "Attested corporate counterparty on QDay Aevum Testnet.",
    createdAt: new Date().toISOString(),
  };

  const existingIndex = store.findIndex(
    (r) =>
      r.walletAddress.toLowerCase() === cleanAddr.toLowerCase() ||
      r.paymentId.toLowerCase() === cleanPaymentId
  );
  if (existingIndex >= 0) {
    store[existingIndex] = { ...store[existingIndex], ...newRecord };
  } else {
    store.unshift(newRecord);
  }

  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
    try {
      await prisma.recipient.upsert({
        where: { paymentId: cleanPaymentId },
        update: {
          displayName: newRecord.displayName,
          walletAddress: cleanAddr,
          verificationStatus: newRecord.verificationStatus,
          notes: newRecord.notes,
        },
        create: {
          displayName: newRecord.displayName,
          paymentId: cleanPaymentId,
          walletAddress: cleanAddr,
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
  const lowerAddr = cleanAddress.trim().toLowerCase();

  let match = all.find((r) => r.walletAddress.toLowerCase() === lowerAddr);
  if (match) return match;

  if (paymentId) {
    const normalizedPid = paymentId.trim().toLowerCase();
    match = all.find((r) => r.paymentId.toLowerCase() === normalizedPid);
    if (match) return match;
  }

  match = all.find((r) => r.displayName.toLowerCase() === lowerAddr);
  if (match) return match;

  return null;
}

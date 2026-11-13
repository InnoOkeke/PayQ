/**
 * Conversational Natural Language Intent Resolver for QDay Aevum Testnet
 *
 * Translates human prompts (e.g. "Pay polimaf 50 tUSD8") into verifiable
 * Aevum payment intents using the live Recipients directory (Neon DB)
 * and Treasury Policy evaluation.
 */

import {
  evaluatePaymentAgainstPolicy,
  calculateReputationScore,
  DEFAULT_TREASURY_POLICY,
} from "@/lib/treasury/policyEngine";
import type { CounterpartyRecord } from "@/lib/recipients";

export interface ResolvedIntent {
  rawPrompt: string;
  extractedAmount: number;
  extractedCurrency: string;
  recipientQuery: string;
  targetChain: string;
  memo: string;
  resolvedPayee: {
    displayName: string;
    accountId: string;
    targetChainAddress: string;
    verificationStatus: "VERIFIED" | "WARNING" | "UNVERIFIED" | "MISMATCH";
    reputationScore: number;
  };
  policyCheck: {
    isAllowed: boolean;
    autoExecutable: boolean;
    requiresHumanSignoff: boolean;
    riskTier: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    violations: string[];
    warnings: string[];
  };
  settlementExecution: {
    sourceAccount: string;
    settlementRail: string;
  };
}

function extractRecipientQuery(clean: string): string {
  // 1. Direct 0x EVM address in prompt
  const evmMatch = clean.match(/0x[a-fA-F0-9]{40}/);
  if (evmMatch) return evmMatch[0];

  // 2. "to <recipient>" (e.g. "send money to polimaf", "send 50 tUSD8 to polimaf")
  const toMatch = clean.match(/\bto\s+([a-zA-Z0-9._-]+(?:\s+[a-zA-Z0-9._-]+)?)/i);
  if (toMatch) {
    return toMatch[1].replace(/\s+(?:on|for|with|via)\b.*$/i, "").trim();
  }

  // 3. "pay <recipient> <amount>"
  const payMatch = clean.match(/\bpay\s+([a-zA-Z0-9._-]+(?:\s+[a-zA-Z0-9._-]+)?)/i);
  if (payMatch) {
    const candidate = payMatch[1].replace(/\s+\d.*$/, "").trim();
    if (candidate && !/^\d/.test(candidate)) {
      return candidate;
    }
  }

  return "";
}

export function resolveNaturalLanguageIntent(
  prompt: string,
  senderAccount: string = "0x0000000000000000000000000000000000000000",
  knownRecipients: CounterpartyRecord[] = []
): ResolvedIntent {
  const clean = prompt.trim();
  const lower = clean.toLowerCase();

  let extractedAmount = 50;
  let extractedCurrency = "tUSD8";

  const amountMatch = clean.match(
    /(?:\$|usd\s*|tusd8\s*|tqday\s*)?(\d+(?:\.\d{1,2})?)\s*(tusd8|tqday|usd|\$)?/i
  );
  if (amountMatch) {
    extractedAmount = parseFloat(amountMatch[1]);
    extractedCurrency = lower.includes("tqday") ? "tQDAY" : "tUSD8";
  }

  const recipientQuery = extractRecipientQuery(clean);
  const queryLower = recipientQuery.toLowerCase();

  // Match against real Recipients directory (displayName, paymentId handle, or 0x walletAddress)
  let matched: CounterpartyRecord | undefined;
  if (queryLower) {
    matched = knownRecipients.find(
      (r) =>
        r.walletAddress.toLowerCase() === queryLower ||
        r.paymentId.toLowerCase() === queryLower ||
        r.displayName.toLowerCase() === queryLower ||
        r.displayName.toLowerCase().includes(queryLower) ||
        r.paymentId.toLowerCase().includes(queryLower)
    );
  }

  // Fallback: check if any recipient's name or paymentId appears anywhere in the prompt
  if (!matched) {
    matched = knownRecipients.find(
      (r) =>
        lower.includes(r.paymentId.toLowerCase()) ||
        lower.includes(r.displayName.toLowerCase()) ||
        lower.includes(r.walletAddress.toLowerCase())
    );
  }

  const isDirectAddress = /^0x[a-fA-F0-9]{40}$/.test(recipientQuery);
  const targetChainAddress =
    matched?.walletAddress || (isDirectAddress ? recipientQuery : "");

  const verificationStatus = matched ? matched.verificationStatus : "UNVERIFIED";
  const reputationScore = matched
    ? calculateReputationScore({
        verificationStatus: matched.verificationStatus,
        isOfficialPartner: matched.verificationStatus === "VERIFIED",
      })
    : 35;

  const policyCheck = evaluatePaymentAgainstPolicy(
    extractedAmount,
    "QDay Aevum Operations",
    reputationScore,
    verificationStatus,
    DEFAULT_TREASURY_POLICY,
    0,
    targetChainAddress || "0x0000000000000000000000000000000000000000",
    senderAccount
  );

  if (!targetChainAddress) {
    policyCheck.warnings.push(
      `Recipient "${recipientQuery || "unknown"}" was not found in your Recipients directory.`
    );
  }

  return {
    rawPrompt: prompt,
    extractedAmount,
    extractedCurrency,
    recipientQuery: matched?.displayName || recipientQuery || "Unknown Recipient",
    targetChain: "QDay Aevum Testnet",
    memo: `Aevum Settlement: ${prompt}`,
    resolvedPayee: {
      displayName: matched?.displayName || recipientQuery || "Unregistered Payee",
      accountId: targetChainAddress,
      targetChainAddress,
      verificationStatus,
      reputationScore,
    },
    policyCheck,
    settlementExecution: {
      sourceAccount: senderAccount,
      settlementRail: "QDay Aevum (tUSD8 / PayQRegistry)",
    },
  };
}

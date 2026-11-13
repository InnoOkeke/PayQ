/**
 * Conversational Natural Language Intent Resolver for QDay Aevum Testnet
 *
 * Translates human prompts (e.g. "Pay Acme Design 50 tUSD8 on Aevum")
 * into verifiable Aevum payment intents with Confirmation of Payee and Treasury Policy evaluation.
 */

import {
  evaluatePaymentAgainstPolicy,
  calculateReputationScore,
  DEFAULT_TREASURY_POLICY,
} from "@/lib/treasury/policyEngine";

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

const DIRECTORY_COUNTERPARTIES = [
  {
    displayName: "LeProf Consulting",
    paymentId: "leprof",
    evmAddress: "0x71C8360f3a8b417c805F99D4133A89f07447d251",
    verificationStatus: "VERIFIED" as const,
    isOfficialPartner: true,
    transactionCount: 19,
  },
  {
    displayName: "Acme Web3 Design Studio",
    paymentId: "acme-design",
    evmAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    verificationStatus: "VERIFIED" as const,
    isOfficialPartner: true,
    transactionCount: 14,
  },
  {
    displayName: "Satoshi Freelance Engineering",
    paymentId: "satoshi-dev",
    evmAddress: "0x1234567890123456789012345678901234567890",
    verificationStatus: "VERIFIED" as const,
    isOfficialPartner: false,
    transactionCount: 8,
  },
  {
    displayName: "John Kennedy",
    paymentId: "john-kennedy",
    evmAddress: "0x71C8360f3a8b417c805F99D4133A89f07447d251",
    verificationStatus: "VERIFIED" as const,
    isOfficialPartner: true,
    transactionCount: 8,
  },
];

export function resolveNaturalLanguageIntent(
  prompt: string,
  senderAccount: string = "0x0000000000000000000000000000000000000000"
): ResolvedIntent {
  const clean = prompt.trim();
  const lower = clean.toLowerCase();

  let extractedAmount = 50;
  let extractedCurrency = "tUSD8";

  const amountMatch = clean.match(
    /(?:\$|usd\s*|tusd8\s*|tqday\s*)?(\d+(?:\.\d{1,2})?)\s*(tusd8|tqday|usd|usdc|\$)?/i
  );
  if (amountMatch) {
    extractedAmount = parseFloat(amountMatch[1]);
    extractedCurrency = lower.includes("tqday") ? "tQDAY" : "tUSD8";
  }

  let recipientQuery = "Acme Web3 Design Studio";
  if (lower.includes("leprof")) {
    recipientQuery = "LeProf Consulting";
  } else if (lower.includes("acme")) {
    recipientQuery = "Acme Web3 Design Studio";
  } else if (lower.includes("satoshi")) {
    recipientQuery = "Satoshi Freelance Engineering";
  } else if (lower.includes("john") || lower.includes("kennedy")) {
    recipientQuery = "John Kennedy";
  } else {
    const toMatch = clean.match(/(?:to|pay)\s+([a-zA-Z0-9-_\.]+)/i);
    if (toMatch) {
      recipientQuery = toMatch[1];
    }
  }

  const matched = DIRECTORY_COUNTERPARTIES.find(
    (c) =>
      c.displayName.toLowerCase().includes(recipientQuery.toLowerCase()) ||
      c.paymentId.toLowerCase().includes(recipientQuery.toLowerCase()) ||
      c.evmAddress.toLowerCase() === recipientQuery.toLowerCase()
  );

  const verificationStatus = matched ? matched.verificationStatus : "UNVERIFIED";
  const reputationScore = matched ? calculateReputationScore(matched) : 35;
  const targetChainAddress =
    matched?.evmAddress ||
    (/^0x[a-fA-F0-9]{40}$/.test(recipientQuery)
      ? recipientQuery
      : "0x742d35Cc6634C0532925a3b844Bc454e4438f44e");

  const policyCheck = evaluatePaymentAgainstPolicy(
    extractedAmount,
    "QDay Aevum Operations",
    reputationScore,
    verificationStatus,
    DEFAULT_TREASURY_POLICY,
    180
  );

  return {
    rawPrompt: prompt,
    extractedAmount,
    extractedCurrency,
    recipientQuery,
    targetChain: "QDay Aevum Testnet",
    memo: `Aevum Settlement: ${prompt}`,
    resolvedPayee: {
      displayName: matched?.displayName || recipientQuery,
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

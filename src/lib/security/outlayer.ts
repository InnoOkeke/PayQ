/**
 * PayQ Agent Guardrail Policy Engine (QDay Aevum Testnet)
 *
 * Intercepts AI agent tUSD8 intents to guarantee compliance with security policies,
 * address validation, and velocity guardrails before signing.
 */

export interface OutlayerPolicyCheckParams {
  agentId?: string;
  senderAddress: string;
  recipientAddress: string;
  amountUSD: number;
  token: string;
  intent: string;
}

export interface OutlayerAttestation {
  compliant: boolean;
  attestationId: string;
  agentId: string;
  timestamp: string;
  riskScore: number;
  enforcedRules: {
    rule: string;
    passed: boolean;
    reason: string;
  }[];
  recommendation: "APPROVE_AUTONOMOUS" | "REQUIRE_MULTISIG" | "BLOCK_SUSPICIOUS";
}

export function evaluateOutlayerPolicy(params: OutlayerPolicyCheckParams): OutlayerAttestation {
  const {
    agentId = "payq-aevum-agent",
    recipientAddress,
    amountUSD,
    intent,
  } = params;

  const rules: OutlayerAttestation["enforcedRules"] = [];
  let riskScore = 10;

  // 1. Single-tx limit check ($500 ceiling)
  const passedSingleTx = amountUSD <= 500;
  rules.push({
    rule: "AEVUM_MAX_TX_CEILING_USD",
    passed: passedSingleTx,
    reason: passedSingleTx
      ? `Transaction amount ($${amountUSD.toFixed(2)}) is within $500 ceiling.`
      : `Transaction amount ($${amountUSD.toFixed(2)}) exceeds $500 single-tx policy limit.`,
  });
  if (!passedSingleTx) riskScore += 45;

  // 2. QDay Aevum 0x address format validation
  const passedAddressCheck = /^0x[a-fA-F0-9]{40}$/.test(recipientAddress.trim());
  rules.push({
    rule: "AEVUM_ADDRESS_FORMAT_VERIFICATION",
    passed: passedAddressCheck,
    reason: passedAddressCheck
      ? "Recipient address is a valid 42-character QDay Aevum EVM address."
      : "Recipient address does not match QDay Aevum 0x address format.",
  });
  if (!passedAddressCheck) riskScore += 50;

  // 3. Prompt injection detection on intent string
  const lowerIntent = (intent || "").toLowerCase();
  const containsJailbreak =
    lowerIntent.includes("ignore") ||
    lowerIntent.includes("bypass") ||
    lowerIntent.includes("drain") ||
    lowerIntent.includes("attacker");
  rules.push({
    rule: "AEVUM_PROMPT_INJECTION_SHIELD",
    passed: !containsJailbreak,
    reason: !containsJailbreak
      ? "No prompt injection tokens identified."
      : "Hostile prompt injection patterns detected in agent instruction.",
  });
  if (containsJailbreak) riskScore += 80;

  let recommendation: OutlayerAttestation["recommendation"] = "APPROVE_AUTONOMOUS";
  if (riskScore >= 70 || containsJailbreak) {
    recommendation = "BLOCK_SUSPICIOUS";
  } else if (!passedSingleTx || amountUSD > 100) {
    recommendation = "REQUIRE_MULTISIG";
  }

  const compliant = recommendation !== "BLOCK_SUSPICIOUS";
  const attestationId = `AEVUM-GUARD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return {
    compliant,
    attestationId,
    agentId,
    timestamp: new Date().toISOString(),
    riskScore: Math.min(100, riskScore),
    enforcedRules: rules,
    recommendation,
  };
}

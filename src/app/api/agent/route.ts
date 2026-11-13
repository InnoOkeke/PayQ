import { NextRequest, NextResponse } from "next/server";
import { evaluateOutlayerPolicy } from "@/lib/security/outlayer";
import { buildSputnikTransferProposal } from "@/lib/treasury/sputnikDao";
import { resolveNaturalLanguageIntent } from "@/lib/aevum/intentResolver";
import { AEVUM_CONFIG } from "@/lib/aevum/config";

export const dynamic = "force-dynamic";

/**
 * PayQ Agent Endpoint (ERC-8004 Registration v1)
 *
 * Serves the ERC-8004 Trustless Agent registration JSON and executes
 * agent tool calls for Confirmation of Payee & QDay Aevum tUSD8 settlement.
 */
export async function GET() {
  return NextResponse.json({
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "PayQ — Autonomous Invoicing & Confirmation of Payee Agent",
    slug: "payq-ai",
    version: "1.0.0",
    active: true,
    protocol: "QDay Aevum (Chain ID 44005)",
    description:
      "Autonomous corporate invoicing, on-chain Confirmation of Payee verification, and multi-wallet Treasury Guardrails via PayQRegistry.sol.",
    author: "PayQ Team",
    registrations: [
      {
        agentId: AEVUM_CONFIG.erc8004AgentId,
        agentRegistry: `eip155:${AEVUM_CONFIG.chainId}:${AEVUM_CONFIG.erc8004RegistryAddress}`,
      },
    ],
    supportedTrust: ["reputation"],
    services: [
      {
        name: "MCP",
        endpoint: "https://payq-virid.vercel.app/api/agent/mcp",
        version: "1.0.0",
      },
      {
        name: "web",
        endpoint: "https://payq-virid.vercel.app",
      },
    ],
    pricing: {
      model: "FREE_TIER_WITH_GAS",
      settlementToken: "tUSD8",
    },
    integrations: {
      aevumTestnet: true,
      tusd8: true,
      payqRegistry: true,
      erc8004: true,
    },
    tools: [
      {
        name: "verify_payee",
        description:
          "Verifies a recipient QDay Aevum 0x address against PayQRegistry.sol Confirmation of Payee directory.",
        parameters: {
          accountId: {
            type: "string",
            description: "The recipient QDay Aevum 0x address",
          },
        },
      },
      {
        name: "resolve_intent",
        description:
          "Translates natural language prompts into verified QDay Aevum tUSD8 payment intents.",
        parameters: {
          prompt: {
            type: "string",
            description: "Plain-English intent e.g. 'Pay 50 tUSD8 to 0x...'",
          },
        },
      },
      {
        name: "guardrail_security_check",
        description:
          "Validates an AI agent tUSD8 transaction against single-tx ceilings, 24h velocity caps, and prompt-injection firewalls.",
        parameters: {
          senderAddress: { type: "string" },
          recipientAddress: { type: "string" },
          amountUSD: { type: "number" },
          intent: { type: "string" },
        },
      },
      {
        name: "registry_guardrail_payload",
        description:
          "Builds a PayQRegistry.sol tUSD8 transfer/guardrail payload on QDay Aevum Testnet (Chain ID 44005).",
        parameters: {
          daoContract: { type: "string" },
          description: { type: "string" },
          receiverId: { type: "string" },
          amountTusd8: { type: "number" },
        },
      },
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, params } = body;

    if (!tool) {
      return NextResponse.json({ error: "Missing 'tool' parameter" }, { status: 400 });
    }

    if (tool === "resolve_intent") {
      const intent = resolveNaturalLanguageIntent(
        params?.prompt || "",
        params?.senderAddress || "0x0000000000000000000000000000000000000000"
      );
      return NextResponse.json({ success: true, tool, result: intent });
    }

    if (tool === "guardrail_security_check" || tool === "outlayer_security_check") {
      const attestation = evaluateOutlayerPolicy({
        senderAddress: params?.senderAddress || "0x0000000000000000000000000000000000000000",
        recipientAddress: params?.recipientAddress || "0x0000000000000000000000000000000000000000",
        amountUSD: Number(params?.amountUSD || 0),
        token: params?.token || "tUSD8",
        intent: params?.intent || "External AI Agent tUSD8 Transfer",
      });
      return NextResponse.json({ success: true, tool, result: attestation });
    }

    if (tool === "registry_guardrail_payload" || tool === "sputnik_dao_escalate") {
      const proposal = buildSputnikTransferProposal({
        daoContract: params?.daoContract,
        description: params?.description || "Autonomous Agent tUSD8 Settlement",
        receiverId: params?.receiverId || "0x0000000000000000000000000000000000000000",
        amountNear: params?.amountTusd8 ?? params?.amountNear ?? "10",
      });
      return NextResponse.json({ success: true, tool, result: proposal });
    }

    return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

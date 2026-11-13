import { NextRequest, NextResponse } from "next/server";
import { evaluateOutlayerPolicy } from "@/lib/security/outlayer";
import { buildSputnikTransferProposal } from "@/lib/treasury/sputnikDao";
import { resolveNaturalLanguageIntent } from "@/lib/aevum/intentResolver";

export const dynamic = "force-dynamic";

/**
 * tUSD8 Agent Market Integration (market.PayQ AI)
 * Documentation: https://docs.market.PayQ AI/
 * 
 * Allows PayQ to be listed on tUSD8 Agent Market so other AI agents,
 * swarms, and Claude Desktop MCP clients can hire PayQ to verify counterparties,
 * extract invoices, and execute multi-chain intents safely on QDay Aevum.
 */

// GET returns the Agent Card / Manifest for market.PayQ AI
export async function GET() {
  return NextResponse.json({
    name: "PayQ — Autonomous Invoicing & Confirmation of Payee Agent",
    slug: "PayQ-ai",
    version: "1.0.0",
    protocol: "QDay Aevum",
    description:
      "Autonomous corporate invoicing, Confirmation of Payee payee verification, Aevum Multi-Sig treasury escalation, and cross-chain intent settlement via PayQRegistry CoP.",
    author: "PayQ Team",
    pricing: {
      model: "FREE_TIER_WITH_GAS",
      settlementToken: "tUSD8",
    },
    integrations: {
      aevumTestnet: true,
      tusd8: true,
      payqRegistry: true,
      aevumMultiSig: true,
    },
    tools: [
      {
        name: "verify_payee",
        description:
          "Query live QDay Aevum RPC (view_account) to verify account existence, counterparty reputation score, and typosquatting risk.",
        parameters: {
          accountId: { type: "string", description: "The recipient QDay Aevum Address (e.g. 0x742d35Cc6634C0532925a3b844Bc454e4438f44e)" },
        },
      },
      {
        name: "resolve_intent",
        description:
          "Translates natural language prompts into verified multi-chain payment intents executed via PayQRegistry CoP MPC.",
        parameters: {
          prompt: { type: "string", description: "Plain-English intent e.g. 'Send $50 to John Kennedy on Base'" },
        },
      },
      {
        name: "outlayer_security_check",
        description:
          "Validates an AI agent transaction against OutLayer spending ceilings, velocity meters, and prompt-injection firewalls.",
        parameters: {
          senderAddress: { type: "string" },
          recipientAddress: { type: "string" },
          amountUSD: { type: "number" },
          intent: { type: "string" },
        },
      },
      {
        name: "sputnik_dao_escalate",
        description:
          "Builds a Aevum Multi-Sig v2 on-chain proposal for corporate council multi-sig vote when payment exceeds autonomous limit.",
        parameters: {
          daoContract: { type: "string" },
          description: { type: "string" },
          receiverId: { type: "string" },
          amountNear: { type: "number" },
        },
      },
    ],
  });
}

// POST executes an agent tool call when hired on market.PayQ AI
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, params } = body;

    if (!tool) {
      return NextResponse.json({ error: "Missing 'tool' parameter" }, { status: 400 });
    }

    if (tool === "resolve_intent") {
      const intent = resolveNaturalLanguageIntent(params?.prompt || "", params?.senderAddress || "company.tUSD8");
      return NextResponse.json({ success: true, tool, result: intent });
    }

    if (tool === "outlayer_security_check") {
      const attestation = evaluateOutlayerPolicy({
        senderAddress: params?.senderAddress || "agent.tUSD8",
        recipientAddress: params?.recipientAddress || "vendor.tUSD8",
        amountUSD: Number(params?.amountUSD || 0),
        token: params?.token || "tUSD8",
        intent: params?.intent || "",
      });
      return NextResponse.json({ success: true, tool, result: attestation });
    }

    if (tool === "sputnik_dao_escalate") {
      const proposal = buildSputnikTransferProposal({
        daoContract: params?.daoContract,
        description: params?.description || "Invoice payment",
        receiverId: params?.receiverId,
        amountNear: params?.amountNear || 1,
      });
      return NextResponse.json({ success: true, tool, result: proposal });
    }

    return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


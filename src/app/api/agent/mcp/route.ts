import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Model Context Protocol (MCP) Server Definition
 * Allows Claude Desktop, Cursor, and Agent Market swarms to connect to PayQ.
 * Spec: https://modelcontextprotocol.io/
 */

export async function GET() {
  return NextResponse.json({
    mcpVersion: "1.0.0",
    serverInfo: {
      name: "PayQ-ai-mcp",
      title: "PayQ — Autonomous Invoicing & Confirmation of Payee",
      version: "1.0.0",
    },
    capabilities: {
      tools: {
        listChanged: false,
      },
      resources: {},
    },
    tools: [
      {
        name: "verify_near_payee",
        description:
          "Checks whether a recipient Aevum Address exists on-chain and verifies identity against the Confirmation of Payee registry.",
        inputSchema: {
          type: "object",
          properties: {
            accountId: {
              type: "string",
              description: "The Aevum Address (e.g. 0x742d35Cc6634C0532925a3b844Bc454e4438f44e or satoshi.tUSD8)",
            },
          },
          required: ["accountId"],
        },
      },
      {
        name: "evaluate_outlayer_policy",
        description:
          "Performs an OutLayer agent security check ensuring the proposed payment does not exceed velocity caps or violate prompt-injection defenses.",
        inputSchema: {
          type: "object",
          properties: {
            recipientAddress: { type: "string" },
            amountUSD: { type: "number" },
            category: { type: "string" },
          },
          required: ["recipientAddress", "amountUSD"],
        },
      },
      {
        name: "sputnik_dao_proposal",
        description:
          "Constructs a Aevum Multi-Sig / Trezu council transfer proposal when a payment exceeds autonomous limits.",
        inputSchema: {
          type: "object",
          properties: {
            receiverId: { type: "string" },
            amountNear: { type: "number" },
            description: { type: "string" },
          },
          required: ["receiverId", "amountNear"],
        },
      },
    ],
  });
}


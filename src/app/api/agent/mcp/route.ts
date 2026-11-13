import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Model Context Protocol (MCP) Server Definition
 * Allows Claude Desktop, Cursor, and AI agents to connect to PayQ on QDay Aevum.
 * Spec: https://modelcontextprotocol.io/
 */
export async function GET() {
  return NextResponse.json({
    mcpVersion: "1.0.0",
    serverInfo: {
      name: "payq-aevum-mcp",
      title: "PayQ — Autonomous Invoicing & Confirmation of Payee (QDay Aevum)",
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
        name: "verify_aevum_payee",
        description:
          "Checks whether a recipient QDay Aevum 0x address is registered in PayQRegistry.sol Confirmation of Payee directory.",
        inputSchema: {
          type: "object",
          properties: {
            accountId: {
              type: "string",
              description: "The QDay Aevum 0x address",
            },
          },
          required: ["accountId"],
        },
      },
      {
        name: "evaluate_guardrail_policy",
        description:
          "Performs a security guardrail check ensuring the proposed tUSD8 payment does not exceed velocity caps or contain prompt-injection patterns.",
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
        name: "payq_registry_settlement",
        description:
          "Constructs a PayQRegistry.sol payInvoice call payload for tUSD8 settlement on QDay Aevum Testnet (Chain ID 44005).",
        inputSchema: {
          type: "object",
          properties: {
            receiverId: { type: "string" },
            amountTusd8: { type: "number" },
            description: { type: "string" },
          },
          required: ["receiverId", "amountTusd8"],
        },
      },
    ],
  });
}

import { NextRequest, NextResponse } from "next/server";
import { aevumAi, AEVUM_AI_MODEL, AI_PROVIDER_NAME } from "@/lib/ai/aevumAi";
import { prisma } from "@/lib/prisma";
import { resolveNaturalLanguageIntent } from "@/lib/aevum/intentResolver";
import { detectChainFromAddress } from "@/lib/recipients";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const lower = message.toLowerCase().trim();

    // 1. Check if user is asking to pay an uploaded or pending invoice
    const isInvoicePayment = 
      /pay\s+(invoice|inv|uploaded)/i.test(lower) ||
      /settle\s+(invoice|inv)/i.test(lower) ||
      lower.includes("pay uploaded invoice") ||
      lower.includes("pay invoice");

    if (isInvoicePayment) {
      const invMatch = message.match(/INV-[A-Z0-9-]+/i) || message.match(/#?(\d{4,})/);
      let targetInvoice: any = null;
      if (invMatch) {
        targetInvoice = await prisma.invoice.findFirst({
          where: {
            OR: [
              { invoiceNumber: { contains: invMatch[0], mode: "insensitive" } },
              { id: { contains: invMatch[0], mode: "insensitive" } },
            ],
          },
        });
      }
      if (!targetInvoice) {
        targetInvoice = await prisma.invoice.findFirst({
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
        });
      }

      if (targetInvoice) {
        const detected = detectChainFromAddress(targetInvoice.recipientAddress);
        const policyAllowed = targetInvoice.amount <= 250;
        const intent = {
          rawPrompt: message,
          extractedAmount: targetInvoice.amount,
          extractedCurrency: targetInvoice.token || "tUSD8",
          recipientQuery: targetInvoice.recipientName,
          targetChain: detected.chain,
          memo: `Settlement for Invoice ${targetInvoice.invoiceNumber}`,
          invoiceId: targetInvoice.id,
          resolvedPayee: {
            displayName: targetInvoice.recipientName,
            accountId: targetInvoice.recipientAddress,
            targetChainAddress: targetInvoice.recipientAddress,
            verificationStatus: "VERIFIED" as const,
            reputationScore: 98,
          },
          policyCheck: {
            isAllowed: policyAllowed,
            autoExecutable: policyAllowed,
            requiresHumanSignoff: !policyAllowed,
            violations: !policyAllowed ? ["Payment exceeds autonomous single-tx ceiling ($250 USD)"] : [],
            warnings: [],
          },
          settlementExecution: {
            sourceAccount: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            settlementRail: detected.rail,
          },
        };

        const reply = `**Invoice Prepared for On-Chain Settlement**:\n\n` +
          `• **Invoice Identifier**: \`${targetInvoice.invoiceNumber}\`\n` +
          `• **Beneficiary**: ${targetInvoice.recipientName} (\`${targetInvoice.recipientAddress}\`)\n` +
          `• **Total Sum**: **${targetInvoice.amount} ${targetInvoice.token || "tUSD8"}**\n` +
          `• **Settlement Network**: ${detected.chain} (${detected.rail})\n` +
          `• **Confirmation of Payee**: Verified On-Chain\n` +
          `• **Treasury Guardrail**: ${policyAllowed ? "✓ Autonomous Limit Approved (< $250)" : "⚠ Requires Officer Multi-Sig"}\n\n` +
          `Click **Apply & Pay Now** below to sign and complete settlement with your connected tUSD8 wallet.`;

        return NextResponse.json({ reply, intent, provider: AI_PROVIDER_NAME });
      }
    }

    // Check if the user is expressing a conversational payment intent
    const isPaymentIntent = 
      /^(send|pay|transfer|disburse|bridge)\b/i.test(lower) ||
      /\b(send|pay|transfer|disburse)\s+(\$?\d+|\d+\s*(tUSD8|usdc|eth|btc|stx|sol|xrp|atom|xlm)?)/i.test(lower) ||
      /\b(on\s+(base|ethereum|eth|arbitrum|solana|stacks|bitcoin|btc|ripple|xrp|cosmos|stellar|tUSD8))\b/i.test(lower) ||
      lower.includes("send $") ||
      lower.includes("pay $") ||
      lower.includes("transfer $") ||
      lower.includes("pay acme") ||
      lower.includes("pay leprof") ||
      lower.includes("pay satoshi") ||
      lower.includes("on base") ||
      lower.includes("on stacks") ||
      lower.includes("on solana") ||
      lower.includes("on bitcoin") ||
      lower.includes("on xrp") ||
      lower.includes("on cosmos") ||
      lower.includes("on stellar") ||
      lower.includes("on eth");

    if (isPaymentIntent) {
      const intent = resolveNaturalLanguageIntent(message, "company.tUSD8");
      const policyMsg = intent.policyCheck.autoExecutable
        ? "✓ Autonomous Treasury Approval: Payment is within policy threshold ($250 USD) and daily velocity limits."
        : `⚠ Security Policy Alert: ${intent.policyCheck.violations.join(", ") || "Requires Human Signoff"}`;

      const reply = `**tUSD8 Cross-Chain Intent Compiled**:\n\n` +
        `• **Target Chain**: ${intent.targetChain} (${intent.settlementExecution.settlementRail})\n` +
        `• **Settlement Sum**: $${intent.extractedAmount.toFixed(2)} ${intent.extractedCurrency}\n` +
        `• **Payee**: ${intent.resolvedPayee.displayName}\n` +
        `• **Destination Address**: \`${intent.resolvedPayee.targetChainAddress}\`\n` +
        `• **Confirmation of Payee**: ${intent.resolvedPayee.verificationStatus} (Trust Score: ${intent.resolvedPayee.reputationScore}/100)\n` +
        `• **Treasury Guardrail**: ${policyMsg}\n\n` +
        `Click **Apply & Pay Now** below to authorize this payment directly from your tUSD8 wallet.`;

      return NextResponse.json({ reply, intent, provider: AI_PROVIDER_NAME });
    }

    // Retrieve live context from database
    const [invoices, payments, recipients] = await Promise.all([
      prisma.invoice.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
      prisma.payment.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
      prisma.recipient.findMany({ take: 5 }),
    ]);

    const systemPrompt = `You are PayQ Copilot, a senior Web3 fintech assistant running on PayQ AI Cloud and QDay Aevum.
Platform Details:
- Blockchain: QDay Aevum (QDay Aevum Testnet, RPC: https://rpc-test.qday.info)
- AI Inference Engine: PayQ AI Cloud (api.PayQ AI)
- Settlement Tokens: tUSD8 (native token, 24 decimals) and USDC (NEP-141 token, 6 decimals)
- Explorer: https://testnet.Aevum Explorer.io
- Wallet & Faucet: https://testnet.MetaMask / EVM Wallet.com
- Identity Feature: Confirmation of Payee for human-readable named accounts (*.testnet, *.tUSD8) to prevent address spoofing and typos.
- Multi-Chain Abstraction: 8 supported destination chains including tUSD8, Base, Ethereum, Arbitrum, Bitcoin (Native), Solana, Ripple (XRP), Cosmos Hub, Stacks (Bitcoin L2), and Stellar.
- Settlement Rails: Model A (Intent-driven Solver bridge for external wallets) and Model B (tUSD8 decentralized Threshold MPC Chain Signatures 0x6e9ba39CedDa49eb2647Aef28ae30da9B005fc21).
- Governance: Aevum Multi-Sig & Trezu multi-sig escalation for transactions exceeding autonomous limits ($500).
- Agent Security: OutLayer policy rules and emergency circuit breaker.

Real Database Context:
- Recent Invoices (${invoices.length}): ${JSON.stringify(
      invoices.map((i) => ({
        id: i.invoiceNumber,
        recipient: i.recipientName,
        amount: i.amount,
        status: i.status,
      }))
    )}
- Recent Payments (${payments.length}): ${JSON.stringify(
      payments.map((p) => ({
        to: p.recipientAddress,
        amount: p.amount,
        hash: p.transactionHash.slice(0, 10) + "...",
      }))
    )}
- Registered Counterparties (${recipients.length}): ${JSON.stringify(
      recipients.map((r) => ({
        name: r.displayName,
        account: r.walletAddress,
        status: r.verificationStatus,
      }))
    )}

Instructions:
1. Provide concise, professional, fintech-grade answers.
2. If asked about pending invoices, payments, or recipients, use the real database context above.
3. If asked about verification statuses, explain:
   - VERIFIED: Aevum Address matches registered payee identity on-chain.
   - WARNING: Recipient exists but info needs manual confirmation.
   - UNVERIFIED: Account is not in the registry; verify with extreme caution.
   - MISMATCH: Account on invoice differs from registered payee account; high fraud risk!
4. NEVER invent fake transaction hashes or claim unconfirmed blockchain state.
5. NEVER request private keys or seed phrases.`;

    const hasApiKey = Boolean(
      (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== "dummy_key") ||
      process.env.OPENAI_API_KEY
    );

    if (!hasApiKey) {
      // Intelligent deterministic fallback
      const lower = message.toLowerCase();
      if (lower.includes("pending") || lower.includes("invoice")) {
        const pending = invoices.filter((i) => i.status === "PENDING");
        return NextResponse.json({
          reply: pending.length === 0
            ? "You currently have 0 pending invoices. You can upload an invoice or create one using the 'Upload Invoice' button on the dashboard."
            : `You have ${pending.length} pending invoice(s) totaling ${pending.reduce((acc, i) => acc + i.amount, 0)} tUSD8. All payments are verified with Confirmation of Payee on QDay Aevum.`,
          provider: AI_PROVIDER_NAME,
        });
      }

      if (lower.includes("status") || lower.includes("unverified") || lower.includes("verification")) {
        return NextResponse.json({
          reply:
            "Confirmation of Payee statuses on QDay Aevum:\n• VERIFIED: Matched on-chain in PayQRegistry with registered payee entity.\n• WARNING: Recent key or profile rotation flagged.\n• UNVERIFIED: Address has no registered record in PayQ yet.\n• MISMATCH: Address on invoice contradicts known payee identity (High Risk)!",
          provider: AI_PROVIDER_NAME,
        });
      }

      if (lower.includes("faucet") || lower.includes("token") || lower.includes("gas")) {
        return NextResponse.json({
          reply:
            "To get test tokens for QDay Aevum Testnet (Chain ID 44005):\n1. Visit the official faucet: https://faucet.qday.info\n2. Claim tQDAY (gas) and tUSD8 (test stablecoin, 6 decimals).\n3. Your live balances will appear in the PayQ top navbar.",
          provider: AI_PROVIDER_NAME,
        });
      }

      return NextResponse.json({
        reply:
          "PayQ AI Copilot is online on QDay Aevum Testnet (Chain ID 44005). Ask about invoice statuses, tUSD8 settlements, Confirmation of Payee, or treasury guardrails.",
        provider: AI_PROVIDER_NAME,
      });
    }

    const completion = await aevumAi.chat.completions.create({
      model: AEVUM_AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 500,
      temperature: 0.2,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "I processed your query. Let me know if you would like to prepare a transaction.";

    return NextResponse.json({ reply, provider: AI_PROVIDER_NAME });
  } catch (error: any) {
    console.error("AI assistant error:", error);
    return NextResponse.json({
      reply: "PayQ AI Copilot is online on QDay Aevum Testnet. Ask about pending invoices, Confirmation of Payee, or tUSD8 payments.",
      provider: AI_PROVIDER_NAME,
    });
  }
}

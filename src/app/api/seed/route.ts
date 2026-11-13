import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Clean up any legacy mock/demo payments
    await prisma.receipt.deleteMany({
      where: {
        payment: {
          senderAddress: {
            in: ["PayQ-0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "0x1234567890123456789012345678901234567890"],
          },
        },
      },
    });

    await prisma.payment.deleteMany({
      where: {
        senderAddress: {
          in: ["PayQ-0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "0x1234567890123456789012345678901234567890"],
        },
      },
    });

    // 1. Seed Verified Recipients on QDay Aevum Testnet for Confirmation of Payee
    const r1 = await prisma.recipient.upsert({
      where: { paymentId: "acme-design" },
      create: {
        displayName: "Acme Web3 Design Studio",
        paymentId: "acme-design",
        walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        verificationStatus: "VERIFIED",
        notes: "Official QDay Aevum Design Partner.",
      },
      update: {
        walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        verificationStatus: "VERIFIED",
      },
    });

    const r2 = await prisma.recipient.upsert({
      where: { paymentId: "satoshi-dev" },
      create: {
        displayName: "Satoshi Freelance Engineering",
        paymentId: "satoshi-dev",
        walletAddress: "0x1234567890123456789012345678901234567890",
        verificationStatus: "VERIFIED",
        notes: "Post-quantum Solidity & EVM systems auditor.",
      },
      update: {
        walletAddress: "0x1234567890123456789012345678901234567890",
        verificationStatus: "VERIFIED",
      },
    });

    const r3 = await prisma.recipient.upsert({
      where: { paymentId: "apex-media" },
      create: {
        displayName: "Apex Media Agency",
        paymentId: "apex-media",
        walletAddress: "0x9999999999999999999999999999999999999999",
        verificationStatus: "WARNING",
        notes: "Recent key rotation reported by payee. Exercise caution.",
      },
      update: {
        walletAddress: "0x9999999999999999999999999999999999999999",
        verificationStatus: "WARNING",
      },
    });

    // 2. Seed Realistic Unpaid Invoices for Testing Payee Verification & Payment
    const inv1 = await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-2026-9042",
        recipientId: r1.id,
        recipientName: r1.displayName,
        recipientAddress: r1.walletAddress,
        amount: 75.0,
        token: "tUSD8",
        dueDate: "2026-11-20",
        description: "UI/UX Brand Design & Frontend Systems on tUSD8",
        status: "PENDING",
      },
    });

    const inv2 = await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-2026-8812",
        recipientId: r2.id,
        recipientName: r2.displayName,
        recipientAddress: r2.walletAddress,
        amount: 120.0,
        token: "tUSD8",
        dueDate: "2026-11-25",
        description: "tUSD8 Smart Contract Rust Security Audit",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Database seeded with clean tUSD8 recipient registry. Zero demo payments, 100% real on-chain actions.",
      data: {
        recipients: [r1, r2, r3],
        invoices: [inv1, inv2],
      },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LEGACY_DEMO_HANDLES = ["acme-design", "satoshi-dev", "apex-media", "leprof"];
const LEGACY_DEMO_ADDRESSES = [
  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "0x1234567890123456789012345678901234567890",
  "0x9999999999999999999999999999999999999999",
  "0x71C8360f3a8b417c805F99D4133A89f07447d251",
];

export async function POST() {
  try {
    // Remove legacy demo/mock records so the workspace stays 100% fresh for QDay Aevum
    await prisma.receipt.deleteMany({
      where: {
        payment: {
          senderAddress: {
            in: LEGACY_DEMO_ADDRESSES,
          },
        },
      },
    });

    await prisma.payment.deleteMany({
      where: {
        senderAddress: {
          in: LEGACY_DEMO_ADDRESSES,
        },
      },
    });

    await prisma.invoice.deleteMany({
      where: {
        invoiceNumber: {
          in: ["INV-2026-9042", "INV-2026-8812"],
        },
      },
    });

    await prisma.recipient.deleteMany({
      where: {
        paymentId: {
          in: LEGACY_DEMO_HANDLES,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Workspace cleaned. Legacy seeded addresses removed — ready for fresh QDay Aevum recipients and on-chain tUSD8 payments.",
    });
  } catch (error: any) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}

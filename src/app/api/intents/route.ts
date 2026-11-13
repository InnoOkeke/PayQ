import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AEVUM_CONFIG } from "@/lib/aevum/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/intents
 * Formulates a Verifiable Payment Intent on QDay Aevum Testnet
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      senderAddress = "0x0000000000000000000000000000000000000000",
      recipientAddress,
      paymentId,
      amount,
      tokenSymbol = "tUSD8",
      invoiceReference = "INTENT-REF",
    } = body;

    if (!recipientAddress || !amount) {
      return NextResponse.json(
        { error: "recipientAddress and amount are required" },
        { status: 400 }
      );
    }

    let verificationTier: "VERIFIED" | "WARNING" | "UNVERIFIED" | "MISMATCH" = "UNVERIFIED";
    const foundRecipient = await prisma.recipient.findFirst({
      where: {
        OR: [
          { walletAddress: recipientAddress.toLowerCase() },
          paymentId ? { paymentId: paymentId.toLowerCase() } : {},
        ],
      },
    });

    if (foundRecipient) {
      verificationTier =
        foundRecipient.walletAddress.toLowerCase() === recipientAddress.toLowerCase()
          ? (foundRecipient.verificationStatus as any)
          : "MISMATCH";
    }

    return NextResponse.json({
      success: true,
      message: "Verifiable QDay Aevum Payment Intent formulated successfully",
      intent: {
        senderAddress,
        recipientAddress,
        paymentId: paymentId || foundRecipient?.paymentId,
        amount: String(amount),
        tokenSymbol,
        tokenAddress: AEVUM_CONFIG.tusd8Address,
        invoiceReference,
        verificationTier,
        chainId: AEVUM_CONFIG.chainId,
      },
      network: AEVUM_CONFIG.networkName,
      registry: AEVUM_CONFIG.payqRegistryAddress,
    });
  } catch (error: any) {
    console.error("Aevum Intent error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process intent" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    protocol: "PayQ Verifiable Aevum Payment Intent Protocol",
    version: "1.0.0",
    engine: "QDay Aevum Testnet (Chain ID 44005)",
    tusd8: AEVUM_CONFIG.tusd8Address,
    registry: AEVUM_CONFIG.payqRegistryAddress,
  });
}

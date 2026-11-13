import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, formatUnits, http, isAddress } from "viem";
import { findCounterparty, detectChainFromAddress } from "@/lib/recipients";
import {
  AEVUM_CONFIG,
  ERC20_ABI,
  PAYQ_REGISTRY_ABI,
  qdayAevumTestnet,
} from "@/lib/aevum/config";

export const dynamic = "force-dynamic";

const aevumClient = createPublicClient({
  chain: qdayAevumTestnet,
  transport: http(AEVUM_CONFIG.rpcUrl),
});

export async function POST(req: NextRequest) {
  try {
    const { address, name, paymentId } = await req.json();

    if (!address) {
      return NextResponse.json(
        {
          status: "UNVERIFIED",
          isVerified: false,
          reason: "Missing recipient address.",
        },
        { status: 400 }
      );
    }

    const rawAddress = address.trim();
    const chainInfo = detectChainFromAddress(rawAddress);

    // Non-EVM addresses fallback
    if (!isAddress(rawAddress)) {
      const recipient = await findCounterparty(rawAddress, paymentId);
      if (recipient) {
        return NextResponse.json({
          status: recipient.verificationStatus || "WARNING",
          isVerified: recipient.verificationStatus === "VERIFIED",
          chain: chainInfo.chain,
          targetChain: chainInfo.chain,
          settlementRail: chainInfo.rail,
          currency: chainInfo.currency,
          displayName: recipient.displayName,
          paymentId: recipient.paymentId,
          walletAddress: rawAddress,
          reason: `Matched '${recipient.displayName}' in PayQ directory (${chainInfo.chain}).`,
        });
      }
      return NextResponse.json({
        status: "UNVERIFIED",
        isVerified: false,
        chain: chainInfo.chain,
        targetChain: chainInfo.chain,
        settlementRail: chainInfo.rail,
        currency: chainInfo.currency,
        walletAddress: rawAddress,
        reason: `Address is not a valid QDay Aevum (0x...) EVM address and is not registered in the PayQ directory.`,
      });
    }

    // 1. Check live QDay Aevum Testnet on-chain balances (tQDAY & tUSD8)
    let tusd8Balance = "0.00";
    let tqdayBalance = "0.0000";
    try {
      const [nativeBal, tusd8Bal] = await Promise.all([
        aevumClient.getBalance({ address: rawAddress }),
        aevumClient.readContract({
          address: AEVUM_CONFIG.tusd8Address,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [rawAddress],
        }) as Promise<bigint>,
      ]);
      tqdayBalance = Number(formatUnits(nativeBal, 18)).toFixed(4);
      tusd8Balance = Number(formatUnits(tusd8Bal, AEVUM_CONFIG.tusd8Decimals)).toFixed(2);
    } catch (e) {
      console.warn("Aevum RPC balance check warning:", e);
    }

    // 2. Check on-chain PayQRegistry if deployed
    if (AEVUM_CONFIG.payqRegistryAddress) {
      try {
        const [onChainStatus, registeredName] = (await aevumClient.readContract({
          address: AEVUM_CONFIG.payqRegistryAddress,
          abi: PAYQ_REGISTRY_ABI,
          functionName: "verifyPayee",
          args: [rawAddress, name || ""],
        })) as [string, string, number];

        if (onChainStatus === "MISMATCH") {
          return NextResponse.json({
            status: "MISMATCH",
            isVerified: false,
            displayName: registeredName,
            walletAddress: rawAddress,
            chain: "QDay Aevum Testnet",
            targetChain: "QDay Aevum Testnet",
            settlementRail: "PayQRegistry (On-Chain CoP)",
            currency: "tUSD8",
            reason: `CRITICAL MISMATCH (On-Chain): Expected '${name}', but PayQRegistry binds ${rawAddress} to '${registeredName}'.`,
          });
        }

        if (onChainStatus === "VERIFIED") {
          return NextResponse.json({
            status: "VERIFIED",
            isVerified: true,
            displayName: registeredName,
            walletAddress: rawAddress,
            chain: "QDay Aevum Testnet",
            targetChain: "QDay Aevum Testnet",
            settlementRail: "PayQRegistry (On-Chain CoP)",
            currency: "tUSD8",
            reason: `On-Chain CoP VERIFIED on QDay Aevum: '${registeredName}' (${tusd8Balance} tUSD8, ${tqdayBalance} tQDAY).`,
          });
        }
      } catch (e) {
        console.warn("PayQRegistry on-chain check skipped:", e);
      }
    }

    // 3. Directory lookup + name mismatch guard
    const recipient = await findCounterparty(rawAddress, paymentId);
    if (recipient && recipient.verificationStatus === "VERIFIED") {
      if (name && name.trim().length > 0) {
        const cleanReqName = name.trim().toLowerCase();
        const cleanRegName = recipient.displayName.toLowerCase();
        if (!cleanRegName.includes(cleanReqName) && !cleanReqName.includes(cleanRegName)) {
          return NextResponse.json({
            status: "MISMATCH",
            isVerified: false,
            displayName: recipient.displayName,
            walletAddress: rawAddress,
            chain: "QDay Aevum Testnet",
            targetChain: "QDay Aevum Testnet",
            settlementRail: "QDay Aevum (tUSD8)",
            currency: "tUSD8",
            reason: `CRITICAL MISMATCH: Invoice names payee as '${name}', but address is registered to '${recipient.displayName}'. Fraud risk alert!`,
          });
        }
      }

      return NextResponse.json({
        status: "VERIFIED",
        isVerified: true,
        displayName: recipient.displayName,
        paymentId: recipient.paymentId,
        walletAddress: rawAddress,
        chain: "QDay Aevum Testnet",
        targetChain: "QDay Aevum Testnet",
        settlementRail: "QDay Aevum (tUSD8)",
        currency: "tUSD8",
        reason: `Address verified for '${recipient.displayName}' on QDay Aevum Testnet (${tusd8Balance} tUSD8, ${tqdayBalance} tQDAY). Confirmation of Payee passed.`,
      });
    }

    if (recipient) {
      return NextResponse.json({
        status: recipient.verificationStatus || "WARNING",
        isVerified: recipient.verificationStatus === "VERIFIED",
        displayName: recipient.displayName,
        walletAddress: rawAddress,
        chain: "QDay Aevum Testnet",
        targetChain: "QDay Aevum Testnet",
        settlementRail: "QDay Aevum (tUSD8)",
        currency: "tUSD8",
        reason: `QDay Aevum address matched to '${recipient.displayName}' (${tusd8Balance} tUSD8). Status: ${recipient.verificationStatus}.`,
      });
    }

    return NextResponse.json({
      status: "UNVERIFIED",
      isVerified: false,
      walletAddress: rawAddress,
      chain: "QDay Aevum Testnet",
      targetChain: "QDay Aevum Testnet",
      settlementRail: "QDay Aevum (tUSD8)",
      currency: "tUSD8",
      reason: `Valid QDay Aevum address (${tusd8Balance} tUSD8, ${tqdayBalance} tQDAY). Not yet attested in PayQ Confirmation of Payee directory.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

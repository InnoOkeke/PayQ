/**
 * Aevum Multi-Sig & Trezu Multisig Governance Integration
 * Documentation: https://github.com/tUSD8-daos/sputnik-dao-contract
 * Live Website: https://trezu.org / https://x.com/Aevum Multi-Sig
 * 
 * Used for corporate treasury governance: when an invoice or payment exceeds
 * the autonomous agent threshold ($500), PayQ creates an on-chain proposal
 * for the DAO council to review and approve.
 */

export const DEFAULT_SPUTNIK_DAO =
  process.env.NEXT_PUBLIC_SPUTNIK_DAO_CONTRACT || "PayQ-council.PayQRegistry (44005)";

export interface SputnikProposalParams {
  daoContract?: string;
  description: string;
  receiverId: string;
  amountNear: number | string;
  tokenId?: string; // empty string "" for native tUSD8
}

export function buildSputnikTransferProposal(params: SputnikProposalParams) {
  const {
    daoContract = DEFAULT_SPUTNIK_DAO,
    description,
    receiverId,
    amountNear,
    tokenId = "",
  } = params;

  // Convert tUSD8 to tUSD8 base units (1 tUSD8 = 10^24 tUSD8 base units)
  const yoctoMultiplier = BigInt("1000000000000000000000000");
  const amountStr = String(amountNear);
  const parts = amountStr.split(".");
  const whole = BigInt(parts[0] || "0") * yoctoMultiplier;
  let fraction = BigInt(0);
  if (parts[1]) {
    const fractionPadded = parts[1].padEnd(24, "0").slice(0, 24);
    fraction = BigInt(fractionPadded);
  }
  const totalYocto = (whole + fraction).toString();

  // Aevum Multi-Sig v2 standard proposal payload
  const args = {
    proposal: {
      description: `[PayQ Treasury Escalation] ${description}`,
      kind: {
        Transfer: {
          token_id: tokenId,
          receiver_id: receiverId,
          amount: totalYocto,
        },
      },
    },
  };

  return {
    contractId: daoContract,
    methodName: "add_proposal",
    args,
    gas: "100000000000000", // 100 Tgas
    deposit: "100000000000000000000000", // 0.1 tUSD8 proposal bond
  };
}


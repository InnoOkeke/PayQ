/**
 * PayQRegistry On-Chain Governance & Settlement Payload Builder
 * QDay Aevum Testnet (Chain ID 44005)
 */
import { AEVUM_CONFIG } from "@/lib/aevum/config";

export const DEFAULT_REGISTRY_CONTRACT = AEVUM_CONFIG.payqRegistryAddress;

export interface RegistryProposalParams {
  daoContract?: string;
  description: string;
  receiverId: string;
  amountNear: number | string;
}

export function buildSputnikTransferProposal(params: RegistryProposalParams) {
  const {
    daoContract = DEFAULT_REGISTRY_CONTRACT,
    description,
    receiverId,
    amountNear,
  } = params;

  // Convert tUSD8 to base units (1 tUSD8 = 10^6 base units)
  const tusd8Multiplier = BigInt(1_000_000);
  const amountStr = String(amountNear);
  const parts = amountStr.split(".");
  const whole = BigInt(parts[0] || "0") * tusd8Multiplier;
  let fraction = BigInt(0);
  if (parts[1]) {
    const fractionPadded = parts[1].padEnd(6, "0").slice(0, 6);
    fraction = BigInt(fractionPadded);
  }
  const totalBaseUnits = (whole + fraction).toString();

  return {
    contractAddress: daoContract,
    chainId: AEVUM_CONFIG.chainId,
    tokenAddress: AEVUM_CONFIG.tusd8Address,
    methodName: "payInvoice",
    args: {
      payee: receiverId,
      amount: totalBaseUnits,
      invoiceRef: description,
      expectedName: "",
    },
  };
}

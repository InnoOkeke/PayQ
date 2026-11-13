"use client";

import { 
  ArrowUpRight,
  ArrowRight,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { AEVUM_CONFIG } from "@/lib/aevum/config";

export function BlockchainSection() {
  const specs = [
    { 
      label: "Base Layer", 
      value: "QDay Aevum L2", 
      detail: "Post-quantum, EVM-compatible Layer 2 (Chain ID 44005)"
    },
    { 
      label: "Settlement Asset", 
      value: "tUSD8 Stablecoin", 
      detail: "6-decimal ERC-20 test stablecoin (0x4565...3483)"
    },
    { 
      label: "Block Finality", 
      value: "Sub-Second", 
      detail: "Built for real-time stablecoin & agentic commerce"
    },
    { 
      label: "Gas Currency", 
      value: "tQDAY", 
      detail: "Native Aevum gas token via faucet.qday.info"
    },
    { 
      label: "CoP Contract", 
      value: "PayQRegistry.sol", 
      detail: "On-chain Confirmation of Payee & velocity guardrails"
    },
    { 
      label: "Audit Ledger", 
      value: "Aevum Explorer", 
      detail: "Real-time block explorer at explorer-test.qday.info"
    },
  ];

  const supportedWallets = [
    { name: "MetaMask", role: "EVM Browser & Mobile" },
    { name: "Rabby Wallet", role: "Security-First Signer" },
    { name: "Coinbase Wallet", role: "Smart EVM Wallet" },
    { name: "OKX Wallet", role: "Multi-Chain EVM" },
    { name: "Trust Wallet", role: "Mobile Web3 Vault" },
  ];

  return (
    <section id="protocol" className="py-24 sm:py-32 bg-[#050507] border-t border-white/[0.06] relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-3">
              Protocol Foundation
            </span>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] text-white leading-[1.1]">
              Built natively on QDay Aevum.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
              Leveraging post-quantum EVM infrastructure, tUSD8 stablecoin settlement, and on-chain Confirmation of Payee.
            </p>
          </div>

          <a
            href={AEVUM_CONFIG.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white transition-all self-start md:self-auto whitespace-nowrap"
          >
            <span>Inspect Aevum Explorer</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Protocol Specifications Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {specs.map((spec) => (
            <div 
              key={spec.label} 
              className="p-6 rounded-2xl bg-[#090B10] border border-white/[0.08] hover:border-white/[0.15] transition-colors"
            >
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
                {spec.label}
              </span>
              <span className="text-xl font-semibold text-white tracking-[-0.02em] mt-2 block">
                {spec.value}
              </span>
              <span className="text-xs text-zinc-400 mt-1.5 block">
                {spec.detail}
              </span>
            </div>
          ))}
        </div>

        {/* Universal Wallet Compatibility Strip */}
        <div className="mt-10 rounded-3xl bg-[#090B10] border border-white/[0.08] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Universal Non-Custodial Wallet Compatibility
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Integrated with the official NEAR Wallet Selector standard for hardware and software signing.
              </p>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">
              ed25519 Signature Standard
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {supportedWallets.map((wallet) => (
              <div
                key={wallet.name}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <Wallet className="h-4 w-4 text-zinc-400" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">{wallet.name}</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{wallet.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Minimalist Closing CTA */}
        <div className="mt-20 pt-16 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-white">
              Ready to modernize corporate settlement?
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              Deploy autonomous invoicing and counterparty verification in seconds.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-all whitespace-nowrap"
          >
            <span>Open Console</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}

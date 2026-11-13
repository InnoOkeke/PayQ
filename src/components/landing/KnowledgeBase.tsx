"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Terminal, 
  ShieldCheck, 
  FileText, 
  Building2, 
  History, 
  Wallet, 
  ArrowRight, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  Code,
  Globe
} from "lucide-react";

interface FeatureGuide {
  id: string;
  category: string;
  title: string;
  headline: string;
  description: string;
  icon: any;
  actionText: string;
  actionHref: string;
  howItWorks: string[];
  setupSteps: { step: string; instruction: string }[];
  interactiveSample: {
    type: "terminal" | "cop" | "invoice" | "policy" | "wallet";
    title: string;
    content: any;
  };
  securityNote: string;
}

const FEATURE_GUIDES: FeatureGuide[] = [
  {
    id: "intent-compiler",
    category: "Payment Intelligence",
    title: "Natural Language Intent Compiler",
    headline: "Translate human settlement commands into cryptographically verified tUSD8 transactions.",
    description: "Instead of navigating rigid, multi-screen forms, corporate finance teams can specify high-velocity transfers using plain English. The compiler uses deterministic parsing to extract payee address, numeric quantity, and memo metadata, checking every parameter before on-chain authorization.",
    icon: Terminal,
    actionText: "Open Payment Terminal",
    actionHref: "/pay",
    howItWorks: [
      "Natural Language Parsing: Deterministic regex and contextual language models extract the recipient, currency amount, and invoice reference from raw prompts.",
      "Parameter Normalization: Validates QDay Aevum addresses (e.g., correcting common typos like .tesnet to .testnet) and normalizes decimal precision for tUSD8 base units.",
      "Pre-flight CoP Trigger: Automatically triggers Confirmation of Payee in the background before displaying the compiled execution draft.",
      "Non-Custodial Wallet Handshake: Handshakes with MetaMask / EVM Wallet for zero-trust cryptographic signature authorization."
    ],
    setupSteps: [
      { step: "01", instruction: "Navigate to the Send Payment terminal (/pay)." },
      { step: "02", instruction: "Type your intent, such as: 'Pay 15 tUSD8 to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e for Q4 cloud infrastructure'." },
      { step: "03", instruction: "Click 'Compile Intent'. The system auto-populates beneficiary, sum, and purpose." },
      { step: "04", instruction: "Review the real-time Confirmation of Payee verification badge and click 'Authorize on tUSD8'." }
    ],
    interactiveSample: {
      type: "terminal",
      title: "Sample Compiled Output",
      content: {
        input: "Disburse 20 tUSD8 to 0x71C8360f3a8b417c805F99D4133A89f07447d251 for smart contract audit",
        parsedPayee: "0x71C8360f3a8b417c805F99D4133A89f07447d251",
        parsedAmount: "20.00 tUSD8",
        status: "VERIFIED (LeProf Consulting)",
        gasCost: "< 0.0005 tUSD8 (~$0.001)"
      }
    },
    securityNote: "Your private keys never touch PayQ servers. The compiler only builds the unsigned transaction payload for non-custodial signing."
  },
  {
    id: "cop-identity",
    category: "Fraud Prevention",
    title: "Confirmation of Payee & KYC Directory",
    headline: "Prevent invoice fraud, homoglyph attacks, and lookalike domain spoofing.",
    description: "Confirmation of Payee (CoP) inspects beneficiary QDay Aevum addresses on-chain prior to dispatch. It cross-references on-chain state with verified legal entities in the PayQ Counterparty Directory to ensure capital is directed to the true corporate beneficiary.",
    icon: ShieldCheck,
    actionText: "Explore Payee Directory",
    actionHref: "/recipients",
    howItWorks: [
      "Live tUSD8 RPC Interrogation: Queries https://rpc-test.qday.info with view_account to verify the account exists on-chain with active balance.",
      "Typo & Homoglyph Screening: Evaluates Levenshtein edit distance to detect lookalike impostor accounts (e.g., satoshl-dev vs satoshi-dev).",
      "Enterprise KYC Attestation: Matches the account ID against registered corporate identities and flags accounts lacking verified entity documentation.",
      "Name-Match Verification: If an invoice specifies a corporate vendor name, CoP validates that the registered entity name matches the invoice."
    ],
    setupSteps: [
      { step: "01", instruction: "Visit the Confirmation of Payee Directory (/recipients)." },
      { step: "02", instruction: "Use the Interactive Payee Verification Engine to test any QDay Aevum Address in real time." },
      { step: "03", instruction: "To register your organization or verified vendor, click 'Register New Payee'." },
      { step: "04", instruction: "Enter the legal business name, unique payment handle, and QDay Aevum Address to issue an immediate verified attestation." }
    ],
    interactiveSample: {
      type: "cop",
      title: "CoP Live Verification Engine",
      content: {
        verifiedAccount: "0x71C8360f3a8b417c805F99D4133A89f07447d251",
        entity: "LeProf Consulting",
        status: "VERIFIED",
        typoAlert: "Auto-corrected typo 'leprof.tesnet' -> '0x71C8360f3a8b417c805F99D4133A89f07447d251'",
        riskLevel: "0.00% Spoof Risk (KYC Attested)"
      }
    },
    securityNote: "If a recipient displays 'UNVERIFIED: No business KYC attestation filed', exercise caution or verify through out-of-band communication before transferring high values."
  },
  {
    id: "chain-abstraction",
    category: "Cross-Chain Settlement",
    title: "Multi-Chain Settlement & Chain Abstraction",
    headline: "Pay any Base, Ethereum, Bitcoin, Solana, Ripple XRP, Cosmos, Stacks, or Stellar address from tUSD8.",
    description: "Powered by QDay Aevum's decentralized Multi-Party Computation (MPC) network (0x6e9ba39CedDa49eb2647Aef28ae30da9B005fc21) and Model A Intent Solver Bridges, PayQ enables corporate finance teams to settle payments across 8 major blockchain ecosystems directly from a single tUSD8 treasury account. Counterparties receive funds directly in their native wallets without requiring them to create a Aevum Address or bridge manually.",
    icon: Globe,
    actionText: "Send Multi-Chain Payment",
    actionHref: "/pay",
    howItWorks: [
      "Multi-Chain Address Auto-Detection: Automatically detects address formats for Base/Ethereum (0x...), Bitcoin Native (bc1..., 1..., 3...), Solana (Base58), Ripple XRP (r...), Cosmos Hub (cosmos1...), Stacks L2 (SP...), Stellar (G...), and QDay Aevum.",
      "Model A Intent Solver Rail: When paying counterparties who hold external chain wallets, the intent engine locks funds on tUSD8 and dispatches bridge solvers for seamless delivery.",
      "Model B Threshold MPC Signatures: For EVM and Bitcoin, tUSD8 validator nodes run decentralized ECDSA/Ed25519 threshold MPC to sign transactions directly on external chains.",
      "Multi-Chain Confirmation of Payee (CoP): Validates checksums and cross-references multi-chain corporate vendor records in the directory to prevent fraud."
    ],
    setupSteps: [
      { step: "01", instruction: "Open the Send Payment terminal (/pay) or Recipients directory (/recipients)." },
      { step: "02", instruction: "Select your destination blockchain pill (tUSD8, Base, Ethereum, Bitcoin, Solana, XRP, Cosmos, Stacks, Stellar) or type/paste any chain address." },
      { step: "03", instruction: "PayQ auto-detects the network, checks the Confirmation of Payee directory, and selects the optimal settlement rail." },
      { step: "04", instruction: "Authorize the payment in your connected tUSD8 wallet. The transaction is settled non-custodially to the recipient's chain." }
    ],
    interactiveSample: {
      type: "wallet",
      title: "Cross-Chain Settlement Rail",
      content: {
        destinationAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        targetNetwork: "Bitcoin (BTC Native) & EVM / Solana / Cosmos / Ripple",
        settlementRail: "Model A Intent Bridge + tUSD8 MPC Signatures",
        sourceNearAccount: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        derivedMpcSigner: "0x456569838f1d43009A91ebA4263147Afd7233483",
        status: "Multi-Chain Clearance Verified"
      }
    },
    securityNote: "Cross-chain settlements are non-custodial and cryptographically verified. Your organization manages a single tUSD8 treasury while paying partners on any blockchain."
  },
  {
    id: "smart-invoicing",
    category: "Billing Infrastructure",
    title: "Smart Invoicing & Auto-Reconciliation",
    headline: "Institutional invoice generation with embedded cryptographic payment links.",
    description: "Create, issue, and manage professional enterprise invoices denominated in tUSD8 or stable assets. Every invoice features an immutable reference ID and a one-click checkout link that pre-configures CoP checks for the sender.",
    icon: FileText,
    actionText: "Manage Invoices",
    actionHref: "/invoices",
    howItWorks: [
      "Cryptographic Invoicing: Generates auditable digital invoices tied directly to your verified tUSD8 corporate account.",
      "Embedded CoP Verification: Shareable invoice links (/pay?invoiceId=...) automatically load beneficiary parameters and verify the payee on-chain.",
      "Instant Settlement Detection: Once the payer signs on QDay Aevum Testnet, the transaction hash is recorded, updating invoice status from PENDING to PAID in real time.",
      "Accounting Export: Download structured audit receipts and reconciliation files for institutional ERP systems."
    ],
    setupSteps: [
      { step: "01", instruction: "Open Invoices (/invoices) and click 'Create Invoice'." },
      { step: "02", instruction: "Specify client name, recipient address, billing amount, and payment memo." },
      { step: "03", instruction: "Publish the invoice to obtain an instant payment URL." },
      { step: "04", instruction: "Share the link with your client. When they pay, the invoice reconciles automatically on-chain." }
    ],
    interactiveSample: {
      type: "invoice",
      title: "Invoice Lifecycle",
      content: {
        invoiceNumber: "INV-2026-0042",
        recipient: "Acme Web3 Design Studio",
        amount: "50 tUSD8",
        status: "AUTO-RECONCILED ON-CHAIN",
        receiptHash: "7b4c...9f2a (QDay Aevum Testnet)"
      }
    },
    securityNote: "Every settled invoice links directly to the tUSD8 block explorer for permanent, tamper-proof proof of payment."
  },
  {
    id: "treasury-governance",
    category: "Treasury Management",
    title: "Corporate Treasury & Velocity Policies",
    headline: "Institutional spending rules, velocity limits, and multi-sig authorization.",
    description: "Empower decentralized finance operations with granular policy guardrails. Define maximum per-transaction thresholds, daily velocity ceilings, and mandatory multi-stakeholder approval workflows before capital can be released.",
    icon: Building2,
    actionText: "View Treasury Desk",
    actionHref: "/treasury",
    howItWorks: [
      "Balance & Velocity Tracking: Live telemetry monitors total treasury reserves across connected enterprise accounts.",
      "Threshold Enforcement: Transactions exceeding defined policy limits (e.g., > 50 tUSD8) automatically mandate secondary approver authorization.",
      "Role-Based Governance: Distinguishes between Operator (initiator) and Approver (treasury officer) keys.",
      "Risk Scoring Engine: Flags out-of-schedule velocity spikes or transfers to novel counterparties."
    ],
    setupSteps: [
      { step: "01", instruction: "Navigate to the Treasury console (/treasury)." },
      { step: "02", instruction: "Review connected reserve balances, spending velocity, and active policy rules." },
      { step: "03", instruction: "Configure per-transaction spending limits and dual-approval requirements." },
      { step: "04", instruction: "Monitor pending queue authorizations and approve flagged disbursements." }
    ],
    interactiveSample: {
      type: "policy",
      title: "Active Policy Guardrails",
      content: {
        singleTransferLimit: "50.00 tUSD8 (Requires Single Signature)",
        thresholdTier2: "> 50.00 tUSD8 (Dual-Executive Sign-Off)",
        dailyVelocityCeiling: "250.00 tUSD8",
        status: "Active & Enforced On-Chain"
      }
    },
    securityNote: "Velocity ceilings and policy thresholds prevent unauthorized single-operator drain in the event of compromised credentials."
  },
  {
    id: "audit-trail",
    category: "Compliance & Reporting",
    title: "Cryptographic Ledger & Audit Trail",
    headline: "Exportable, immutable proof of transfer for tax, compliance, and audits.",
    description: "Every payment settled through PayQ is logged with its tUSD8 blockchain block height, transaction hash, CoP verification status, and invoice reference for seamless regulatory auditing.",
    icon: History,
    actionText: "Open Transaction Ledger",
    actionHref: "/history",
    howItWorks: [
      "On-Chain Immutability: Reads final transaction receipts directly from QDay Aevum Testnet RPC.",
      "Dual Identity Tagging: Binds anonymous wallet addresses to human-readable counterparties and verified legal entities.",
      "Audit Certificate Generation: Generates verifiable receipt objects including gas metrics, timestamps, and sender/beneficiary signatures.",
      "ERP Compatibility: Filter and export transaction histories to CSV or JSON formats for downstream accounting."
    ],
    setupSteps: [
      { step: "01", instruction: "Visit the Ledger (/history) or Transactions tab." },
      { step: "02", instruction: "Filter records by date range, counterparty, or verification tier." },
      { step: "03", instruction: "Click any transaction row to inspect the full cryptographic receipt." },
      { step: "04", instruction: "Click the tUSD8 Explorer link to inspect raw state execution on-chain." }
    ],
    interactiveSample: {
      type: "wallet",
      title: "Verified Audit Record",
      content: {
        hash: "Dq9v...8x1k",
        sender: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        recipient: "0x71C8360f3a8b417c805F99D4133A89f07447d251 (LeProf Consulting)",
        finalityTime: "1.1 seconds",
        attestation: "CoP Passed · Tier-1 Verified"
      }
    },
    securityNote: "Auditors can independently verify transactions on QDay Aevum Testnet explorer without requiring privileged access to PayQ databases."
  },
  {
    id: "tUSD8-testnet-setup",
    category: "Getting Started",
    title: "QDay Aevum Testnet Wallet & Faucet Setup",
    headline: "Get started in 60 seconds with testnet tokens and zero financial risk.",
    description: "PayQ runs natively on QDay Aevum Testnet. You can test complete corporate payment workflows, invoice settlement, and Confirmation of Payee without risking real treasury capital.",
    icon: Wallet,
    actionText: "Open Testnet Wallet",
    actionHref: "https://testnet.MetaMask / EVM Wallet.com",
    howItWorks: [
      "MetaMask / EVM Wallet Integration: Connect directly using standard non-custodial browser wallet sessions.",
      "Free Testnet Funding: Testnet accounts can be created and topped up for free in seconds.",
      "Sub-Second Execution: QDay Aevum Testnet mirrors mainnet block production (~1 second finality with ~0.0001 tUSD8 gas fees)."
    ],
    setupSteps: [
      { step: "01", instruction: "Visit testnet.MetaMask / EVM Wallet.com and create a free testnet account (e.g., your0x742d35Cc6634C0532925a3b844Bc454e4438f44e)." },
      { step: "02", instruction: "Your wallet comes pre-funded with testnet tUSD8. If you need more, use the official tUSD8 faucet." },
      { step: "03", instruction: "Return to PayQ and click 'Connect Wallet' in the top navigation bar." },
      { step: "04", instruction: "Authorize the session to start sending verified payments and issuing invoices." }
    ],
    interactiveSample: {
      type: "wallet",
      title: "Testnet Environment",
      content: {
        network: "QDay Aevum Testnet",
        rpcEndpoint: "https://rpc-test.qday.info",
        walletPortal: "testnet.MetaMask / EVM Wallet.com",
        blockFinality: "~1.1s",
        gasAverage: "0.0002 tUSD8"
      }
    },
    securityNote: "Ensure your wallet URL starts with testnet.MetaMask / EVM Wallet.com. Never enter private seed phrases on any website."
  }
];

const FAQS = [
  {
    question: "Can I send money to Ethereum, Bitcoin, Solana, XRP, Cosmos, and other chains?",
    answer: "Yes! PayQ supports comprehensive multi-chain settlement powered by QDay Aevum's decentralized Chain Abstraction stack. You can disburse payments to Ethereum/Base (0x...), Bitcoin Native (bc1...), Solana (Base58), Ripple (XRP), Cosmos Hub (cosmos1...), Stacks L2 (SP...), and Stellar (G...). You can also type natural language commands such as 'Pay 50 tUSD8 to LeProf on Base network' or 'Transfer 20 tUSD8 to Satoshi on Bitcoin'. Settlement is executed non-custodially from your connected Aevum Address without having to manage separate wallets or foreign gas tokens."
  },
  {
    question: "What is Model A vs Model B in cross-chain settlement?",
    answer: "Model A (Intent-Driven Cross-Chain Settlement & Solver Rail) allows you to pay counterparties who already maintain external wallets (e.g. an agency that invoices with an Ethereum, Solana, or Bitcoin address) without requiring them to set up a Aevum Address. Funds are locked on tUSD8 and fulfilled on the target chain. Model B (tUSD8 MPC Chain Signatures) uses tUSD8's decentralized threshold network (0x6e9ba39CedDa49eb2647Aef28ae30da9B005fc21) to derive cryptographic signers directly from your Aevum Address, allowing your tUSD8 treasury to sign and broadcast raw transactions on external chains."
  },
  {
    question: "What is Confirmation of Payee (CoP) and why is it necessary for crypto?",
    answer: "In traditional banking, Confirmation of Payee verifies that the account name matches the account number before a wire is executed. In Web3, blockchain transactions are irreversible: sending funds to a spoofed address or typosquatted account (like leprof.tesnet instead of 0x71C8360f3a8b417c805F99D4133A89f07447d251) results in permanent capital loss. PayQ's CoP verifies the account on-chain and validates corporate KYC attestations before you sign."
  },
  {
    question: "Why did I see 'Unregistered or High Risk: No business KYC attestation filed'?",
    answer: "This notification occurs when a recipient account exists on QDay Aevum Testnet (confirmed on-chain with balance) but has not yet filed a legal business attestation in PayQ's counterparty directory. To attest a business or counterparty, visit the Recipients directory (/recipients) and click 'Register New Payee' to establish a verified KYC record."
  },
  {
    question: "Does PayQ have custody of my corporate funds?",
    answer: "No. PayQ is 100% non-custodial. We never hold your private keys, seed phrases, or funds. PayQ compiles intents, validates counterparties, and generates transaction payloads that you authorize directly through your connected tUSD8 wallet (such as MetaMask / EVM Wallet)."
  },
  {
    question: "How does the Natural Language Payment Compiler handle typos?",
    answer: "The compiler automatically checks and normalizes addresses. For instance, if you type 'leprof.tesnet', the system identifies the common testnet suffix typo and queries tUSD8 RPC to confirm the canonical address '0x71C8360f3a8b417c805F99D4133A89f07447d251'. It then alerts you with Confirmation of Payee before you approve the payment."
  },
  {
    question: "Can I use PayQ for team disbursements and vendor invoices?",
    answer: "Yes. PayQ was specifically designed for Web3 startups, DAOs, and corporate treasuries that disburse payments to contractors, agencies, and infrastructure providers. You can create invoices, manage a directory of verified vendors, and enforce spending limits."
  }
];

export function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState<string>("intent-compiler");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const selectedGuide = useMemo(() => {
    return FEATURE_GUIDES.find((g) => g.id === activeTab) || FEATURE_GUIDES[0];
  }, [activeTab]);

  const filteredGuides = useMemo(() => {
    if (!searchQuery.trim()) return FEATURE_GUIDES;
    const q = searchQuery.toLowerCase();
    return FEATURE_GUIDES.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.howItWorks.some((h) => h.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQS;
    const q = searchQuery.toLowerCase();
    return FAQS.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <section id="knowledge-base" className="py-24 sm:py-32 bg-[#050507] border-t border-white/[0.06] relative">
      {/* Background Subtle Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/[0.03] blur-[120px] pointer-events-none rounded-full" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono uppercase tracking-widest text-brand-400">
                Institutional Knowledge Base
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
              <span className="text-xs text-zinc-500 font-mono">Documentation & Setup</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] text-white leading-[1.1]">
              Understand every feature. <br />
              <span className="text-zinc-500">Configure with confidence.</span>
            </h2>
            <p className="mt-4 text-base text-zinc-400 leading-relaxed font-normal">
              A comprehensive technical guide to PayQ's verification primitives, intent compiler, invoicing protocols, and corporate treasury policies.
            </p>
          </div>

          {/* Quick Search */}
          <div className="w-full md:w-72 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features, CoP, KYC..."
              className="w-full bg-[#090B10] border border-white/[0.08] focus:border-brand-500/50 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Feature Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none mb-8 border-b border-white/[0.06]">
          {filteredGuides.map((guide) => {
            const Icon = guide.icon;
            const isSelected = selectedGuide.id === guide.id;
            return (
              <button
                key={guide.id}
                onClick={() => setActiveTab(guide.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-white text-black shadow-lg shadow-white/5 font-semibold"
                    : "bg-[#090B10] text-zinc-400 border border-white/[0.06] hover:text-white hover:border-white/[0.15]"
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? "text-black" : "text-zinc-500"}`} />
                <span>{guide.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Feature Deep Dive Card */}
        <div className="rounded-3xl bg-[#090B10] border border-white/[0.08] p-6 sm:p-10 mb-16 shadow-2xl space-y-10">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/20 text-[11px] font-mono text-brand-400 uppercase tracking-wider">
                  {selectedGuide.category}
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-500 font-mono">QDay Aevum Testnet</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.02em]">
                {selectedGuide.title}
              </h3>
              <p className="text-sm sm:text-base text-zinc-400 mt-2 max-w-2xl leading-relaxed">
                {selectedGuide.headline}
              </p>
            </div>

            <Link
              href={selectedGuide.actionHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold tracking-tight transition-all shadow-md self-start lg:self-center"
            >
              <span>{selectedGuide.actionText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Grid: How It Works & Setup Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Technical Mechanism */}
            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-2">
                  System Architecture
                </span>
                <h4 className="text-lg font-semibold text-white tracking-tight">
                  How it operates under the hood
                </h4>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
                  {selectedGuide.description}
                </p>
              </div>

              <div className="space-y-3">
                {selectedGuide.howItWorks.map((item, idx) => {
                  const [title, desc] = item.split(": ");
                  return (
                    <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-zinc-200">{title}</span>
                      </div>
                      {desc && (
                        <p className="text-xs text-zinc-400 pl-6 leading-relaxed">
                          {desc}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Security Advisory Pill */}
              <div className="p-4 rounded-xl bg-brand-500/[0.04] border border-brand-500/20 flex items-start gap-3">
                <Lock className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  <span className="font-semibold text-brand-300">Security Guarantee: </span>
                  {selectedGuide.securityNote}
                </p>
              </div>
            </div>

            {/* Right Column: Step-by-Step Setup & Interactive Sample */}
            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-2">
                  Deployment Checklist
                </span>
                <h4 className="text-lg font-semibold text-white tracking-tight">
                  Step-by-step setup guide
                </h4>
              </div>

              {/* Steps List */}
              <div className="space-y-2.5">
                {selectedGuide.setupSteps.map((stepItem, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="font-mono text-xs font-bold text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded">
                      {stepItem.step}
                    </span>
                    <span className="text-xs text-zinc-300 leading-relaxed pt-0.5">
                      {stepItem.instruction}
                    </span>
                  </div>
                ))}
              </div>

              {/* Interactive Live Sample Box */}
              <div className="mt-4 rounded-2xl bg-[#050507] border border-white/[0.08] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-zinc-400" />
                    <span className="text-xs font-mono text-zinc-300">{selectedGuide.interactiveSample.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    LIVE PREVIEW
                  </span>
                </div>

                <div className="font-mono text-xs space-y-2 text-zinc-400">
                  {Object.entries(selectedGuide.interactiveSample.content).map(([key, value]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-white/[0.02]">
                      <span className="text-zinc-500 capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
                      <span className="text-zinc-200 font-medium break-all">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Base FAQs / Troubleshooting */}
        <div className="mt-20">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-2">
              Setup & Troubleshooting
            </span>
            <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-[-0.02em]">
              Frequently asked questions & operational protocols
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Common questions regarding Confirmation of Payee, wallet attestation, and on-chain verification.
            </p>
          </div>

          <div className="space-y-3 max-w-4xl">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#090B10] border border-white/[0.06] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-sm font-medium text-white tracking-tight">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-white/[0.04]">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Fast Track CTA */}
        <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-brand-900/20 via-[#090B10] to-[#090B10] border border-brand-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-lg font-semibold text-white tracking-tight">
              Ready to verify a counterparty or send a payment?
            </h4>
            <p className="text-xs text-zinc-400">
              Test on QDay Aevum Testnet with zero risk using verified seed addresses like 0x71C8360f3a8b417c805F99D4133A89f07447d251 or 0x742d35Cc6634C0532925a3b844Bc454e4438f44e.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/recipients"
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold border border-white/[0.08] transition-all"
            >
              Verify Payee
            </Link>
            <Link
              href="/pay"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/25 transition-all flex items-center gap-1.5"
            >
              <span>Launch Terminal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


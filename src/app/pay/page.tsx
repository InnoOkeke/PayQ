"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Send, 
  ShieldCheck, 
  AlertTriangle, 
  Wallet, 
  CheckCircle2, 
  ExternalLink,
  Loader2, 
  ArrowRight,
  Download,
  Zap,
  Globe,
  Check,
  Lock,
  Terminal
} from "lucide-react";
import confetti from "canvas-confetti";
import jsPDF from "jspdf";
import { useWallet } from "@/context/WalletContext";
import { AEVUM_CONFIG, isValidAevumAddress, explorerTxUrl } from "@/lib/aevum/config";
import { detectChainFromAddress } from "@/lib/recipients";
import { formatCurrency } from "@/lib/utils";

const SUPPORTED_CHAINS = [
  { id: "aevum", name: "QDay Aevum Testnet", rail: "PayQRegistry (tUSD8)", badge: "AEVUM", color: "text-emerald-400" },
];

export default function PayPage() {
  const searchParams = useSearchParams();
  const invoiceIdParam = searchParams.get("invoiceId");
  const recipientParam = searchParams.get("recipient");
  const amountParam = searchParams.get("amount");
  const promptParam = searchParams.get("prompt");
  const networkParam = searchParams.get("network");
  const memoParam = searchParams.get("memo");
  const txHashParam = searchParams.get("transactionHashes");

  const { accountId, isConnected, balance, connect, sendTusd8Payment, sendNativePayment } = useWallet();

  // Workflow states
  const [recipient, setRecipient] = useState(recipientParam || "");
  const [selectedChainId, setSelectedChainId] = useState<string>(networkParam || "aevum");
  const [amount, setAmount] = useState(amountParam || "");
  const [tokenSymbol, setTokenSymbol] = useState("tUSD8");
  const [invoiceReference, setInvoiceReference] = useState(memoParam || "");
  const [invoiceId, setInvoiceId] = useState(invoiceIdParam || "");

  // Dynamic balance validation
  const numericAmount = parseFloat(amount || "0");
  const numericBalance = isConnected && balance ? parseFloat(balance) : null;
  const isInsufficientBalance = numericBalance !== null && !isNaN(numericAmount) && numericAmount > numericBalance;
  const isAmountValid = !isNaN(numericAmount) && numericAmount > 0 && !isInsufficientBalance;

  // Verification state
  const [verification, setVerification] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  // UI Step state: 1 = Details, 2 = Review & Confirm, 3 = Completed Receipt
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Settlement states
  const [isExecuting, setIsExecuting] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);

  // Conversational Intent states
  const [intentInput, setIntentInput] = useState(promptParam || "");
  const [isResolvingIntent, setIsResolvingIntent] = useState(false);
  const [resolvedIntent, setResolvedIntent] = useState<any>(null);
  const [intentError, setIntentError] = useState<string | null>(null);

  const paymentBlocked =
    verification?.status === "MISMATCH" ||
    (resolvedIntent?.policyCheck ? !resolvedIntent.policyCheck.isAllowed : false);

  const sampleIntents = [
    "Pay Acme Design 50 tUSD8 on Aevum",
    "Send 120 tUSD8 to Satoshi Dev",
    "Pay LeProf 25 tUSD8 for Audit",
  ];

  const handleSelectChain = (chainId: string) => {
    setSelectedChainId(chainId);
    if (verification?.recipient?.walletAddress) {
      setRecipient(verification.recipient.walletAddress);
    }
  };

  const handleResolveIntent = async (customPrompt?: string) => {
    const promptToUse = customPrompt || intentInput;
    if (!promptToUse.trim()) return;
    if (customPrompt) setIntentInput(customPrompt);
    setIsResolvingIntent(true);
    setIntentError(null);
    try {
      const res = await fetch("/api/intents/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToUse, senderAccount: accountId || "company.tUSD8" }),
      });
      const data = await res.json();
      if (data.resolved) {
        setResolvedIntent(data.resolved);
      } else {
        setIntentError(data.error || "Failed to resolve intent");
      }
    } catch (e: any) {
      setIntentError(e.message || "Network error resolving intent");
    } finally {
      setIsResolvingIntent(false);
    }
  };

  const isValidRecipient = (addr: string) => {
    return isValidAevumAddress(addr) || (!!addr && addr.trim().length > 2);
  };

  const handleApplyResolvedIntent = () => {
    if (!resolvedIntent) return;
    const targetAddr =
      resolvedIntent.resolvedPayee.targetChainAddress || resolvedIntent.resolvedPayee.accountId;
    setRecipient(targetAddr);
    setAmount(resolvedIntent.extractedAmount.toString());
    setTokenSymbol(resolvedIntent.extractedCurrency === "tQDAY" ? "tQDAY" : "tUSD8");
    setInvoiceReference(resolvedIntent.memo);

    const matchChain = SUPPORTED_CHAINS.find((c) =>
      resolvedIntent.targetChain.toLowerCase().includes(c.id)
    );
    if (matchChain) setSelectedChainId(matchChain.id);

    checkPayee(targetAddr, resolvedIntent.resolvedPayee.displayName);
  };

  // Pre-fill from invoice, URL params, or Copilot custom intent event
  useEffect(() => {
    if (invoiceIdParam) {
      fetch(`/api/invoices`)
        .then((r) => r.json())
        .then((data) => {
          const inv = data.invoices?.find((i: any) => i.id === invoiceIdParam);
          if (inv) {
            setRecipient(inv.recipientAddress);
            setAmount(inv.amount.toString());
            setInvoiceReference(inv.invoiceNumber);
            setInvoiceId(inv.id);
            checkPayee(inv.recipientAddress, inv.recipientName);
          }
        })
        .catch(console.error);
    } else {
      if (recipientParam) {
        setRecipient(recipientParam);
        checkPayee(recipientParam);
      }
      if (amountParam) {
        setAmount(amountParam);
      }
      if (memoParam) {
        setInvoiceReference(memoParam);
      }
      if (networkParam) {
        const match = SUPPORTED_CHAINS.find(
          (c) =>
            c.id === networkParam.toLowerCase() ||
            c.name.toLowerCase().includes(networkParam.toLowerCase())
        );
        if (match) setSelectedChainId(match.id);
      }
    }
    if (promptParam) {
      handleResolveIntent(promptParam);
    }
  }, [invoiceIdParam, recipientParam, amountParam, memoParam, networkParam, promptParam]);

  // Listen for instant 1-click apply events from the Copilot chatbot
  useEffect(() => {
    const handleApplyIntentEvent = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      if (detail.recipient) {
        setRecipient(detail.recipient);
        checkPayee(detail.recipient, detail.name);
      }
      if (detail.amount) setAmount(detail.amount.toString());
      if (detail.network) {
        const match = SUPPORTED_CHAINS.find(
          (c) =>
            c.id === detail.network.toLowerCase() ||
            c.name.toLowerCase().includes(detail.network.toLowerCase())
        );
        if (match) setSelectedChainId(match.id);
      }
      if (detail.memo) setInvoiceReference(detail.memo);
      setStep(1);
    };

    window.addEventListener("PayQ:apply-intent", handleApplyIntentEvent);
    return () => window.removeEventListener("PayQ:apply-intent", handleApplyIntentEvent);
  }, []);

  useEffect(() => {
    if (!txHashParam) return;

    const rec = recipientParam || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    const amt = parseFloat(searchParams.get("amount") || "10");
    const payerAccount =
      searchParams.get("payerAccount") || accountId || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
    const pendingParam = searchParams.get("pendingActionId");

    setRecipient(rec);
    setAmount(amt.toString());
    setStep(3);

    const recordPayment = async () => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderAddress: payerAccount,
          recipientAddress: rec,
          amount: amt,
          tokenAddress: "native.tUSD8",
          transactionHash: txHashParam,
          invoiceId: invoiceIdParam || null,
          invoiceReference: invoiceReference || `INV-${Date.now().toString().slice(-4)}`,
          network: "QDay Aevum Testnet",
          chainId: 0,
        }),
      });

      const data = await res.json();
      if (data.payment) {
        setReceiptData(data.payment);
      } else {
        setReceiptData({
          senderAddress: payerAccount,
          recipientAddress: rec,
          amount: amt,
          transactionHash: txHashParam,
          createdAt: new Date().toISOString(),
        });
      }

      if (pendingParam) {
        await fetch(`/api/intents/${pendingParam}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: payerAccount, txHash: txHashParam }),
        }).catch(() => undefined);
      }

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    };

    recordPayment().catch(console.error);
  }, [txHashParam]);

  const prepareAndConfirmPayment = async (): Promise<string | null> => {
    if (!accountId) {
      throw new Error("Connect your tUSD8 wallet before approving this payment.");
    }

    const activeChain =
      SUPPORTED_CHAINS.find((chain) => chain.id === selectedChainId) ?? SUPPORTED_CHAINS[0];

    const payload = {
      recipient,
      recipientAddress: recipient,
      amount: parseFloat(amount),
      tokenSymbol,
      invoiceReference: invoiceReference || null,
      invoiceId: invoiceId || null,
      verificationStatus: verification?.status ?? "UNVERIFIED",
      targetChain: resolvedIntent?.targetChain ?? activeChain.name,
      settlementRail:
        resolvedIntent?.settlementExecution?.settlementRail ?? activeChain.rail,
      policyCheck: resolvedIntent?.policyCheck ?? null,
    };

    const prepareRes = await fetch("/api/intents/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        payload,
        quoteSnapshot: resolvedIntent ?? { amount, recipient, tokenSymbol },
        source: "web",
      }),
    });

    if (prepareRes.status === 404) {
      return null;
    }

    const prepared = await prepareRes.json();
    if (!prepareRes.ok || !prepared.id) {
      throw new Error(prepared.error || prepared.message || "Failed to prepare payment approval.");
    }

    const confirmRes = await fetch(`/api/intents/${prepared.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    const confirmed = await confirmRes.json();
    if (!confirmRes.ok || confirmed.status !== "CONFIRMED") {
      throw new Error(confirmed.error || confirmed.message || "Failed to confirm payment approval.");
    }

    setPendingActionId(prepared.id);
    return prepared.id;
  };

  const cancelPendingPayment = async (actionId: string) => {
    if (!accountId) return;
    await fetch(`/api/intents/${actionId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    }).catch(() => undefined);
  };

  const executePendingPayment = async (actionId: string, txHash: string) => {
    if (!accountId) return;
    await fetch(`/api/intents/${actionId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, txHash }),
    }).catch(() => undefined);
  };

  const handlePayWithEvmWallet = async () => {
    await handleExecutePayment();
  };

  const checkPayee = async (addr: string, name?: string) => {
    if (!addr) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/recipients/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, name }),
      });
      const data = await res.json();
      setVerification(data);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !isValidRecipient(recipient)) {
      alert("Please enter a valid recipient account or address.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (isInsufficientBalance) {
      alert(`Insufficient funds. Your available balance is ${balance} tUSD8.`);
      return;
    }
    setPendingError(null);
    setStep(2);
  };

  const handleExecutePayment = async () => {
    if (!isConnected || !accountId) {
      connect();
      return;
    }
    if (!recipient || !isValidRecipient(recipient)) {
      alert("Please enter a valid recipient account or address.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (paymentBlocked) {
      setPendingError(
        "This payment is blocked by the active treasury policy. Resolve the violations or escalate to Aevum Multi-Sig before signing."
      );
      return;
    }
    if (isInsufficientBalance) {
      alert(`Insufficient funds. Your available balance is ${balance} tUSD8.`);
      return;
    }

    setIsExecuting(true);
    setPendingError(null);
    let actionId: string | null = null;

    try {
      actionId = await prepareAndConfirmPayment();
      let txHash = "";

      if (tokenSymbol === "tQDAY") {
        txHash = await sendNativePayment(recipient, amount);
      } else {
        txHash = await sendTusd8Payment(
          recipient,
          amount,
          invoiceReference || `INV-${Date.now().toString().slice(-4)}`,
          verification?.displayName || ""
        );
      }

      const finalHash = txHash || `AEVUM-LIVE-${Date.now()}`;
      const activeChain = SUPPORTED_CHAINS.find((c) => c.id === selectedChainId) || SUPPORTED_CHAINS[0];

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderAddress: accountId,
          recipientAddress: recipient,
          amount: parseFloat(amount),
          tokenAddress: tokenSymbol === "tQDAY" ? "native.tqday" : AEVUM_CONFIG.tusd8Address,
          transactionHash: finalHash,
          invoiceId: invoiceId || null,
          invoiceReference: invoiceReference || `INV-${Date.now().toString().slice(-4)}`,
          network: activeChain.name,
          chainId: AEVUM_CONFIG.chainId,
        }),
      });

      const data = await res.json();
      if (actionId) {
        await executePendingPayment(actionId, finalHash);
      }

      setReceiptData(
        data.payment ?? {
          senderAddress: accountId,
          recipientAddress: recipient,
          amount: parseFloat(amount),
          transactionHash: finalHash,
          invoiceReference: invoiceReference || "Direct Transfer",
          createdAt: new Date().toISOString(),
        }
      );
      setStep(3);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      if (actionId) {
        await cancelPendingPayment(actionId);
      }
      console.error("tUSD8 transaction execution error:", err);
      setPendingError(err.message || "Failed to execute transaction with connected tUSD8 wallet.");
      alert(err.message || "Failed to execute transaction with connected tUSD8 wallet.");
    } finally {
      setIsExecuting(false);
    }
  };

  const downloadPdfReceipt = () => {
    if (!receiptData) return;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PayQ — Verifiable Payment Receipt", 14, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Protocol: QDay Aevum Testnet (Chain ID 44005)`, 14, 30);
    doc.text(`Receipt ID: ${receiptData.receipt?.receiptNumber || receiptData.id}`, 14, 36);
    doc.text(`Timestamp: ${new Date(receiptData.createdAt).toUTCString()}`, 14, 42);

    doc.setDrawColor(200);
    doc.line(14, 48, 196, 48);

    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Settlement Summary", 14, 58);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Sender (Aevum Address):`, 14, 68);
    doc.setFont("helvetica", "bold");
    doc.text(`${receiptData.senderAddress}`, 75, 68);

    doc.setFont("helvetica", "normal");
    doc.text(`Recipient (Aevum Address):`, 14, 76);
    doc.setFont("helvetica", "bold");
    doc.text(`${receiptData.recipientAddress}`, 75, 76);

    doc.setFont("helvetica", "normal");
    doc.text(`Settlement Amount:`, 14, 84);
    doc.setFont("helvetica", "bold");
    doc.text(`${formatCurrency(receiptData.amount)} ${tokenSymbol}`, 75, 84);

    doc.setFont("helvetica", "normal");
    doc.text(`Invoice Reference:`, 14, 92);
    doc.text(`${receiptData.invoiceReference || "Direct Settlement"}`, 75, 92);

    doc.text(`Transaction Hash:`, 14, 100);
    doc.setFont("courier", "bold");
    doc.text(`${receiptData.transactionHash}`, 75, 100);

    doc.line(14, 108, 196, 108);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 150, 80);
    doc.text("Confirmation of Payee: IDENTITY MATCHED & VERIFIED", 14, 118);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(
      "This transaction was validated by PayQ Confirmation of Payee and settled on QDay Aevum.",
      14,
      126
    );

    doc.save(`PayQ_Receipt_${receiptData.invoiceReference || "AEVUM"}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#050507] py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-400 block mb-1">
            Confirmation of Payee &amp; On-Chain Settlement
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Send Verified Payment
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Verify recipient identity on-chain and check autonomous treasury guardrails before signing.
          </p>
        </div>

        {/* Segmented Step Indicator */}
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.08] self-start sm:self-auto whitespace-nowrap">
          <span
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all ${
              step === 1
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-400"
            }`}
          >
            1. Details
          </span>
          <span
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all ${
              step === 2
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-400"
            }`}
          >
            2. Verify &amp; Sign
          </span>
          <span
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all ${
              step === 3
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400"
            }`}
          >
            3. Receipt
          </span>
        </div>
      </div>

      {/* STEP 1: Enter Details (2-Column Terminal Layout) */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (7 Cols): Intent Bar + Payment Configuration Form */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Conversational Intent Resolver Card */}
            <div className="rounded-3xl bg-[#090B10] border border-white/[0.08] p-6 sm:p-7 space-y-4 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">Conversational Intent Resolver</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300">
                        DeepSeek AI + PayQRegistry
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Express a payment in plain English to auto-fill recipient, asset, and target network.
                    </p>
                  </div>
                </div>
              </div>

              {/* Input Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={intentInput}
                  onChange={(e) => setIntentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleResolveIntent();
                    }
                  }}
                  placeholder='e.g. "Pay 75 tUSD8 to 0x..." or "Send 50 tUSD8 for design invoice"'
                  className="flex-1 bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleResolveIntent()}
                  disabled={isResolvingIntent || !intentInput.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shrink-0 whitespace-nowrap"
                >
                  {isResolvingIntent ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" />
                      <span>Resolve Intent</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Intent Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {sampleIntents.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleResolveIntent(chip)}
                    className="text-[11px] px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-slate-300 hover:text-white transition-all whitespace-nowrap"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Intent Error */}
              {intentError && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{intentError}</span>
                </div>
              )}

              {/* Resolved Intent Preview */}
              {resolvedIntent && (
                <div className="rounded-2xl border border-emerald-500/30 bg-white/[0.02] p-4 space-y-3.5 pt-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-300">Intent Resolved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-slate-300">
                        {resolvedIntent.settlementExecution.settlementRail}
                      </span>
                      <button
                        type="button"
                        onClick={() => setResolvedIntent(null)}
                        className="text-slate-400 hover:text-white text-xs"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                      <span className="text-slate-400 block text-[11px]">Target Network</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Globe className="h-3.5 w-3.5 text-brand-400" />
                        <span className="font-semibold text-white">{resolvedIntent.targetChain}</span>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                      <span className="text-slate-400 block text-[11px]">Parsed Amount</span>
                      <span className="font-mono font-semibold text-emerald-400 mt-1 block">
                        ${resolvedIntent.extractedAmount.toFixed(2)} {resolvedIntent.extractedCurrency}
                      </span>
                      {numericBalance !== null && resolvedIntent.extractedAmount > numericBalance && (
                        <span className="text-[10px] text-rose-400 font-sans font-medium block mt-0.5">
                          Exceeds balance ({balance} tUSD8)
                        </span>
                      )}
                    </div>

                    <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                      <span className="text-slate-400 block text-[11px]">Resolved Payee</span>
                      <span className="font-semibold text-white truncate mt-1 block">
                        {resolvedIntent.resolvedPayee.displayName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block truncate">
                        {resolvedIntent.resolvedPayee.accountId}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Trust Score: <strong className="text-white">{resolvedIntent.resolvedPayee.reputationScore}/100</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyResolvedIntent}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Apply to Transfer Form</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Payment Form Card */}
            <form
              onSubmit={handleProceedToReview}
              className="rounded-3xl bg-[#090B10] border border-white/[0.08] p-6 sm:p-8 space-y-6 shadow-xl"
            >
              <div className="border-b border-white/[0.06] pb-4">
                <h3 className="text-base font-semibold text-white">Transfer Parameters</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure destination network, recipient account or cross-chain address, and settlement amount.
                </p>
              </div>

              {/* Settlement Network Selector */}
              <div className="space-y-2 pb-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Settlement Network
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400">
                    QDay Aevum Testnet · Chain ID 44005
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {SUPPORTED_CHAINS.map((c) => {
                    const isSelected = selectedChainId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectChain(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                          isSelected
                            ? "bg-white text-black font-semibold border-white shadow-md"
                            : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-white hover:border-white/[0.15]"
                        }`}
                      >
                        <span className="font-mono text-[10px] mr-1.5 opacity-70">{c.badge}</span>
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipient Account Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 block">
                    Recipient Address / Handle (QDay Aevum)
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span>PayQRegistry (tUSD8)</span>
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRecipient(val);
                      if (val.trim()) {
                        checkPayee(val);
                      }
                    }}
                    placeholder="e.g. 0x9fa9C08Bb83cf70774fd38Ee638ad98D4B6CBDCf"
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                    required
                  />
                  {verifying && (
                    <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5 text-xs text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
                      <span>Verifying...</span>
                    </div>
                  )}
                </div>

                {/* Inline Confirmation of Payee Status Indicator */}
                {verification && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                      verification.status === "VERIFIED"
                        ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                        : verification.status === "WARNING"
                        ? "bg-amber-950/30 border-amber-500/30 text-amber-300"
                        : "bg-rose-950/30 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {verification.status === "VERIFIED" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold text-white">
                          {verification.recipient?.displayName ||
                            (verification.status === "VERIFIED"
                              ? "Identity Matched"
                              : "Unregistered Recipient")}
                        </span>
                        {verification.recipient?.paymentId && (
                          <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                            ({verification.recipient.paymentId})
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/40 border border-white/[0.08] uppercase">
                      {verification.status}
                    </span>
                  </div>
                )}
              </div>

              {/* Amount & Asset */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-slate-300">
                      Payment Amount
                    </label>
                    {isConnected && (
                      <span className="text-[11px] text-slate-400">
                        Available:{" "}
                        <strong
                          className={`font-mono ${
                            isInsufficientBalance ? "text-rose-400 font-bold" : "text-brand-300"
                          }`}
                        >
                          {balance} tUSD8
                        </strong>
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full bg-white/[0.02] border rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none transition-colors ${
                      isInsufficientBalance
                        ? "border-rose-500/70 focus:border-rose-500 bg-rose-950/20 text-rose-200"
                        : "border-white/[0.08] focus:border-brand-500 text-white"
                    }`}
                    required
                  />
                  {isInsufficientBalance && (
                    <div className="flex items-center gap-1.5 text-rose-400 text-xs mt-1 font-medium animate-in fade-in">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Insufficient balance: You have <strong>{balance} tUSD8</strong>, but you entered{" "}
                        <strong>{amount} tUSD8</strong>.
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300 block">
                    Settlement Asset
                  </label>
                  <select
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value)}
                    className="w-full bg-[#0D111A] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                  >
                    <option value="tUSD8">tUSD8 (Stablecoin)</option>
                    <option value="tQDAY">tQDAY (Native Gas)</option>
                  </select>
                </div>
              </div>

              {/* Invoice Reference */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300 block">
                  Invoice Reference / Memo (Optional)
                </label>
                <input
                  type="text"
                  value={invoiceReference}
                  onChange={(e) => setInvoiceReference(e.target.value)}
                  placeholder="e.g. INV-2026-9042 or Q4 Retainer"
                  className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs">
                  {isInsufficientBalance && (
                    <span className="text-rose-400 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Amount exceeds available wallet balance</span>
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!isAmountValid || !recipient}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-brand-600 hover:bg-brand-500 disabled:bg-white/[0.04] disabled:text-slate-500 disabled:border disabled:border-white/[0.08] disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-brand-600/25 transition-all active:scale-[0.98]"
                >
                  <span>
                    {isInsufficientBalance
                      ? "Insufficient Balance"
                      : "Review & Verify Recipient"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Right Column (5 Cols): Live Confirmation of Payee & Security Inspector (Sticky) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24 h-fit">
            
            {/* Active Treasury Guardrails Summary */}
            <div className="rounded-3xl bg-[#090B10] border border-white/[0.08] p-6 space-y-3.5 text-xs shadow-xl">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Lock className="h-3.5 w-3.5 text-brand-400" />
                <span>Active Settlement Safeguards</span>
              </div>
              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex justify-between py-1.5 border-b border-white/[0.05] text-slate-400">
                  <span>Single-Tx Policy Limit</span>
                  <span className="text-white">500.00 tUSD8 (PayQRegistry)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/[0.05] text-slate-400">
                  <span>Network</span>
                  <span className="text-emerald-400">QDay Aevum (44005)</span>
                </div>
                <div className="flex justify-between py-1.5 text-slate-400">
                  <span>Custody Model</span>
                  <span className="text-slate-200">Non-Custodial Wallet Sign</span>
                </div>
              </div>
            </div>

            {/* Live Payee Verification Panel (Confirmation of Payee) */}
            <div className="rounded-3xl bg-[#090B10] border border-white/[0.08] p-6 sm:p-7 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Confirmation of Payee</h3>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Live RPC Check
                </span>
              </div>

              {verification ? (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-2xl border flex items-start gap-3 ${
                      verification.status === "VERIFIED"
                        ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                        : verification.status === "WARNING"
                        ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                        : "bg-rose-950/20 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    {verification.status === "VERIFIED" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {verification.status === "VERIFIED"
                            ? "Identity Matched & Verified"
                            : verification.status === "WARNING"
                            ? "Security Advisory Flag"
                            : "Unregistered or High Risk"}
                        </span>
                        <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-black/40 border border-white/[0.08]">
                          {verification.status}
                        </span>
                      </div>
                      {verification.reason && (
                        <p className="text-slate-300 leading-relaxed pt-1">{verification.reason}</p>
                      )}
                    </div>
                  </div>

                  {verification.recipient && (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5 text-xs font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Registered Entity</span>
                        <span className="text-white font-sans font-medium">{verification.recipient.displayName}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Payment ID</span>
                        <span className="text-brand-300">{verification.recipient.paymentId}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter a recipient account or cross-chain address on the left to automatically query the on-chain registry and screen for lookalike homoglyphs.
                  </p>
                  <div className="space-y-2.5 text-xs">
                    {[
                      "On-chain account existence check (tUSD8 RPC)",
                      "Corporate entity name & payment ID attestation",
                      "Levenshtein distance typosquatting defense",
                      "Autonomous treasury velocity compliance"
                    ].map((checkItem) => (
                      <div key={checkItem} className="flex items-center gap-2.5 text-slate-300 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>{checkItem}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* STEP 2: Review & Sign */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-[#090B10] border border-white/[0.08] p-6 sm:p-9 space-y-6 shadow-2xl">
          <div className="border-b border-white/[0.06] pb-4">
            <h3 className="text-lg font-bold text-white">Review Verified Settlement</h3>
            <p className="text-xs text-slate-400 mt-1">
              Confirm recipient identity and payment parameters before signing with your wallet.
            </p>
          </div>

          {verification?.status === "MISMATCH" && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-bold">CRITICAL WARNING: Account Mismatch Detected</p>
                <p className="mt-1 text-slate-300">
                  The recipient Aevum Address does not match the registered legal identity for this invoice.
                </p>
              </div>
            </div>
          )}

          {pendingError && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
              <p className="leading-relaxed">{pendingError}</p>
            </div>
          )}

          {isInsufficientBalance && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Insufficient Account Balance</p>
                <p className="mt-1 text-slate-300">
                  Your connected wallet has <strong className="text-white">{balance} tUSD8</strong>, but this payment requires <strong className="text-rose-300">{amount} tUSD8</strong>. Please go back to reduce the transfer amount or top up your testnet wallet.
                </p>
              </div>
            </div>
          )}

          {resolvedIntent?.policyCheck?.violations?.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
              <p className="font-bold">Treasury policy violations</p>
              {resolvedIntent.policyCheck.violations.map((violation: string) => (
                <p key={violation} className="text-slate-300 leading-relaxed">
                  • {violation}
                </p>
              ))}
            </div>
          )}

          {resolvedIntent?.velocity && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex items-center justify-between text-xs">
              <span className="text-slate-400">Rolling 24h treasury velocity</span>
              <span className="font-mono font-semibold text-slate-200">
                ${resolvedIntent.velocity.spentUSD.toFixed(2)} across{" "}
                {resolvedIntent.velocity.paymentCount} payment(s)
              </span>
            </div>
          )}

          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.07] p-5 space-y-3.5 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
              <span className="text-slate-400">Recipient Account ID</span>
              <span className="font-mono font-bold text-white text-sm">{recipient}</span>
            </div>

            {verification?.recipient && (
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span className="text-slate-400">Verified Legal Name</span>
                <span className="font-semibold text-emerald-400">{verification.recipient.displayName}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
              <span className="text-slate-400">Total Settlement Amount</span>
              <span className="font-mono font-bold text-brand-300 text-base">
                {formatCurrency(amount)} {tokenSymbol}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
              <span className="text-slate-400">Settlement Network</span>
              <span className="font-semibold text-slate-200">
                {SUPPORTED_CHAINS.find((c) => c.id === selectedChainId)?.name || "QDay Aevum"}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
              <span className="text-slate-400">Execution Rail</span>
              <span className="font-semibold text-cyan-400">
                {SUPPORTED_CHAINS.find((c) => c.id === selectedChainId)?.rail || "Native Settlement"}
              </span>
            </div>

            {isValidAevumAddress(recipient) && (
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span className="text-slate-400">Aevum Token Contract</span>
                <span className="font-mono text-[11px] text-brand-300 truncate max-w-[260px]">
                  {tokenSymbol === "tQDAY" ? "Native tQDAY" : AEVUM_CONFIG.tusd8Address}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">Invoice / Memo Reference</span>
              <span className="font-mono text-slate-300">{invoiceReference || "Direct Transfer"}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => setStep(1)}
              className="text-xs text-slate-400 hover:text-white order-2 sm:order-1"
            >
              &larr; Back to Details
            </button>

            {!isConnected ? (
              <button
                type="button"
                onClick={() => connect()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/25 transition-all order-1 sm:order-2"
              >
                <Wallet className="h-4 w-4" />
                <span>Connect tUSD8 Wallet to Sign</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5 order-1 sm:order-2">
                <button
                  type="button"
                  onClick={handleExecutePayment}
                  disabled={isExecuting || paymentBlocked || isInsufficientBalance}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/[0.04] disabled:text-slate-500 disabled:border disabled:border-white/[0.08] disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 transition-all"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Preparing approval &amp; signing...</span>
                    </>
                  ) : paymentBlocked ? (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Blocked by Treasury Policy</span>
                    </>
                  ) : isInsufficientBalance ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span>Insufficient Balance ({balance} tUSD8 Available)</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" />
                      <span>Sign &amp; Transfer ({accountId})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePayWithEvmWallet}
                  disabled={isInsufficientBalance}
                  className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 border border-white/[0.08] text-xs font-medium transition-all"
                  title="Or transfer directly via MetaMask / EVM Wallet web"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>MetaMask / EVM Wallet Web</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Completed Receipt */}
      {step === 3 && receiptData && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-[#090B10] border border-emerald-500/30 p-6 sm:p-9 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Payment Confirmed on tUSD8</h2>
            <p className="text-xs text-slate-400">
              The settlement has been finalized on-chain with a verifiable audit receipt.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.07] p-5 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.06]">
              <span className="text-slate-400">Receipt Number</span>
              <span className="font-mono text-emerald-400 font-bold">
                {receiptData.receipt?.receiptNumber || receiptData.id}
              </span>
            </div>

            {pendingActionId && (
              <div className="flex justify-between items-center pb-2.5 border-b border-white/[0.06]">
                <span className="text-slate-400">Approval Reference</span>
                <span className="font-mono text-[11px] text-slate-300">{pendingActionId}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Amount Paid</span>
              <span className="font-mono font-bold text-white text-sm">
                {formatCurrency(receiptData.amount)} {tokenSymbol}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Recipient Account / Address</span>
              <span className="font-mono text-slate-200">{receiptData.recipientAddress}</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Destination Network</span>
              <span className="font-semibold text-brand-300">
                {receiptData.network || (SUPPORTED_CHAINS.find((c) => c.id === selectedChainId)?.name ?? "QDay Aevum")}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Settlement Rail</span>
              <span className="font-mono text-emerald-400 text-xs">
                PayQRegistry (tUSD8 · QDay Aevum)
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Aevum Settlement Hash</span>
              <a
                href={explorerTxUrl(receiptData.transactionHash)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
              >
                <span>{receiptData.transactionHash.slice(0, 16)}...</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={downloadPdfReceipt}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.08] transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF Receipt</span>
            </button>

            <button
              onClick={() => {
                setStep(1);
                setAmount("");
                setRecipient("");
                setVerification(null);
                setReceiptData(null);
                setPendingActionId(null);
                setPendingError(null);
                setResolvedIntent(null);
              }}
              className="w-full sm:w-auto flex-1 px-5 py-3 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-all shadow-md shadow-brand-600/25"
            >
              Make Another Payment
            </button>
          </div>
        </div>
      )}

      {/* Awaiting Wallet Confirmation In-Flight Modal */}
      {isExecuting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-3xl bg-[#090B10] border border-white/[0.12] p-6 sm:p-8 space-y-6 text-center shadow-2xl">
            <div className="relative mx-auto w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
              <Wallet className="h-5 w-5 text-white absolute" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Confirm in Connected Wallet
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Please approve the transaction in your connected EVM wallet (MetaMask / Rabby) to settle tUSD8 on QDay Aevum Testnet.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-2.5 font-mono text-left">
              <div className="flex justify-between items-center text-slate-400">
                <span>Beneficiary:</span>
                <span className="text-white truncate max-w-[200px] font-medium">{recipient}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Target Chain:</span>
                <span className="text-brand-300 font-sans font-semibold">
                  {SUPPORTED_CHAINS.find((c) => c.id === selectedChainId)?.name || "QDay Aevum"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Settlement Rail:</span>
                <span className="text-cyan-400 font-sans font-semibold">
                  {SUPPORTED_CHAINS.find((c) => c.id === selectedChainId)?.rail || "QDay Aevum (Native)"}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Signer / Solver:</span>
                <span className="text-slate-300">
                  {selectedChainId !== "tUSD8" ? "0x6e9ba39CedDa49eb2647Aef28ae30da9B005fc21" : (accountId || "Connected Wallet")}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-white/[0.04]">
                <span>Total Amount:</span>
                <span className="text-emerald-400 font-bold text-sm">{amount} {tokenSymbol}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsExecuting(false)}
                className="w-full py-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel or Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

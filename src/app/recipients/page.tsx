"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Loader2,
  Globe,
  Copy,
  Check
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { AEVUM_CONFIG, explorerAddressUrl, explorerTxUrl } from "@/lib/aevum/config";

export default function RecipientsPage() {
  const { accountId, isConnected, registerPayeeOnChain } = useWallet();

  // Search & verification states
  const [searchAddress, setSearchAddress] = useState("");
  const [searchName, setSearchName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // Registration modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regPaymentId, setRegPaymentId] = useState("");
  const [regDisplayName, setRegDisplayName] = useState("");
  const [regWallet, setRegWallet] = useState(accountId || "");
  const [registering, setRegistering] = useState(false);
  const [regTxHash, setRegTxHash] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const [recipientsList, setRecipientsList] = useState<any[]>([]);

  const fetchRecipients = async () => {
    try {
      const res = await fetch("/api/recipients");
      const data = await res.json();
      if (data.recipients) {
        setRecipientsList(data.recipients);
      }
    } catch (e) {
      console.error("Failed to load recipients:", e);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(id);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAddress.trim()) return;

    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch("/api/recipients/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: searchAddress.trim(),
          name: searchName.trim() || undefined,
        }),
      });
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      console.error("Verify recipient error:", err);
    } finally {
      setVerifying(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDisplayName || !regWallet) return;

    setRegistering(true);
    setRegError(null);
    setRegTxHash(null);
    try {
      let txHash: string | null = null;
      if (isConnected && accountId) {
        txHash = await registerPayeeOnChain(
          regWallet.trim(),
          regDisplayName.trim(),
          regPaymentId.trim() || regWallet.trim().slice(0, 10).toLowerCase()
        );
        if (txHash) setRegTxHash(txHash);
      }

      const res = await fetch("/api/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: regDisplayName.trim(),
          paymentId: regPaymentId.trim() || undefined,
          walletAddress: regWallet.trim(),
          notes: txHash
            ? `Attested on-chain via PayQRegistry (${txHash.slice(0, 10)}...) on QDay Aevum.`
            : "Registered on QDay Aevum Confirmation of Payee Directory.",
          verificationStatus: "VERIFIED",
        }),
      });

      if (res.ok) {
        await fetchRecipients();
        setShowRegisterModal(false);
        setRegPaymentId("");
        setRegDisplayName("");
      } else {
        const data = await res.json();
        setRegError(data.error || "Failed to register recipient");
      }
    } catch (err: any) {
      console.error("Register recipient error:", err);
      setRegError(err?.shortMessage || err?.message || "Failed to register payee.");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-navy-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-400">
              Identity Registry
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-400">QDay Aevum · PayQRegistry Confirmation of Payee</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Confirmation of Payee Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Verify and attest QDay Aevum (<code className="text-brand-300">tUSD8</code>) counterparties on-chain via{" "}
            <a
              href={explorerAddressUrl(AEVUM_CONFIG.payqRegistryAddress)}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline font-mono"
            >
              PayQRegistry
            </a>
            .
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/25 transition-all w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Payee</span>
        </button>
      </div>

      {/* Verification Tool */}
      <div className="rounded-2xl bg-navy-900/80 border border-navy-800 p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-400" />
            <span>Payee Verification Engine</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Verify any QDay Aevum <code className="text-slate-300">0x...</code> wallet address or payment handle before sending <code className="text-emerald-400">tUSD8</code>.
          </p>
        </div>

        <form onSubmit={handleVerify} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold text-slate-300">QDay Aevum Address or Handle</label>
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="e.g. 0x9fa9C08Bb83cf70774fd38Ee638ad98D4B6CBDCf"
              className="w-full bg-navy-950 border border-navy-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Expected Business Name (Optional)</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="e.g. Aurora Labs Ltd"
              className="w-full bg-navy-950 border border-navy-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={verifying}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Payee...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Run Confirmation of Payee Check</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Verification Result Display */}
        {verifyResult && (
          <div
            className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in ${
              verifyResult.status === "VERIFIED"
                ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                : verifyResult.status === "WARNING"
                ? "bg-amber-950/30 border-amber-500/30 text-amber-200"
                : "bg-rose-950/30 border-rose-500/30 text-rose-200"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2 rounded-xl mt-0.5 ${
                  verifyResult.status === "VERIFIED"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {verifyResult.status === "VERIFIED" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold">Verification Result: {verifyResult.status}</span>
                  {verifyResult.displayName && (
                    <span className="text-xs text-slate-300">
                      ({verifyResult.displayName})
                    </span>
                  )}
                  {verifyResult.chain && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {verifyResult.chain}
                    </span>
                  )}
                  {verifyResult.settlementRail && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      {verifyResult.settlementRail}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  {verifyResult.reason}
                </p>
              </div>
            </div>

            {verifyResult.status === "VERIFIED" && (
              <a
                href={`/pay?recipient=${verifyResult.walletAddress}`}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all self-start sm:self-center"
              >
                <span>Pay Verified Account</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Verified Directory Table */}
      <div className="rounded-2xl bg-navy-900/80 border border-navy-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-400" />
            <span>Registered QDay Aevum Payee Directory</span>
          </h3>
          <span className="text-xs text-slate-400">{recipientsList.length} entities registered</span>
        </div>

        {regTxHash && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
            <span>Payee attested on-chain in PayQRegistry.sol</span>
            <a
              href={explorerTxUrl(regTxHash)}
              target="_blank"
              rel="noreferrer"
              className="font-mono underline inline-flex items-center gap-1"
            >
              <span>{regTxHash.slice(0, 12)}...</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {recipientsList.length === 0 ? (
          <div className="p-8 rounded-2xl bg-navy-950/60 border border-dashed border-navy-800 text-center space-y-2">
            <p className="text-sm font-semibold text-white">No payees registered yet</p>
            <p className="text-xs text-slate-400">
              Your workspace is clean. Click <span className="text-brand-400 font-semibold">Register New Payee</span> to attest your first QDay Aevum counterparty on-chain.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-4">
          {recipientsList.map((r) => (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-navy-950/60 border border-navy-800 flex flex-col gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-bold text-white">{r.displayName}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    Handle: {r.paymentId}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      r.verificationStatus === "VERIFIED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {r.verificationStatus}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={explorerAddressUrl(r.walletAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-300 hover:text-white transition-colors"
                    title="View on Aevum Explorer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <a
                    href={`/pay?recipient=${r.walletAddress}`}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition-colors"
                  >
                    Send Payment
                  </a>
                </div>
              </div>

              {/* QDay Aevum Address Badge */}
              <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="text-[10px] text-emerald-400 uppercase block font-sans">QDay Aevum (tUSD8)</span>
                    <span className="text-white truncate block text-[11px]">{r.walletAddress}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(r.walletAddress, `${r.id}-tUSD8`)}
                    className="text-slate-500 hover:text-white shrink-0 p-1"
                  >
                    {copiedAddress === `${r.id}-tUSD8` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {r.notes && <p className="text-[11px] text-slate-400 font-sans">{r.notes}</p>}
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-navy-900 border border-navy-800 p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-navy-800">
              <div>
                <h3 className="text-lg font-bold text-white">Register QDay Aevum Payee</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Attest a verified counterparty on-chain in PayQRegistry.sol for tUSD8 Confirmation of Payee.
                </p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {regError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Legal or Trading Name *</label>
                  <input
                    type="text"
                    value={regDisplayName}
                    onChange={(e) => setRegDisplayName(e.target.value)}
                    placeholder="e.g. Aurora Labs Ltd"
                    className="w-full bg-navy-950 border border-navy-800 rounded-xl px-3.5 py-2 text-xs text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Unique Payment Handle *</label>
                  <input
                    type="text"
                    value={regPaymentId}
                    onChange={(e) => setRegPaymentId(e.target.value)}
                    placeholder="e.g. aurora-dev"
                    className="w-full bg-navy-950 border border-navy-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">QDay Aevum Wallet Address (0x...) *</label>
                <input
                  type="text"
                  value={regWallet}
                  onChange={(e) => setRegWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-navy-950 border border-navy-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  {isConnected
                    ? "Wallet connected — this will also register the payee on-chain in PayQRegistry.sol."
                    : "Connect your wallet to also attest this payee on-chain in PayQRegistry.sol."}
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/25"
                >
                  {registering ? "Registering Payee..." : "Register Payee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, AlertTriangle, Clock, RefreshCw, TrendingUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ARAgingTable from "../components/billing/ARAgingTable";
import OutstandingClaims from "../components/billing/OutstandingClaims";
import ResubmissionQueue from "../components/billing/ResubmissionQueue";
import PaymentPosting from "../components/billing/PaymentPosting";

const tabs = [
  { key: "aging", label: "AR Aging", icon: TrendingUp },
  { key: "outstanding", label: "Outstanding Claims", icon: Clock },
  { key: "resubmission", label: "Resubmission Queue", icon: RefreshCw },
  { key: "posting", label: "Payment Posting", icon: DollarSign },
];

export default function BillingDashboard() {
  const [tab, setTab] = useState("aging");
  const [claims, setClaims] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [lastReconciled, setLastReconciled] = useState(null);
  const [reconcileResult, setReconcileResult] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [cl, py] = await Promise.all([
      base44.entities.Claim.list("-date_of_service", 1000),
      base44.entities.Payment.list("-payment_date", 1000),
    ]);
    setClaims(cl);
    setPayments(py);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleReconcile = async () => {
    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await base44.functions.invoke('reconcileAR', {});
      const result = res.data;
      setReconcileResult(result);
      setLastReconciled(new Date().toLocaleTimeString());
      toast({ title: `Reconciled: ${result.corrections_made} claim(s) updated out of ${result.claims_checked} checked.` });
      if (result.corrections_made > 0) load(); // Refresh data
    } catch (e) {
      toast({ title: e.message || 'Reconcile failed', variant: 'destructive' });
    }
    setReconciling(false);
  };

  // Summary stats
  const totalAR = claims.reduce((s, c) => {
    if (c.status === "Paid") return s;
    return s + Math.max(0, (c.total_charge || 0) - (c.amount_paid || 0));
  }, 0);

  const deniedCount = claims.filter(c => c.status === "Denied").length;
  const submittedCount = claims.filter(c => c.status === "Submitted").length;
  const over90Count = claims.filter(c => {
    if (c.status === "Paid") return false;
    const age = Math.floor((new Date() - new Date(c.date_of_service)) / 86400000);
    return age > 90;
  }).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Billing Dashboard</h1>
          <p className="text-sm text-muted-foreground">AR aging, outstanding claims, denials, and payment posting</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReconcile}
            disabled={reconciling}
            className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {reconciling ? 'Reconciling...' : 'Reconcile AR'}
          </Button>
          {lastReconciled && (
            <p className="text-xs text-muted-foreground">Last run: {lastReconciled}</p>
          )}
        </div>
      </div>

      {reconcileResult && reconcileResult.corrections_made > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-900">
          <p className="font-semibold mb-1">✓ Reconciled {reconcileResult.corrections_made} claim(s)</p>
          <div className="space-y-0.5 text-xs max-h-32 overflow-y-auto">
            {reconcileResult.corrections.map((c, i) => (
              <p key={i}>{c.patient_name} ({c.date_of_service}): ${c.old_amount_paid.toFixed(2)} → ${c.new_amount_paid.toFixed(2)}</p>
            ))}
          </div>
        </div>
      )}
      {reconcileResult && reconcileResult.corrections_made === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-900">
          ✓ All {reconcileResult.claims_checked} claims are in sync — no corrections needed.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total AR</p>
          <p className="text-2xl font-bold text-primary">${totalAR.toFixed(0)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Submitted / Pending</p>
          <p className="text-2xl font-bold text-purple-600">{submittedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Denied (need action)</p>
          <p className="text-2xl font-bold text-red-600">{deniedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Claims &gt;90 Days</p>
          <p className={`text-2xl font-bold ${over90Count > 0 ? "text-orange-600" : "text-emerald-600"}`}>{over90Count}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === "aging" && <ARAgingTable claims={claims} />}
          {tab === "outstanding" && <OutstandingClaims claims={claims} onRefresh={load} />}
          {tab === "resubmission" && <ResubmissionQueue claims={claims} payments={payments} />}
          {tab === "posting" && <PaymentPosting onPosted={load} />}
        </>
      )}
    </div>
  );
}
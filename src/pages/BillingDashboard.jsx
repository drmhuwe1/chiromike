import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, AlertTriangle, Clock, RefreshCw, TrendingUp } from "lucide-react";
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
      <div>
        <h1 className="text-xl font-bold">Billing Dashboard</h1>
        <p className="text-sm text-muted-foreground">AR aging, outstanding claims, denials, and payment posting</p>
      </div>

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
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Plus, RefreshCw, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const currency = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

function rateKey(payer, code) {
  return `${String(payer || "").trim().toLowerCase()}|${String(code || "").trim().toUpperCase()}`;
}

function findUnderpayments(claims, payments, rates) {
  const rateMap = new Map(rates.filter((rate) => rate.active !== false).map((rate) => [rateKey(rate.payer_name, rate.procedure_code), rate]));
  const paidByClaim = new Map();
  payments.filter((payment) => payment.payment_type === "Insurance").forEach((payment) => {
    paidByClaim.set(payment.claim_id, (paidByClaim.get(payment.claim_id) || 0) + (payment.payment_amount || 0));
  });

  return claims.flatMap((claim) => {
    const matchedLines = (claim.service_lines || []).map((line) => ({
      line,
      rate: rateMap.get(rateKey(claim.insurance_company, line.code)),
    })).filter((item) => item.rate);
    if (!matchedLines.length) return [];

    const expected = matchedLines.reduce((sum, item) => sum + (item.rate.expected_allowed_amount || 0) * (item.line.units || 1), 0);
    const actual = paidByClaim.get(claim.id) || 0;
    const difference = expected - actual;
    if (difference <= 0.01) return [];
    return [{ claim, expected, actual, difference, matchedLines }];
  }).sort((a, b) => b.difference - a.difference);
}

export default function RevenueRecovery() {
  const [claims, setClaims] = useState([]);
  const [payments, setPayments] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("underpayments");
  const [form, setForm] = useState({ payer_name: "", procedure_code: "", expected_allowed_amount: "", source: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [claimRows, paymentRows, appealRows, rateRows] = await Promise.all([
        base44.entities.Claim.list("-date_of_service", 2000),
        base44.entities.Payment.list("-payment_date", 5000),
        base44.entities.DenialAppeal.list("-created_date", 1000),
        base44.entities.PayerReimbursementRate.list("payer_name", 2000),
      ]);
      setClaims(claimRows); setPayments(paymentRows); setAppeals(appealRows); setRates(rateRows);
    } catch (error) {
      toast({ title: error.message || "Unable to load Revenue Recovery", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const underpayments = useMemo(() => findUnderpayments(claims, payments, rates), [claims, payments, rates]);
  const potentialRecovery = underpayments.reduce((sum, item) => sum + item.difference, 0);
  const openAppeals = appeals.filter((appeal) => !["Approved", "Closed"].includes(appeal.status));

  const addRate = async () => {
    if (!form.payer_name.trim() || !form.procedure_code.trim() || !(Number(form.expected_allowed_amount) >= 0)) return;
    setSaving(true);
    try {
      await base44.entities.PayerReimbursementRate.create({
        payer_name: form.payer_name.trim(),
        procedure_code: form.procedure_code.trim().toUpperCase(),
        expected_allowed_amount: Number(form.expected_allowed_amount),
        effective_date: format(new Date(), "yyyy-MM-dd"),
        source: form.source.trim(),
        rate_method: "Manual",
        auto_update: false,
        active: true,
      });
      setForm({ payer_name: "", procedure_code: "", expected_allowed_amount: "", source: "" });
      toast({ title: "Expected payer rate added." });
      await load();
    } catch (error) { toast({ title: error.message || "Unable to add rate", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const updateAppeal = async (appeal, status) => {
    const patch = { status };
    if (status === "Submitted") {
      patch.submitted_date = format(new Date(), "yyyy-MM-dd");
      patch.follow_up_date = format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd");
      await base44.entities.Claim.update(appeal.claim_id, { denial_response_status: "Submitted", denial_response_date: patch.submitted_date, next_follow_up_date: patch.follow_up_date });
    }
    if (["Approved", "Closed"].includes(status)) await base44.entities.Claim.update(appeal.claim_id, { denial_response_status: "Resolved", follow_up_status: "Resolved" });
    await base44.entities.DenialAppeal.update(appeal.id, patch);
    toast({ title: `Appeal marked ${status}.` });
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between"><div><h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5" />Revenue Recovery</h1><p className="text-sm text-muted-foreground">Find underpayments and track denial appeals through resolution.</p></div><Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh</Button></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Potential Underpayments" value={currency(potentialRecovery)} tone="text-red-600" />
        <Metric label="Underpaid Claims" value={underpayments.length} tone="text-orange-600" />
        <Metric label="Open Appeals" value={openAppeals.length} tone="text-purple-600" />
        <Metric label="Rates Learned from 835" value={rates.filter(rate => rate.rate_method === "835 Learned").length} tone="text-primary" />
      </div>
      <div className="flex gap-2 flex-wrap">{[["underpayments", "Underpayment Detection"], ["appeals", "Appeal Tracking"], ["rates", "Expected Payer Rates"]].map(([key, label]) => <Button key={key} size="sm" variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>{label}</Button>)}</div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div> : (
        <>
          {tab === "underpayments" && <UnderpaymentTable items={underpayments} hasRates={rates.length > 0} />}
          {tab === "appeals" && <AppealTable appeals={appeals} onStatusChange={updateAppeal} />}
          {tab === "rates" && <><div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-900 mb-4"><strong>Automatic rate learning is on.</strong> Each posted Office Ally 835 teaches ChiroMike the actual paid amount for that payer and CPT. Expected rates update automatically as a rolling average.</div><RateManager rates={rates} form={form} setForm={setForm} onAdd={addRate} saving={saving} /></>}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, tone }) { return <Card><CardHeader className="p-4 pb-1"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="p-4 pt-1"><p className={`text-2xl font-bold ${tone}`}>{value}</p></CardContent></Card>; }

function UnderpaymentTable({ items, hasRates }) {
  if (!hasRates) return <Card><CardContent className="py-10 text-center"><AlertTriangle className="w-9 h-9 text-amber-600 mx-auto mb-2" /><p className="font-semibold">Add expected payer rates first.</p><p className="text-sm text-muted-foreground">ChiroMike will compare actual insurance payments against those verified rates without guessing contract amounts.</p></CardContent></Card>;
  return <div className="border rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-left p-3">Patient / DOS</th><th className="text-left p-3">Payer</th><th className="text-right p-3">Expected</th><th className="text-right p-3">Paid</th><th className="text-right p-3">Potential Underpayment</th></tr></thead><tbody>{items.map((item) => <tr key={item.claim.id} className="border-t"><td className="p-3"><strong>{item.claim.patient_name}</strong><br /><span className="text-xs text-muted-foreground">{item.claim.date_of_service}</span></td><td className="p-3">{item.claim.insurance_company || "—"}</td><td className="p-3 text-right">{currency(item.expected)}</td><td className="p-3 text-right">{currency(item.actual)}</td><td className="p-3 text-right font-bold text-red-600">{currency(item.difference)}</td></tr>)}{!items.length && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No potential underpayments found using the stored rates.</td></tr>}</tbody></table></div>;
}

function AppealTable({ appeals, onStatusChange }) {
  return <div className="border rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-left p-3">Patient / Payer</th><th className="text-left p-3">Denial</th><th className="text-left p-3">Status</th><th className="text-left p-3">Follow-Up</th><th className="text-right p-3">Update</th></tr></thead><tbody>{appeals.map((appeal) => <tr key={appeal.id} className="border-t"><td className="p-3"><strong>{appeal.patient_name}</strong><br /><span className="text-xs text-muted-foreground">{appeal.payer_name || "—"}</span></td><td className="p-3">{appeal.denial_code || "—"}</td><td className="p-3"><Badge variant="secondary">{appeal.status}</Badge></td><td className="p-3">{appeal.follow_up_date || "—"}</td><td className="p-3"><Select value={appeal.status} onValueChange={(value) => onStatusChange(appeal, value)}><SelectTrigger className="w-44 ml-auto"><SelectValue /></SelectTrigger><SelectContent>{["Draft", "Ready for Review", "Submitted", "Response Received", "Approved", "Denied", "Closed"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></td></tr>)}{!appeals.length && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No appeal drafts have been created.</td></tr>}</tbody></table></div>;
}

function RateManager({ rates, form, setForm, onAdd, saving }) {
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="space-y-4"><Card><CardContent className="p-4"><h2 className="font-semibold mb-3">Add Verified Expected Rate</h2><div className="grid md:grid-cols-5 gap-3"><Input value={form.payer_name} onChange={(event) => set("payer_name", event.target.value)} placeholder="Payer name" /><Input value={form.procedure_code} onChange={(event) => set("procedure_code", event.target.value)} placeholder="CPT code" /><Input type="number" min="0" step="0.01" value={form.expected_allowed_amount} onChange={(event) => set("expected_allowed_amount", event.target.value)} placeholder="Allowed amount" /><Input value={form.source} onChange={(event) => set("source", event.target.value)} placeholder="Source / contract" /><Button onClick={onAdd} disabled={saving} className="gap-2"><Plus className="w-4 h-4" />Add Rate</Button></div><p className="text-xs text-muted-foreground mt-2">Only enter rates verified from contracts, fee schedules, or reliable remittance history.</p></CardContent></Card><div className="border rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="text-left p-3">Payer</th><th className="text-left p-3">CPT</th><th className="text-right p-3">Expected Allowed</th><th className="text-left p-3">Source</th></tr></thead><tbody>{rates.map((rate) => <tr key={rate.id} className="border-t"><td className="p-3">{rate.payer_name}</td><td className="p-3 font-mono">{rate.procedure_code}</td><td className="p-3 text-right">{currency(rate.expected_allowed_amount)}</td><td className="p-3">{rate.source || "—"}</td></tr>)}{!rates.length && <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No expected rates stored.</td></tr>}</tbody></table></div></div>;
}

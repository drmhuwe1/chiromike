import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Search, CheckCircle, X, Trash2 } from "lucide-react";

const paymentTypes = ["Insurance", "Patient", "Adjustment", "Denial", "Deductible", "Copay/Coinsurance"];

const emptyForm = {
  payment_type: "Insurance", payment_date: new Date().toISOString().split("T")[0],
  payment_amount: 0, check_number: "", allowed_amount: 0,
  contractual_adjustment: 0, deductible_applied: 0, copay_coinsurance: 0,
  denial_code: "", denial_reason: "", notes: "",
};

export default function PaymentPosting({ onPosted }) {
  const [claims, setClaims] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [payments, setPayments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Claim.filter({ status: "Submitted" }, "-date_of_service", 200).then(setClaims);
    // Also load saved/printed as they may have payments too
    base44.entities.Claim.filter({ status: "Saved" }, "-date_of_service", 200).then(more => setClaims(prev => [...prev, ...more]));
  }, []);

  useEffect(() => {
    if (selectedClaim) {
      base44.entities.Payment.filter({ claim_id: selectedClaim.id }, "-payment_date", 50).then(setPayments);
    }
  }, [selectedClaim]);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleDeletePayment = async (payment) => {
    if (!confirm(`Delete this ${payment.payment_type} posting of $${(payment.payment_amount || 0).toFixed(2)}?`)) return;
    setDeletingId(payment.id);
    await base44.entities.Payment.delete(payment.id);
    // Reverse the amount on the claim
    const newPaid = Math.max(0, (selectedClaim.amount_paid || 0) - (payment.payment_amount || 0));
    await base44.entities.Claim.update(selectedClaim.id, { amount_paid: newPaid });
    setSelectedClaim(prev => ({ ...prev, amount_paid: newPaid }));
    setPayments(prev => prev.filter(p => p.id !== payment.id));
    setDeletingId(null);
    toast({ title: 'Payment posting deleted' });
    if (onPosted) onPosted();
  };

  const filtered = search
    ? claims.filter(c => c.patient_name?.toLowerCase().includes(search.toLowerCase()) || c.date_of_service?.includes(search))
    : claims.slice(0, 20);

  const handlePost = async () => {
    if (!selectedClaim) return;
    setSaving(true);
    await base44.entities.Payment.create({
      ...form,
      claim_id: selectedClaim.id,
      patient_id: selectedClaim.patient_id,
      patient_name: selectedClaim.patient_name,
      date_of_service: selectedClaim.date_of_service,
      insurance_company: selectedClaim.insurance_company,
    });

    // CM-2: Only mark as Paid if new total covers the full charge
    const newPaid = (selectedClaim.amount_paid || 0) + (form.payment_amount || 0);
    const newStatus = form.payment_type === "Denial" ? "Denied"
      : (form.payment_type === "Insurance" || form.payment_type === "Patient") && newPaid >= (selectedClaim.total_charge || 0) ? "Paid"
      : selectedClaim.status;

    await base44.entities.Claim.update(selectedClaim.id, { status: newStatus, amount_paid: newPaid });

    toast({ title: "Payment posted!" });
    setForm(emptyForm);
    setSelectedClaim(null);
    setPayments([]);
    setSaving(false);
    if (onPosted) onPosted();
  };

  return (
    <div className="space-y-4">
      {!selectedClaim ? (
        <div>
          <p className="text-sm text-muted-foreground mb-3">Search for a submitted claim to post a payment or denial against it.</p>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by patient name or date..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2.5 px-4 font-medium">Date</th>
                  <th className="text-left py-2.5 px-4 font-medium">Patient</th>
                  <th className="text-left py-2.5 px-4 font-medium hidden md:table-cell">Insurance</th>
                  <th className="text-right py-2.5 px-4 font-medium">Billed</th>
                  <th className="text-right py-2.5 px-4 font-medium">Paid</th>
                  <th className="py-2.5 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="py-2.5 px-4">{c.date_of_service}</td>
                    <td className="py-2.5 px-4 font-medium">{c.patient_name}</td>
                    <td className="py-2.5 px-4 hidden md:table-cell text-muted-foreground">{c.insurance_company || "—"}</td>
                    <td className="py-2.5 px-4 text-right">${(c.total_charge || 0).toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right">${(c.amount_paid || 0).toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-right">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedClaim(c)}>
                        <Plus className="w-3 h-3 mr-1" /> Post
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No submitted claims found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Claim header */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">{selectedClaim.patient_name} — {selectedClaim.date_of_service}</p>
              <p className="text-sm text-blue-700">{selectedClaim.insurance_company} &nbsp;|&nbsp; Billed: ${(selectedClaim.total_charge || 0).toFixed(2)} &nbsp;|&nbsp; Paid so far: ${(selectedClaim.amount_paid || 0).toFixed(2)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedClaim(null)}><X className="w-4 h-4" /></Button>
          </div>

          {/* Existing payments */}
          {payments.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <p className="text-xs font-semibold text-muted-foreground px-4 py-2 border-b bg-muted/30">Prior Postings</p>
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2 border-b last:border-0 text-sm gap-3">
                  <span className="text-muted-foreground">{p.payment_date}</span>
                  <span className="font-medium">{p.payment_type}</span>
                  {p.denial_code && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-mono">{p.denial_code}</span>}
                  <span className="font-semibold flex-1 text-right">${(p.payment_amount || 0).toFixed(2)}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => handleDeletePayment(p)} disabled={deletingId === p.id}>
                    {deletingId === p.id ? <div className="w-3 h-3 border border-muted border-t-destructive rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Payment form */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Post New Payment / EOB</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Payment Type</Label>
                <Select value={form.payment_type} onValueChange={v => set("payment_type", v)}>
                  <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Payment Date</Label>
                <Input className="h-8 mt-0.5" type="date" value={form.payment_date} onChange={e => set("payment_date", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Amount Paid ($)</Label>
                <Input className="h-8 mt-0.5" type="number" step="0.01" value={form.payment_amount} onChange={e => set("payment_amount", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Check / EFT #</Label>
                <Input className="h-8 mt-0.5" value={form.check_number} onChange={e => set("check_number", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Allowed Amount ($)</Label>
                <Input className="h-8 mt-0.5" type="number" step="0.01" value={form.allowed_amount} onChange={e => set("allowed_amount", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Contractual Adj ($)</Label>
                <Input className="h-8 mt-0.5" type="number" step="0.01" value={form.contractual_adjustment} onChange={e => set("contractual_adjustment", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Deductible Applied ($)</Label>
                <Input className="h-8 mt-0.5" type="number" step="0.01" value={form.deductible_applied} onChange={e => set("deductible_applied", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Copay / Coins ($)</Label>
                <Input className="h-8 mt-0.5" type="number" step="0.01" value={form.copay_coinsurance} onChange={e => set("copay_coinsurance", parseFloat(e.target.value) || 0)} />
              </div>
              {form.payment_type === "Denial" && (
                <>
                  <div>
                    <Label className="text-xs">Denial Code (e.g. CO-97)</Label>
                    <Input className="h-8 mt-0.5 font-mono" value={form.denial_code} onChange={e => set("denial_code", e.target.value)} placeholder="CO-97" />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Denial Reason</Label>
                    <Input className="h-8 mt-0.5" value={form.denial_reason} onChange={e => set("denial_reason", e.target.value)} />
                  </div>
                </>
              )}
              <div className="col-span-2 md:col-span-4">
                <Label className="text-xs">Notes</Label>
                <Input className="h-8 mt-0.5" value={form.notes} onChange={e => set("notes", e.target.value)} />
              </div>
            </div>
            <Button onClick={handlePost} disabled={saving} className="mt-2">
              <CheckCircle className="w-4 h-4 mr-2" /> Post Payment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
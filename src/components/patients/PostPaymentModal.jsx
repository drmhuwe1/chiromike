import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PAYMENT_TYPES = ["Insurance", "Patient", "Adjustment", "Denial", "Deductible", "Copay/Coinsurance"];

export default function PostPaymentModal({ patient, claim, onClose, onSaved }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    payment_date: today,
    date_of_service: claim?.date_of_service || today,
    payment_type: "Patient",
    payment_amount: claim ? ((claim.total_charge || 0) - (claim.amount_paid || 0)).toFixed(2) : "",
    check_number: "",
    allowed_amount: "",
    contractual_adjustment: "",
    deductible_applied: "",
    copay_coinsurance: "",
    denial_code: "",
    denial_reason: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!form.payment_date || !form.payment_amount) {
      toast({ title: "Payment date and amount are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Payment.create({
        claim_id: claim?.id || "",
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        date_of_service: form.date_of_service,
        insurance_company: claim?.insurance_company || patient.insurance_company || "",
        payment_date: form.payment_date,
        payment_type: form.payment_type,
        payment_amount: parseFloat(form.payment_amount) || 0,
        check_number: form.check_number,
        allowed_amount: form.allowed_amount ? parseFloat(form.allowed_amount) : undefined,
        contractual_adjustment: form.contractual_adjustment ? parseFloat(form.contractual_adjustment) : undefined,
        deductible_applied: form.deductible_applied ? parseFloat(form.deductible_applied) : undefined,
        copay_coinsurance: form.copay_coinsurance ? parseFloat(form.copay_coinsurance) : undefined,
        denial_code: form.denial_code,
        denial_reason: form.denial_reason,
        notes: form.notes,
      });

      // CM-2: Update claim amount_paid; only mark Paid if full charge is covered
      if (claim?.id) {
        const newPaid = (claim.amount_paid || 0) + (parseFloat(form.payment_amount) || 0);
        const newStatus = newPaid >= (claim.total_charge || 0) ? 'Paid' : claim.status;
        await base44.entities.Claim.update(claim.id, { amount_paid: newPaid, status: newStatus });
      }

      toast({ title: "Payment posted successfully" });
      onSaved?.();
      onClose();
    } catch (e) {
      toast({ title: e.message || "Failed to post payment", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Post Payment</h2>
            <p className="text-sm text-muted-foreground">{patient.first_name} {patient.last_name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {claim && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <span className="font-semibold text-blue-900">Linked Claim: </span>
            <span className="text-blue-800">{claim.date_of_service} · {claim.visit_type} · ${(claim.total_charge || 0).toFixed(2)} charged</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Date of Service *</Label>
            <Input type="date" className="h-8 mt-0.5" value={form.date_of_service} onChange={e => set("date_of_service", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Payment Date *</Label>
            <Input type="date" className="h-8 mt-0.5" value={form.payment_date} onChange={e => set("payment_date", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Payment Type *</Label>
            <select
              className="mt-0.5 h-8 w-full border border-input rounded-md px-2 text-sm"
              value={form.payment_type}
              onChange={e => set("payment_type", e.target.value)}
            >
              {PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Amount *</Label>
            <div className="relative mt-0.5">
              <DollarSign className="absolute left-2 top-1.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input type="number" step="0.01" className="h-8 pl-6" value={form.payment_amount} onChange={e => set("payment_amount", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Check / EFT Number</Label>
            <Input className="h-8 mt-0.5" value={form.check_number} onChange={e => set("check_number", e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <Label className="text-xs">Allowed Amount</Label>
            <div className="relative mt-0.5">
              <DollarSign className="absolute left-2 top-1.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input type="number" step="0.01" className="h-8 pl-6" value={form.allowed_amount} onChange={e => set("allowed_amount", e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Contractual Adjustment</Label>
            <div className="relative mt-0.5">
              <DollarSign className="absolute left-2 top-1.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input type="number" step="0.01" className="h-8 pl-6" value={form.contractual_adjustment} onChange={e => set("contractual_adjustment", e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Copay / Coinsurance</Label>
            <div className="relative mt-0.5">
              <DollarSign className="absolute left-2 top-1.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input type="number" step="0.01" className="h-8 pl-6" value={form.copay_coinsurance} onChange={e => set("copay_coinsurance", e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>

        {form.payment_type === "Denial" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Denial Code (e.g. CO-97)</Label>
              <Input className="h-8 mt-0.5" value={form.denial_code} onChange={e => set("denial_code", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Denial Reason</Label>
              <Input className="h-8 mt-0.5" value={form.denial_reason} onChange={e => set("denial_reason", e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs">Notes</Label>
          <textarea
            className="mt-0.5 w-full border border-input rounded-md px-3 py-2 text-sm min-h-[60px]"
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            placeholder="Optional notes..."
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-10">
            {saving ? "Posting..." : "Post Payment"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1 h-10">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
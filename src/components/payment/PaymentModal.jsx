import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, Plus, Trash2, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PACKAGE_VISIT_COUNT = {
  "Laser Package": 12,
  "Adjustment Package": 12,
  "Laser Lipo Package": 10,
};

const QUICK_ITEMS = [
  { label: "Cash Exam", amount: 110 },
  { label: "Maintenance Tx", amount: 45 },
  { label: "Maint/Laser Tx", amount: 65 },
  { label: "6 Visit Tx Plan", amount: 325 },
  { label: "12 Visit Tx Plan", amount: 650 },
  { label: "Copay ($20)", amount: 20 },
  { label: "Laser Package (12 visits)", amount: 650, packageType: "Laser Package" },
  { label: "Adjustment Package (12 visits)", amount: 450, packageType: "Adjustment Package" },
  { label: "Laser Lipo Package (10 visits)", amount: 500, packageType: "Laser Lipo Package" },
];

export default function PaymentModal({ claim, patient, onClose, onSuccess: _onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [dosDate, setDosDate] = useState(claim?.date_of_service || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const { toast } = useToast();

  // Pre-load from claim total if available
  useEffect(() => {
    if (claim?.total_charge > 0) {
      setCartItems([{ label: claim.visit_type || "Visit Charge", amount: claim.total_charge }]);
    }
  }, []);

  const total = cartItems.reduce((sum, item) => sum + item.amount, 0);

  const addQuickItem = (item) => {
    setCartItems(prev => [...prev, { ...item }]);
  };

  const addCustomItem = () => {
    const amt = parseFloat(customAmount);
    if (!customLabel.trim() || isNaN(amt) || amt <= 0) {
      toast({ title: "Enter a description and valid amount", variant: "destructive" });
      return;
    }
    setCartItems(prev => [...prev, { label: customLabel.trim(), amount: amt }]);
    setCustomLabel("");
    setCustomAmount("");
  };

  const removeItem = (idx) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCheckout = async () => {
    if (!patient?.email) {
      toast({ title: "Patient email required to send receipt", variant: "destructive" });
      return;
    }
    if (cartItems.length === 0) {
      toast({ title: "Add at least one item to charge", variant: "destructive" });
      return;
    }
    if (total <= 0) {
      toast({ title: "Total must be greater than $0", variant: "destructive" });
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await base44.functions.invoke("createPaymentCheckout", {
        claim_id: claim?.id || null,
        patient_id: patient.id,
        patient_email: patient.email,
        amount: Math.round(total * 100),
        date_of_service: dosDate,
        description: cartItems.map(i => `${i.label} $${i.amount.toFixed(2)}`).join(", "),
      });

      if (res.data.checkout_url) {
        // Create PatientPackage records for any package items
        const packageItems = cartItems.filter(i => i.packageType);
        for (const item of packageItems) {
          await base44.entities.PatientPackage.create({
            patient_id: patient.id,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            package_type: item.packageType,
            total_visits: PACKAGE_VISIT_COUNT[item.packageType] || 12,
            visits_used: 0,
            visit_log: [],
            purchase_date: dosDate || new Date().toISOString().split("T")[0],
            amount_paid: item.amount,
            status: "active",
          });
        }

        if (window.self !== window.top) {
          window.open(res.data.checkout_url, "_blank");
        } else {
          window.location.href = res.data.checkout_url;
        }
      }
    } catch (e) {
      setErrorMsg(e.message || "Failed to create payment");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Collect Patient Payment</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Patient + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Patient</Label>
            <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm font-medium">
              {patient?.first_name} {patient?.last_name}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Date of Service</Label>
            <Input type="date" value={dosDate} onChange={e => setDosDate(e.target.value)} className="mt-1 h-9" disabled={loading} />
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Quick Add</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_ITEMS.map(item => (
              <button
                key={item.label}
                onClick={() => addQuickItem(item)}
                disabled={loading}
                className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors flex items-center gap-1 ${
                  item.packageType
                    ? "bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100"
                    : "bg-muted hover:bg-primary hover:text-primary-foreground border-border"
                }`}
              >
                {item.packageType && <Package className="w-3 h-3" />}
                {item.label} — ${item.amount}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Custom Charge</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Description (e.g. Copay)"
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              className="h-9 flex-1"
              disabled={loading}
            />
            <Input
              type="number"
              placeholder="$0.00"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              className="h-9 w-28"
              step="0.01"
              min="0"
              disabled={loading}
              onKeyDown={e => e.key === "Enter" && addCustomItem()}
            />
            <Button size="sm" variant="outline" onClick={addCustomItem} disabled={loading} className="h-9 px-3">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Cart */}
        {cartItems.length > 0 && (
          <div className="bg-muted/40 border border-border rounded-xl p-3 space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Cart</Label>
            {cartItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">${item.amount.toFixed(2)}</span>
                  <button onClick={() => removeItem(idx)} disabled={loading} className="text-destructive hover:opacity-70">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
          <strong>Accepts:</strong> Tap (NFC), Apple Pay, Google Pay, Samsung Pay, and all major cards.
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            onClick={handleCheckout}
            disabled={loading || !dosDate || cartItems.length === 0}
            className="flex-1 h-11"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
            ) : (
              <>💳 Charge ${total.toFixed(2)}</>
            )}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 h-11">
            Cancel
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Redirects to secure Stripe checkout. Receipt emailed automatically.
        </p>
      </div>
    </div>
  );
}
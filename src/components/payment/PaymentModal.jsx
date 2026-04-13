import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PaymentModal({ claim, patient, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [dosDate, setDosDate] = useState(claim?.date_of_service || "");
  const [status, setStatus] = useState(null); // "processing", "success", "error"
  const [errorMsg, setErrorMsg] = useState("");
  const { toast } = useToast();

  const amount = claim?.total_charge || 0;

  const handleCheckout = async () => {
    if (!patient?.email) {
      toast({ title: "Patient email required to send receipt", variant: "destructive" });
      return;
    }

    setLoading(true);
    setStatus("processing");

    try {
      // Create checkout session
      const res = await base44.functions.invoke("createPaymentCheckout", {
        claim_id: claim.id,
        patient_id: patient.id,
        patient_email: patient.email,
        amount: Math.round(amount * 100), // Stripe expects cents
        date_of_service: dosDate,
      });

      if (res.data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = res.data.checkout_url;
      }
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message || "Failed to create payment");
      setLoading(false);
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Collect Patient Payment</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {status === "error" && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">{errorMsg}</div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs text-amber-700 uppercase font-semibold tracking-wide">Amount Due</p>
          <p className="text-3xl font-bold text-amber-900 mt-1">${amount.toFixed(2)}</p>
        </div>

        <div>
          <Label className="text-sm">Patient Name</Label>
          <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm">
            {patient?.first_name} {patient?.last_name}
          </div>
        </div>

        <div>
          <Label className="text-sm">Date of Service</Label>
          <Input
            type="date"
            value={dosDate}
            onChange={e => setDosDate(e.target.value)}
            className="mt-1"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">Change if this payment is for a different visit</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
          <strong>Payment Methods:</strong> Tap (NFC), Apple Pay, Google Pay, Samsung Pay, and all major cards are supported.
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleCheckout}
            disabled={loading || !dosDate}
            className="flex-1 h-11"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting to Stripe...
              </>
            ) : (
              <>
                💳 Proceed to Payment
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          You'll be redirected to a secure Stripe checkout. Payment receipt will be emailed automatically.
        </p>
      </div>
    </div>
  );
}
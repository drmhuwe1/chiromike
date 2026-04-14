import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PaymentModal({ claim, patient, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [dosDate, setDosDate] = useState(claim?.date_of_service || "");
  const [status, setStatus] = useState(null); // "processing", "success", "error"
  const [errorMsg, setErrorMsg] = useState("");
  const [claims, setClaims] = useState([]);
  const [selectedClaimIds, setSelectedClaimIds] = useState([claim?.id]);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadPatientClaims = async () => {
      const patientClaims = await base44.entities.Claim.filter({ patient_id: patient.id }, "-date_of_service", 100);
      setClaims(patientClaims);
    };
    if (patient?.id) loadPatientClaims();
  }, [patient?.id]);

  const selectedClaims = claims.filter(c => selectedClaimIds.includes(c.id));
  const amount = selectedClaims.reduce((sum, c) => sum + (c.total_charge || 0), 0);
  const unpaidClaims = claims.filter(c => (c.amount_paid || 0) < (c.total_charge || 0));

  const toggleClaimSelection = (claimId) => {
    setSelectedClaimIds(prev =>
      prev.includes(claimId)
        ? prev.filter(id => id !== claimId)
        : [...prev, claimId]
    );
  };

  const handleCheckout = async () => {
    if (!patient?.email) {
      toast({ title: "Patient email required to send receipt", variant: "destructive" });
      return;
    }
    if (selectedClaimIds.length === 0) {
      toast({ title: "Select at least one claim to charge", variant: "destructive" });
      return;
    }

    setLoading(true);
    setStatus("processing");

    try {
      // Create checkout session for the primary claim
      const res = await base44.functions.invoke("createPaymentCheckout", {
        claim_id: claim.id,
        patient_id: patient.id,
        patient_email: patient.email,
        amount: Math.round(amount * 100), // Stripe expects cents
        date_of_service: dosDate,
      });

      if (res.data.checkout_url) {
        // If running inside an iframe (preview), open in new tab instead
        if (window.self !== window.top) {
          window.open(res.data.checkout_url, "_blank");
        } else {
          window.location.href = res.data.checkout_url;
        }
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

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs text-amber-700 uppercase font-semibold tracking-wide">Total Amount Due</p>
          <p className="text-3xl font-bold text-amber-900 mt-1">${amount.toFixed(2)}</p>
          <p className="text-xs text-amber-600 mt-2">{selectedClaimIds.length} claim(s) selected</p>
        </div>

        <div>
          <Label className="text-sm">Patient</Label>
          <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm font-medium">
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
          <p className="text-xs text-muted-foreground mt-1">Primary visit date for this payment</p>
        </div>

        {unpaidClaims.length > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between text-sm font-semibold text-blue-900 hover:text-blue-700"
            >
              <span>💰 {unpaidClaims.length} Unpaid Visits Available</span>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showHistory && (
              <div className="mt-3 space-y-2 pt-3 border-t border-blue-200">
                {unpaidClaims.map(c => {
                  const balance = (c.total_charge || 0) - (c.amount_paid || 0);
                  return (
                    <label key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-blue-100 cursor-pointer">
                      <Checkbox
                        checked={selectedClaimIds.includes(c.id)}
                        onCheckedChange={() => toggleClaimSelection(c.id)}
                        disabled={loading}
                      />
                      <div className="flex-1 text-xs">
                        <div className="font-medium">{c.date_of_service} • {c.visit_type}</div>
                        <div className="text-blue-700">Balance: ${balance.toFixed(2)}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
          <strong>Payment Methods:</strong> Tap (NFC), Apple Pay, Google Pay, Samsung Pay, and all major cards.
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleCheckout}
            disabled={loading || !dosDate || selectedClaimIds.length === 0}
            className="flex-1 h-11"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                💳 Proceed to Payment (${amount.toFixed(2)})
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
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
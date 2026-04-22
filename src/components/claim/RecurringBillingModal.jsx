import { useState } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { RefreshCw, ExternalLink, AlertCircle } from "lucide-react";

// These map to the Stripe products/prices you have configured
const SUBSCRIPTION_PLANS = [
  { name: "Membership - Basic", price_id: "price_1M45fDGRpSbA8EZgv2smNpb2", amount: "$35/mo", visits: 4 },
  { name: "Membership - Standard", price_id: "price_1M45fDGRpSbA8EZgJGuW8mb1", amount: "$60/mo", visits: 8 },
  { name: "Membership - Plus", price_id: "price_1M45fDGRpSbA8EZg0jf9qbTG", amount: "$90/mo", visits: 12 },
  { name: "Membership - Premium", price_id: "price_1M45fDGRpSbA8EZgwYi1XLD5", amount: "$100/mo", visits: 16 },
];

export default function RecurringBillingModal({ patient, onClose }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isIframe = () => {
    try { return window.self !== window.top; } catch { return true; }
  };

  const handleSubscribe = async () => {
    if (isIframe()) {
      alert("Stripe checkout only works from the published app. Please open the app directly.");
      return;
    }
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('createSubscriptionCheckout', {
        patient_id: patient?.id || '',
        patient_name: patient ? `${patient.first_name} ${patient.last_name}` : '',
        patient_email: patient?.email || '',
        price_id: selectedPlan.price_id,
        plan_name: selectedPlan.name,
        visits_per_month: selectedPlan.visits,
      });
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
        onClose();
      } else {
        setError('Could not create checkout session.');
      }
    } catch (e) {
      setError(e.message || 'Failed to start subscription.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Monthly Membership Plan</h2>
            {patient && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Setting up recurring billing for <span className="font-semibold">{patient.first_name} {patient.last_name}</span>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select Plan</p>
          {SUBSCRIPTION_PLANS.map(plan => (
            <label key={plan.price_id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedPlan?.price_id === plan.price_id ? 'border-blue-500 bg-blue-50' : 'border-border hover:bg-muted/50'}`}>
              <input
                type="radio"
                name="plan"
                checked={selectedPlan?.price_id === plan.price_id}
                onChange={() => setSelectedPlan(plan)}
                className="w-4 h-4 accent-blue-600"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold">{plan.name}</span>
                <span className="text-xs text-muted-foreground ml-2">— up to {plan.visits} visits/mo</span>
              </div>
            </label>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Patient will be redirected to Stripe to enter payment details. Auto-debits monthly until cancelled.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 gap-1.5"
            disabled={!selectedPlan || loading}
            onClick={handleSubscribe}
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <ExternalLink className="w-4 h-4" />
            }
            Start Subscription
          </Button>
        </div>
      </div>
    </div>
  );
}
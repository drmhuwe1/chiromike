import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, FileText, Info, X } from "lucide-react";

export default function PayerAlertBanner({ payerType, serviceLines = [] }) {
  const [profile, setProfile] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
    setProfile(null);
    if (!payerType) return;
    base44.entities.PayerProfile.filter({ payer_type: payerType, active: true }, "-updated_date", 1)
      .then(data => setProfile(data[0] || null));
  }, [payerType]);

  if (!profile || dismissed) return null;

  const hasWarning = profile.warning_notes;
  const hasBilling = profile.billing_notes;
  const hasDoc = profile.documentation_reminders;
  const usedCodes = new Set(serviceLines.map(line => line.code).filter(Boolean));
  const alternatives = (profile.covered_treatment_alternatives || []).filter(item => usedCodes.has(item.excluded_code));

  if (!hasWarning && !hasBilling && !hasDoc && alternatives.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-amber-400 hover:text-amber-600"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 font-semibold text-amber-800 text-sm">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {profile.name} — Billing Reminders
      </div>
      {hasWarning && (
        <div className="flex gap-2 text-xs text-amber-900">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
          <span><strong>⚠ Watch out:</strong> {profile.warning_notes}</span>
        </div>
      )}
      {hasBilling && (
        <div className="flex gap-2 text-xs text-amber-900">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
          <span><strong>Billing:</strong> {profile.billing_notes}</span>
        </div>
      )}
      {hasDoc && (
        <div className="flex gap-2 text-xs text-amber-900">
          <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-600" />
          <span><strong>Documentation:</strong> {profile.documentation_reminders}</span>
        </div>
      )}
      {profile.default_modifiers && (
        <div className="text-xs text-amber-800 bg-amber-100 rounded px-2 py-1 inline-block">
          💡 Default modifier for this payer: <strong>{profile.default_modifiers}</strong>
        </div>
      )}
      {alternatives.length > 0 && <div className="border-t border-amber-200 pt-2 space-y-2"><p className="text-xs font-semibold text-amber-900">Potential covered treatment alternatives — provider and coding review required</p>{alternatives.map((item, index) => <div key={`${item.excluded_code}-${index}`} className="bg-white/70 rounded p-2 text-xs text-amber-950"><p><strong>{item.excluded_code}</strong> may be non-covered. Stored alternative: <strong>{item.alternative_code}</strong> — {item.alternative_description || "No description"}.</p><p>Coverage: {item.coverage_note || "Verify with payer."}</p><p className="mt-1 font-medium text-red-700">Do not swap codes. Use the alternative only if it accurately represents a clinically appropriate service actually provided and documentation supports it. Otherwise keep the service cash-pay or modify the treatment plan.</p>{item.verification_source && <p className="mt-1 text-muted-foreground">Source: {item.verification_source}</p>}</div>)}</div>}
    </div>
  );
}

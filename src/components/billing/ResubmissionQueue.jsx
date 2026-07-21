import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Copy, Clock, BrainCircuit } from "lucide-react";
import DenialAnalyzerModal from "./DenialAnalyzerModal";

const DENIAL_TIPS = {
  "CO-97": "Benefit for this service included in payment for another service — check bundling rules",
  "CO-4": "Service inconsistent with modifier — verify modifier used",
  "CO-11": "Diagnosis inconsistent with procedure — check dx pointers",
  "CO-22": "Coordination of benefits — patient may have secondary insurance",
  "CO-50": "Not medically necessary — attach documentation",
  "CO-29": "Time limit for filing expired — check timely filing rules",
  "CO-16": "Claim lacks info — resubmit with missing data",
  "CO-45": "Contractual adjustment — no action needed",
};

function daysSince(dos) {
  if (!dos) return null;
  return Math.floor((new Date() - new Date(dos)) / 86400000);
}

export default function ResubmissionQueue({ claims, payments }) {
  const navigate = useNavigate();
  const [analyzingClaim, setAnalyzingClaim] = useState(null);

  // Denied claims + claims with denial payments
  const deniedClaimIds = new Set(payments.filter(p => p.payment_type === "Denial").map(p => p.claim_id));
  const queue = claims
    .filter(c => c.status === "Denied" || deniedClaimIds.has(c.id))
    .sort((a, b) => new Date(a.date_of_service) - new Date(b.date_of_service));

  // Get denial info per claim
  const denialByClaimId = {};
  for (const p of payments) {
    if (p.payment_type === "Denial" || p.denial_code) {
      denialByClaimId[p.claim_id] = p;
    }
  }

  return (
    <div className="space-y-3">
      {queue.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>{queue.length} claim{queue.length > 1 ? "s" : ""}</strong> need attention or resubmission</span>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-2.5 px-4 font-medium">Date</th>
              <th className="text-left py-2.5 px-4 font-medium">Patient</th>
              <th className="text-left py-2.5 px-4 font-medium hidden md:table-cell">Denial Code</th>
              <th className="text-left py-2.5 px-4 font-medium hidden lg:table-cell">Reason / Action</th>
              <th className="text-right py-2.5 px-4 font-medium">Amount</th>
              <th className="text-right py-2.5 px-4 font-medium">Age</th>
              <th className="py-2.5 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {queue.map(c => {
              const denial = denialByClaimId[c.id];
              const tip = denial?.denial_code ? DENIAL_TIPS[denial.denial_code] : null;
              const age = daysSince(c.date_of_service);
              return (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="py-2.5 px-4">{c.date_of_service}</td>
                  <td className="py-2.5 px-4 font-medium">{c.patient_name}</td>
                  <td className="py-2.5 px-4 hidden md:table-cell">
                    {denial?.denial_code
                      ? <span className="inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono text-xs">{denial.denial_code}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2.5 px-4 hidden lg:table-cell text-xs text-muted-foreground max-w-xs">
                    {denial?.denial_reason || tip || "Review and resubmit"}
                  </td>
                  <td className="py-2.5 px-4 text-right">${(c.total_charge || 0).toFixed(2)}</td>
                  <td className={`py-2.5 px-4 text-right text-xs font-medium ${age > 90 ? "text-red-600 font-bold" : "text-orange-500"}`}>
                    <div className="flex items-center justify-end gap-1">
                      {age > 90 && <Clock className="w-3 h-3" />}
                      {age}d
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Button size="sm" className="h-7 text-xs mr-2" onClick={() => setAnalyzingClaim(c)}>
                      <BrainCircuit className="w-3 h-3 mr-1" />Why Wasn't I Paid?
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/claim-builder?duplicate=${c.id}`)}>
                      <Copy className="w-3 h-3 mr-1" /> Resubmit
                    </Button>
                  </td>
                </tr>
              );
            })}
            {queue.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No denied claims — nothing to resubmit!</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {analyzingClaim && <DenialAnalyzerModal claim={analyzingClaim} open={Boolean(analyzingClaim)} onOpenChange={(next) => { if (!next) setAnalyzingClaim(null); }} />}
    </div>
  );
}

import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, Circle, Package } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PACKAGE_COLORS = {
  "Laser Package": "blue",
  "Adjustment Package": "green",
  "Laser Lipo Package": "purple",
};

export default function PackageTrackerModal({ pkg, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const color = PACKAGE_COLORS[pkg.package_type] || "blue";

  const visitLog = pkg.visit_log || [];
  const usedVisits = pkg.visits_used || 0;
  const totalVisits = pkg.total_visits || 12;
  const remaining = totalVisits - usedVisits;

  const handleCheckVisit = async (visitNum) => {
    const alreadyChecked = visitLog.some(v => v.visit_number === visitNum);
    if (alreadyChecked) return; // only allow forward progression

    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const newLog = [...visitLog, { visit_number: visitNum, date: today, notes: "" }];
    const newUsed = newLog.length;
    const newStatus = newUsed >= totalVisits ? "completed" : "active";

    await base44.entities.PatientPackage.update(pkg.id, {
      visit_log: newLog,
      visits_used: newUsed,
      status: newStatus,
    });

    toast({ title: `Visit ${visitNum} of ${totalVisits} marked — ${totalVisits - newUsed} remaining` });
    setLoading(false);
    onUpdated();
  };

  const handleUncheck = async (visitNum) => {
    // Only allow unchecking the last checked visit
    const maxChecked = Math.max(...visitLog.map(v => v.visit_number));
    if (visitNum !== maxChecked) {
      toast({ title: "You can only uncheck the most recent visit", variant: "destructive" });
      return;
    }
    setLoading(true);
    const newLog = visitLog.filter(v => v.visit_number !== visitNum);
    await base44.entities.PatientPackage.update(pkg.id, {
      visit_log: newLog,
      visits_used: newLog.length,
      status: "active",
    });
    toast({ title: `Visit ${visitNum} unchecked` });
    setLoading(false);
    onUpdated();
  };

  const colorClasses = {
    blue: { bg: "bg-blue-50", border: "border-blue-300", title: "text-blue-800", badge: "bg-blue-600", checked: "text-blue-600", ring: "ring-blue-300" },
    green: { bg: "bg-green-50", border: "border-green-300", title: "text-green-800", badge: "bg-green-600", checked: "text-green-600", ring: "ring-green-300" },
    purple: { bg: "bg-purple-50", border: "border-purple-300", title: "text-purple-800", badge: "bg-purple-600", checked: "text-purple-600", ring: "ring-purple-300" },
  }[color];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center`}>
              <Package className={`w-5 h-5 ${colorClasses.checked}`} />
            </div>
            <div>
              <h2 className="font-bold text-base">{pkg.package_type}</h2>
              <p className="text-xs text-muted-foreground">{pkg.patient_name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Progress bar */}
        <div className={`${colorClasses.bg} border ${colorClasses.border} rounded-xl p-4`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm font-semibold ${colorClasses.title}`}>{usedVisits} of {totalVisits} visits used</span>
            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${colorClasses.badge}`}>
              {pkg.status === "completed" ? "Completed" : `${remaining} left`}
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-2.5 border border-border">
            <div
              className={`h-2.5 rounded-full transition-all ${colorClasses.badge}`}
              style={{ width: `${Math.min((usedVisits / totalVisits) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Visit checkboxes */}
        <div>
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-semibold">Tap a visit to mark it used</p>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: totalVisits }, (_, i) => {
              const visitNum = i + 1;
              const logEntry = visitLog.find(v => v.visit_number === visitNum);
              const isChecked = !!logEntry;
              return (
                <button
                  key={visitNum}
                  disabled={loading || (pkg.status === "completed" && !isChecked)}
                  onClick={() => isChecked ? handleUncheck(visitNum) : handleCheckVisit(visitNum)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all
                    ${isChecked
                      ? `${colorClasses.bg} ${colorClasses.border} ring-1 ${colorClasses.ring}`
                      : "border-border hover:bg-muted"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={logEntry ? `Visit ${visitNum} — ${logEntry.date}` : `Mark visit ${visitNum}`}
                >
                  {isChecked
                    ? <CheckCircle2 className={`w-5 h-5 ${colorClasses.checked}`} />
                    : <Circle className="w-5 h-5 text-muted-foreground" />
                  }
                  <span className="text-xs font-semibold">{visitNum}</span>
                  {logEntry && <span className="text-[9px] text-muted-foreground leading-tight">{logEntry.date.slice(5)}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {pkg.status === "completed" && (
          <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-3 text-sm text-green-800 font-semibold text-center">
            ✅ All {totalVisits} visits completed!
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Purchased: {pkg.purchase_date || "N/A"} {pkg.amount_paid ? `· $${pkg.amount_paid}` : ""}
        </div>

        <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
import { useState } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

const FEATURE_INVENTORY = [
  // Pages / Routes
  { name: "Dashboard", type: "Page", route: "/", status: "active", risk: "low", owner: "Admin" },
  { name: "Patients", type: "Page", route: "/patients", status: "active", risk: "low", owner: "Admin" },
  { name: "Calendar", type: "Page", route: "/calendar", status: "active", risk: "medium", owner: "Admin" },
  { name: "Patient Account", type: "Page", route: "/patient-account", status: "active", risk: "low", owner: "Admin" },
  { name: "Claim Builder", type: "Page", route: "/claim-builder", status: "active", risk: "high", owner: "Admin" },
  { name: "New Patient Exam", type: "Page", route: "/new-patient-exam", status: "active", risk: "medium", owner: "Admin" },
  { name: "Re-Examination", type: "Page", route: "/re-examination", status: "active", risk: "medium", owner: "Admin" },
  { name: "Saved Claims", type: "Page", route: "/saved-claims", status: "active", risk: "medium", owner: "Admin" },
  { name: "Code Library", type: "Page", route: "/code-library", status: "active", risk: "low", owner: "Admin" },
  { name: "Quick Templates", type: "Page", route: "/templates", status: "active", risk: "low", owner: "Admin" },
  { name: "Billing Dashboard", type: "Page", route: "/billing", status: "active", risk: "high", owner: "Admin" },
  { name: "Task Center", type: "Page", route: "/task-center", status: "active", risk: "medium", owner: "Admin" },
  { name: "Revenue Recovery", type: "Page", route: "/revenue-recovery", status: "active", risk: "medium", owner: "Admin" },
  { name: "AI Operations Center", type: "Page", route: "/ai-operations", status: "active", risk: "low", owner: "Admin" },
  { name: "SOAP Notes", type: "Page", route: "/soap-notes", status: "active", risk: "high", owner: "Admin" },
  { name: "Reports", type: "Page", route: "/reports", status: "active", risk: "low", owner: "Admin" },
  { name: "Financial Reports", type: "Page", route: "/financial-reports", status: "active", risk: "medium", owner: "Admin" },
  { name: "Office Settings", type: "Page", route: "/settings", status: "active", risk: "medium", owner: "Admin" },
  { name: "Office Ally Submissions", type: "Page", route: "/office-ally", status: "active", risk: "high", owner: "Admin" },
  { name: "Office Ally Settings", type: "Page", route: "/office-ally-settings", status: "active", risk: "high", owner: "Admin" },
  { name: "Admin Stability Center", type: "Page", route: "/admin/stability", status: "active", risk: "high", owner: "Admin" },
  { name: "Print Claim (CMS-1500)", type: "Page", route: "/print-claim", status: "active", risk: "medium", owner: "Admin" },
  { name: "Print Receipt", type: "Page", route: "/print-receipt", status: "active", risk: "low", owner: "Admin" },
  { name: "Patient Intake", type: "Public Page", route: "/intake", status: "active", risk: "low", owner: "Public" },
  { name: "Intake Kiosk", type: "Public Page", route: "/intake-kiosk", status: "active", risk: "low", owner: "Public" },
  // Backend Functions
  { name: "generateSoapNote", type: "Backend Function", route: "functions/generateSoapNote", status: "active", risk: "high", owner: "Admin" },
  { name: "emailSuperbill", type: "Backend Function", route: "functions/emailSuperbill", status: "active", risk: "high", owner: "Admin" },
  { name: "createPaymentCheckout", type: "Backend Function", route: "functions/createPaymentCheckout", status: "active", risk: "critical", owner: "Admin" },
  { name: "createSubscriptionCheckout", type: "Backend Function", route: "functions/createSubscriptionCheckout", status: "active", risk: "critical", owner: "Admin" },
  { name: "generateEDI837", type: "Backend Function", route: "functions/generateEDI837", status: "active", risk: "high", owner: "Admin" },
  { name: "officeAllyExport", type: "Backend Function", route: "functions/officeAllyExport", status: "active", risk: "high", owner: "Admin" },
  { name: "stabilityMonitor", type: "Backend Function", route: "functions/stabilityMonitor", status: "active", risk: "medium", owner: "Admin" },
  { name: "handleStripeWebhook", type: "Backend Function", route: "functions/handleStripeWebhook", status: "active", risk: "critical", owner: "System" },
  { name: "searchMedicalLiterature", type: "Backend Function", route: "functions/searchMedicalLiterature", status: "active", risk: "medium", owner: "Admin" },
  { name: "suggestOrthoTests", type: "Backend Function", route: "functions/suggestOrthoTests", status: "active", risk: "medium", owner: "Admin" },
  { name: "polishDictatedNotes", type: "Backend Function", route: "functions/polishDictatedNotes", status: "active", risk: "medium", owner: "Admin" },
  // Integrations
  { name: "Stripe Payments", type: "Integration", route: "stripe", status: "active", risk: "critical", owner: "Admin" },
  { name: "Google Calendar", type: "Integration", route: "googlecalendar", status: "active", risk: "medium", owner: "Admin" },
  { name: "Gmail (Superbill)", type: "Integration", route: "gmail", status: "active", risk: "high", owner: "Admin" },
  { name: "Faxage", type: "Integration", route: "faxage", status: "active", risk: "medium", owner: "Admin" },
  { name: "Office Ally SFTP", type: "Integration", route: "sftp", status: "active", risk: "high", owner: "Admin" },
];

const RISK_COLORS = {
  low: "bg-green-100 text-green-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700"
};

export default function AdminFeatureInventoryTab() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [search, setSearch] = useState("");

  const types = ["All", ...new Set(FEATURE_INVENTORY.map(f => f.type))];
  const risks = ["All", "low", "medium", "high", "critical"];

  const filtered = FEATURE_INVENTORY.filter(f =>
    (typeFilter === "All" || f.type === typeFilter) &&
    (riskFilter === "All" || f.risk === riskFilter) &&
    (!search || f.name.toLowerCase().includes(search.toLowerCase()) || f.route.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="border border-input rounded-md px-3 py-1.5 text-sm bg-transparent max-w-[200px]"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="border border-input rounded-md px-3 py-1.5 text-sm bg-card" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="border border-input rounded-md px-3 py-1.5 text-sm bg-card" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
          {risks.map(r => <option key={r} value={r}>{r === "All" ? "All Risks" : r}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} items</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-xs text-muted-foreground border-b border-border">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Route / Location</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Risk</th>
                <th className="text-left px-4 py-3">Owner</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{f.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{f.type}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{f.route}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">{f.status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${RISK_COLORS[f.risk]}`}>{f.risk}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{f.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
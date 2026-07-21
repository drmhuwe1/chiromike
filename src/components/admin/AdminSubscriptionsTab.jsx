import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mail, CreditCard } from "lucide-react";

export default function AdminSubscriptionsTab() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailModal, setEmailModal] = useState(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Patient.list("-created_date", 500);
      setPatients(data.filter(p => p.membership_status && p.membership_status !== "none"));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const STATUS_COLORS = {
    active: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    none: "bg-gray-100 text-gray-600"
  };

  const sendEmail = async () => {
    try {
      await base44.integrations.Core.SendEmail({ to: emailModal.email, subject: emailSubject, body: emailBody });
      alert("Email sent.");
      setEmailModal(null); setEmailSubject(""); setEmailBody("");
    } catch (e) { alert("Failed: " + e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Memberships", value: patients.filter(p => p.membership_status === "active").length, color: "text-green-700" },
          { label: "Cancelled", value: patients.filter(p => p.membership_status === "cancelled").length, color: "text-red-700" },
          { label: "Total Members", value: patients.length, color: "text-blue-700" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-xs text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-3">Patient</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Started</th>
                  <th className="text-left px-4 py-3">Stripe ID</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{p.first_name} {p.last_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.membership_plan || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_COLORS[p.membership_status] || STATUS_COLORS.none}`}>
                        {p.membership_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.membership_started_at ? new Date(p.membership_started_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]">
                      {p.membership_stripe_subscription_id || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.email && (
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEmailModal(p)}>
                          <Mail className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No membership patients found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {emailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold">Email {emailModal.first_name} {emailModal.last_name}</h3>
            <input className="w-full border border-input rounded-md px-3 py-2 text-sm bg-transparent" placeholder="Subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
            <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm min-h-[100px] bg-transparent" placeholder="Message..." value={emailBody} onChange={e => setEmailBody(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={sendEmail} className="flex-1">Send</Button>
              <Button variant="outline" onClick={() => { setEmailModal(null); setEmailSubject(""); setEmailBody(""); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
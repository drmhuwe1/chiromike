import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, FileText, Activity, CreditCard } from "lucide-react";

export default function AdminAnalyticsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [users, patients, claims, soapNotes, appointments] = await Promise.all([
        base44.entities.User.list("-created_date", 500),
        base44.entities.Patient.list("-created_date", 500),
        base44.entities.Claim.list("-created_date", 500),
        base44.entities.SoapNote.list("-created_date", 500),
        base44.entities.Appointment.list("-created_date", 500),
      ]);

      const now = Date.now();
      const day = 86400000;
      const week = 7 * day;
      const month = 30 * day;

      const newUsersThisMonth = users.filter(u => now - new Date(u.created_date).getTime() < month).length;
      const activeMembers = users.filter(u => u.membership_status === "active").length;
      const newPatientsThisMonth = patients.filter(p => now - new Date(p.created_date).getTime() < month).length;
      const claimsThisMonth = claims.filter(c => now - new Date(c.created_date).getTime() < month).length;
      const claimsThisWeek = claims.filter(c => now - new Date(c.created_date).getTime() < week).length;

      const visitTypes = {};
      claims.forEach(c => { visitTypes[c.visit_type || "Unknown"] = (visitTypes[c.visit_type || "Unknown"] || 0) + 1; });

      const recentAppts = appointments.filter(a => now - new Date(a.created_date).getTime() < month).length;

      setStats({ users, patients, claims, soapNotes, appointments, newUsersThisMonth, activeMembers, newPatientsThisMonth, claimsThisMonth, claimsThisWeek, visitTypes, recentAppts });
    } catch (e) {
      console.error("Analytics load error:", e);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading analytics...</div>;
  if (!stats) return <div className="text-center py-10 text-muted-foreground">Failed to load analytics.</div>;

  const cards = [
    { label: "Total Users", value: stats.users.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "New Users (30d)", value: stats.newUsersThisMonth, icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { label: "Active Members", value: stats.activeMembers, icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Patients", value: stats.patients.length, icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "New Patients (30d)", value: stats.newPatientsThisMonth, icon: Activity, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Claims This Month", value: stats.claimsThisMonth, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Claims This Week", value: stats.claimsThisWeek, icon: FileText, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Total Claims", value: stats.claims.length, icon: FileText, color: "text-gray-600", bg: "bg-gray-50" },
    { label: "SOAP Notes", value: stats.soapNotes.length, icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Appointments (30d)", value: stats.recentAppts, icon: Activity, color: "text-cyan-600", bg: "bg-cyan-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`${card.bg} border border-border rounded-xl p-4`}>
              <Icon className={`w-5 h-5 ${card.color} mb-2`} />
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Visit Type Breakdown */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">Claims by Visit Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(stats.visitTypes).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
            <div key={type} className="flex justify-between items-center bg-muted/30 rounded-lg px-3 py-2">
              <span className="text-sm">{type}</span>
              <span className="font-semibold text-sm">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User Roles */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">User Roles</h3>
        <div className="flex gap-4">
          {["admin", "user"].map(role => {
            const count = stats.users.filter(u => u.role === role).length;
            return (
              <div key={role} className="bg-muted/30 rounded-lg px-4 py-3 text-center">
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground capitalize">{role}s</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
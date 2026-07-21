import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, TrendingUp, CreditCard, AlertCircle } from "lucide-react";

export default function AdminFinancialTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [claims, payments, patients] = await Promise.all([
        base44.entities.Claim.list("-date_of_service", 500),
        base44.entities.Payment?.list("-created_date", 500).catch(() => []),
        base44.entities.Patient.list("-created_date", 500),
      ]);

      const now = Date.now();
      const month = 30 * 86400000;
      const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);

      const totalRevenue = claims.reduce((s, c) => s + (c.amount_paid || 0), 0);
      const totalCharged = claims.reduce((s, c) => s + (c.total_charge || 0), 0);
      const totalBalance = totalCharged - totalRevenue;
      const writtenOff = claims.reduce((s, c) => s + (c.written_off_amount || 0), 0);

      const claimsThisMonth = claims.filter(c => new Date(c.date_of_service) >= thisMonth);
      const revenueThisMonth = claimsThisMonth.reduce((s, c) => s + (c.amount_paid || 0), 0);
      const chargedThisMonth = claimsThisMonth.reduce((s, c) => s + (c.total_charge || 0), 0);

      const byType = {};
      claims.forEach(c => {
        const t = c.visit_type || "Unknown";
        if (!byType[t]) byType[t] = { charged: 0, paid: 0, count: 0 };
        byType[t].charged += c.total_charge || 0;
        byType[t].paid += c.amount_paid || 0;
        byType[t].count++;
      });

      const activeMembers = patients.filter(p => p.membership_status === "active").length;
      const membershipRevenue = activeMembers * 60; // estimate

      const statusCounts = { Draft: 0, Saved: 0, Submitted: 0, Paid: 0, Denied: 0 };
      claims.forEach(c => { if (statusCounts[c.status] !== undefined) statusCounts[c.status]++; });

      setData({ totalRevenue, totalCharged, totalBalance, writtenOff, revenueThisMonth, chargedThisMonth, byType, activeMembers, membershipRevenue, statusCounts, claimsCount: claims.length });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fmt = (n) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading financial data...</div>;
  if (!data) return <div className="text-center py-10 text-muted-foreground">Failed to load.</div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue Collected", value: fmt(data.totalRevenue), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Charged", value: fmt(data.totalCharged), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Outstanding Balance", value: fmt(data.totalBalance), icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Written Off", value: fmt(data.writtenOff), icon: CreditCard, color: "text-red-600", bg: "bg-red-50" },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`${card.bg} border border-border rounded-xl p-4`}>
              <Icon className={`w-5 h-5 ${card.color} mb-2`} />
              <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* This Month */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">This Month</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg px-4 py-3"><div className="text-sm text-muted-foreground">Charged</div><div className="font-bold">{fmt(data.chargedThisMonth)}</div></div>
          <div className="bg-muted/30 rounded-lg px-4 py-3"><div className="text-sm text-muted-foreground">Collected</div><div className="font-bold text-green-700">{fmt(data.revenueThisMonth)}</div></div>
          <div className="bg-muted/30 rounded-lg px-4 py-3"><div className="text-sm text-muted-foreground">Active Members</div><div className="font-bold text-purple-700">{data.activeMembers}</div></div>
        </div>
      </div>

      {/* Claim Status */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">Claims by Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(data.statusCounts).map(([status, count]) => (
            <div key={status} className="bg-muted/30 rounded-lg px-3 py-2 text-center">
              <div className="font-bold text-lg">{count}</div>
              <div className="text-xs text-muted-foreground">{status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue by Visit Type */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">Revenue by Visit Type</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-2 pr-4">Visit Type</th>
                <th className="text-right pr-4">Claims</th>
                <th className="text-right pr-4">Charged</th>
                <th className="text-right pr-4">Collected</th>
                <th className="text-right">Collection %</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.byType).sort((a,b) => b[1].charged - a[1].charged).map(([type, d]) => (
                <tr key={type} className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">{type}</td>
                  <td className="text-right pr-4">{d.count}</td>
                  <td className="text-right pr-4">{fmt(d.charged)}</td>
                  <td className="text-right pr-4 text-green-700 font-semibold">{fmt(d.paid)}</td>
                  <td className="text-right">{d.charged > 0 ? Math.round((d.paid / d.charged) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
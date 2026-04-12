import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Reports() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => {
    base44.entities.Claim.list("-created_date", 1000).then(data => {
      setClaims(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return claims.filter(c => {
      const matchType = typeFilter === "All" || c.visit_type === typeFilter;
      const matchFrom = !dateFrom || c.date_of_service >= dateFrom;
      const matchTo = !dateTo || c.date_of_service <= dateTo;
      return matchType && matchFrom && matchTo;
    });
  }, [claims, typeFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, c) => s + (c.total_charge || 0), 0);
    const paid = filtered.reduce((s, c) => s + (c.amount_paid || 0), 0);
    const byType = {};
    filtered.forEach(c => {
      const t = c.visit_type || "Unknown";
      if (!byType[t]) byType[t] = { count: 0, total: 0 };
      byType[t].count++;
      byType[t].total += (c.total_charge || 0);
    });
    const byStatus = {};
    filtered.forEach(c => {
      const s = c.status || "Unknown";
      if (!byStatus[s]) byStatus[s] = 0;
      byStatus[s]++;
    });
    return { total, paid, byType, byStatus, count: filtered.length };
  }, [filtered]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">Reports</h1>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div>
          <Label className="text-xs">From Date</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-44" />
        </div>
        <div>
          <Label className="text-xs">To Date</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-44" />
        </div>
        <div>
          <Label className="text-xs">Visit Type</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              {["Insurance", "Auto", "Cash", "Cash Office Visit", "Cash Package"].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Claims</p>
          <p className="text-2xl font-bold">{stats.count}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Charges</p>
          <p className="text-2xl font-bold">${stats.total.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-2xl font-bold">${stats.paid.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="text-2xl font-bold">${(stats.total - stats.paid).toFixed(2)}</p>
        </div>
      </div>

      {/* Breakdown by Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold mb-3">By Visit Type</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Type</th>
                <th className="text-right py-2 font-medium">Count</th>
                <th className="text-right py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.byType).map(([type, data]) => (
                <tr key={type} className="border-b last:border-0">
                  <td className="py-2">{type}</td>
                  <td className="py-2 text-right">{data.count}</td>
                  <td className="py-2 text-right">${data.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold mb-3">By Status</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-right py-2 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <tr key={status} className="border-b last:border-0">
                  <td className="py-2">{status}</td>
                  <td className="py-2 text-right">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
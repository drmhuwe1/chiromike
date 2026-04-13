import { useMemo } from "react";

const buckets = ["0-30", "31-60", "61-90", "91-120", "120+"];

function ageBucket(dos) {
  if (!dos) return "120+";
  const days = Math.floor((new Date() - new Date(dos)) / 86400000);
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 120) return "91-120";
  return "120+";
}

const bucketColors = {
  "0-30": "bg-emerald-50 text-emerald-700",
  "31-60": "bg-yellow-50 text-yellow-700",
  "61-90": "bg-orange-50 text-orange-700",
  "91-120": "bg-red-50 text-red-700",
  "120+": "bg-red-100 text-red-800 font-bold",
};

export default function ARAgingTable({ claims }) {
  const rows = useMemo(() => {
    const map = {};
    for (const c of claims) {
      const outstanding = (c.total_charge || 0) - (c.amount_paid || 0);
      if (outstanding <= 0) continue;
      const key = c.patient_id || c.patient_name;
      if (!map[key]) map[key] = { patient: c.patient_name, buckets: {}, total: 0, claims: [] };
      const b = ageBucket(c.date_of_service);
      map[key].buckets[b] = (map[key].buckets[b] || 0) + outstanding;
      map[key].total += outstanding;
      map[key].claims.push(c);
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [claims]);

  const totals = useMemo(() => {
    const t = {};
    for (const r of rows) {
      for (const b of buckets) t[b] = (t[b] || 0) + (r.buckets[b] || 0);
    }
    return t;
  }, [rows]);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div>
      <div className="grid grid-cols-5 gap-3 mb-6">
        {buckets.map(b => (
          <div key={b} className={`rounded-xl p-4 text-center ${bucketColors[b]}`}>
            <p className="text-xs font-semibold mb-1">{b} days</p>
            <p className="text-xl font-bold">${(totals[b] || 0).toFixed(0)}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-2.5 px-4 font-medium">Patient</th>
              {buckets.map(b => <th key={b} className="text-right py-2.5 px-3 font-medium">{b}</th>)}
              <th className="text-right py-2.5 px-4 font-medium">Total AR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                <td className="py-2.5 px-4 font-medium">{r.patient}</td>
                {buckets.map(b => (
                  <td key={b} className={`py-2.5 px-3 text-right ${r.buckets[b] ? "" : "text-muted-foreground"}`}>
                    {r.buckets[b] ? `$${r.buckets[b].toFixed(2)}` : "—"}
                  </td>
                ))}
                <td className="py-2.5 px-4 text-right font-bold">${r.total.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-muted/40 font-bold border-t-2 border-border">
              <td className="py-2.5 px-4">TOTAL</td>
              {buckets.map(b => <td key={b} className="py-2.5 px-3 text-right">${(totals[b] || 0).toFixed(2)}</td>)}
              <td className="py-2.5 px-4 text-right text-primary">${grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-center text-muted-foreground py-10">No outstanding balances — great!</p>
        )}
      </div>
    </div>
  );
}
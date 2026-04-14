import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function RevenueByPayerReport({ claims, payments }) {
  const handlePrint = () => {
    window.print();
  };

  const payerData = useMemo(() => {
    const map = {};

    claims.forEach(claim => {
      const payer = claim.payer_type || "Unknown";
      if (!map[payer]) {
        map[payer] = { charges: 0, payments: 0, balance: 0, count: 0 };
      }
      map[payer].charges += claim.total_charge || 0;
      map[payer].count += 1;
    });

    payments.forEach(pay => {
      const claim = claims.find(c => c.id === pay.claim_id);
      if (claim) {
        const payer = claim.payer_type || "Unknown";
        if (map[payer]) {
          map[payer].payments += pay.payment_amount || 0;
        }
      }
    });

    Object.keys(map).forEach(payer => {
      map[payer].balance = map[payer].charges - map[payer].payments;
    });

    return Object.entries(map)
      .map(([payer, data]) => ({ payer, ...data }))
      .sort((a, b) => b.charges - a.charges);
  }, [claims, payments]);

  const totals = {
    charges: payerData.reduce((s, p) => s + p.charges, 0),
    payments: payerData.reduce((s, p) => s + p.payments, 0),
    balance: payerData.reduce((s, p) => s + p.balance, 0),
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Revenue by Payer Type</h2>
        <Button onClick={handlePrint} variant="outline" size="sm"><Printer className="w-4 h-4 mr-2" /> Print</Button>
      </div>

      <div className="print-area bg-white border border-border rounded-lg p-8 font-sans text-sm" style={{ margin: "1in" }}>
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-xl font-bold">REVENUE BY PAYER TYPE REPORT</h1>
          <p className="text-xs text-muted-foreground mt-1">As of {new Date().toLocaleDateString()}</p>
        </div>

        <table className="w-full mb-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 px-2 font-bold">Payer Type</th>
              <th className="text-right py-2 px-2 font-bold">Claims</th>
              <th className="text-right py-2 px-2 font-bold">Total Charges</th>
              <th className="text-right py-2 px-2 font-bold">Payments Received</th>
              <th className="text-right py-2 px-2 font-bold">Outstanding Balance</th>
              <th className="text-right py-2 px-2 font-bold">Collection %</th>
            </tr>
          </thead>
          <tbody>
            {payerData.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-300">
                <td className="py-2 px-2 font-medium">{row.payer}</td>
                <td className="text-right py-2 px-2">{row.count}</td>
                <td className="text-right py-2 px-2">${row.charges.toFixed(2)}</td>
                <td className="text-right py-2 px-2 text-green-700 font-semibold">${row.payments.toFixed(2)}</td>
                <td className="text-right py-2 px-2 text-red-700 font-semibold">${row.balance.toFixed(2)}</td>
                <td className="text-right py-2 px-2">{row.charges > 0 ? ((row.payments / row.charges) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold border-b-2 border-black">
              <td className="py-3 px-2">TOTAL</td>
              <td className="text-right py-3 px-2">{claims.length}</td>
              <td className="text-right py-3 px-2">${totals.charges.toFixed(2)}</td>
              <td className="text-right py-3 px-2">${totals.payments.toFixed(2)}</td>
              <td className="text-right py-3 px-2">${totals.balance.toFixed(2)}</td>
              <td className="text-right py-3 px-2">{totals.charges > 0 ? ((totals.payments / totals.charges) * 100).toFixed(1) : 0}%</td>
            </tr>
          </tbody>
        </table>

        <div className="border-t-2 border-black pt-4 text-xs text-muted-foreground">
          <p>This report breaks down revenue by payer type, showing collection performance for each payer category.</p>
        </div>
      </div>
    </div>
  );
}
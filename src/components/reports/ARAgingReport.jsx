import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function ARAgingReport({ claims, patients: _patients, payments }) {
  const handlePrint = () => {
    window.print();
  };

  const agingData = useMemo(() => {
    const today = new Date();
    const buckets = { current: [], thirty: [], sixty: [], ninety: [], over120: [] };

    claims.forEach(claim => {
      const balance = claim.total_charge - (payments
        .filter(p => p.claim_id === claim.id)
        .reduce((s, p) => s + (p.payment_amount || 0), 0));

      if (balance <= 0) return;

      const dosDate = new Date(claim.date_of_service);
      const daysOld = Math.floor((today - dosDate) / (1000 * 60 * 60 * 24));

      if (daysOld <= 30) buckets.current.push({ ...claim, balance, daysOld });
      else if (daysOld <= 60) buckets.thirty.push({ ...claim, balance, daysOld });
      else if (daysOld <= 90) buckets.sixty.push({ ...claim, balance, daysOld });
      else if (daysOld <= 120) buckets.ninety.push({ ...claim, balance, daysOld });
      else buckets.over120.push({ ...claim, balance, daysOld });
    });

    return buckets;
  }, [claims, payments]);

  const totals = {
    current: agingData.current.reduce((s, c) => s + c.balance, 0),
    thirty: agingData.thirty.reduce((s, c) => s + c.balance, 0),
    sixty: agingData.sixty.reduce((s, c) => s + c.balance, 0),
    ninety: agingData.ninety.reduce((s, c) => s + c.balance, 0),
    over120: agingData.over120.reduce((s, c) => s + c.balance, 0),
  };

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Accounts Receivable Aging</h2>
        <Button onClick={handlePrint} variant="outline" size="sm"><Printer className="w-4 h-4 mr-2" /> Print</Button>
      </div>

      <div className="print-area bg-white border border-border rounded-lg p-8 font-sans text-sm" style={{ margin: "1in" }}>
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-xl font-bold">ACCOUNTS RECEIVABLE AGING REPORT</h1>
          <p className="text-xs text-muted-foreground mt-1">As of {new Date().toLocaleDateString()}</p>
        </div>

        <table className="w-full mb-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 px-2 font-bold">Aging Bucket</th>
              <th className="text-right py-2 px-2 font-bold">Count</th>
              <th className="text-right py-2 px-2 font-bold">Balance Due</th>
              <th className="text-right py-2 px-2 font-bold">% of Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="py-2 px-2">Current (0–30 days)</td>
              <td className="text-right py-2 px-2">{agingData.current.length}</td>
              <td className="text-right py-2 px-2 font-semibold">${totals.current.toFixed(2)}</td>
              <td className="text-right py-2 px-2">{grandTotal > 0 ? ((totals.current / grandTotal) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="py-2 px-2">31–60 days</td>
              <td className="text-right py-2 px-2">{agingData.thirty.length}</td>
              <td className="text-right py-2 px-2 font-semibold">${totals.thirty.toFixed(2)}</td>
              <td className="text-right py-2 px-2">{grandTotal > 0 ? ((totals.thirty / grandTotal) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="py-2 px-2">61–90 days</td>
              <td className="text-right py-2 px-2">{agingData.sixty.length}</td>
              <td className="text-right py-2 px-2 font-semibold">${totals.sixty.toFixed(2)}</td>
              <td className="text-right py-2 px-2">{grandTotal > 0 ? ((totals.sixty / grandTotal) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="py-2 px-2">91–120 days</td>
              <td className="text-right py-2 px-2">{agingData.ninety.length}</td>
              <td className="text-right py-2 px-2 font-semibold">${totals.ninety.toFixed(2)}</td>
              <td className="text-right py-2 px-2">{grandTotal > 0 ? ((totals.ninety / grandTotal) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr className="border-b-2 border-black bg-gray-100">
              <td className="py-2 px-2 font-bold">Over 120 days</td>
              <td className="text-right py-2 px-2 font-bold">{agingData.over120.length}</td>
              <td className="text-right py-2 px-2 font-bold">${totals.over120.toFixed(2)}</td>
              <td className="text-right py-2 px-2 font-bold">{grandTotal > 0 ? ((totals.over120 / grandTotal) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr className="bg-gray-100 font-bold">
              <td className="py-3 px-2">TOTAL A/R</td>
              <td className="text-right py-3 px-2">{claims.filter(c => {
                const balance = c.total_charge - payments.filter(p => p.claim_id === c.id).reduce((s, p) => s + (p.payment_amount || 0), 0);
                return balance > 0;
              }).length}</td>
              <td className="text-right py-3 px-2">${grandTotal.toFixed(2)}</td>
              <td className="text-right py-3 px-2">100%</td>
            </tr>
          </tbody>
        </table>

        <div className="border-t-2 border-black pt-4 text-xs text-muted-foreground">
          <p>This report shows unpaid claim balances grouped by number of days outstanding.</p>
          <p className="mt-2">Over 120 days indicates claims requiring immediate collections action.</p>
        </div>
      </div>
    </div>
  );
}
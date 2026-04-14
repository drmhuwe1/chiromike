import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function EndOfYearFinancialReport({ claims, payments }) {
  const handlePrint = () => {
    window.print();
  };

  const financials = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();

    const paymentByType = {
      Insurance: 0,
      Patient: 0,
      Adjustment: 0,
      Denial: 0,
    };

    const paymentByMonth = {};

    payments.forEach(pay => {
      const payDate = new Date(pay.payment_date);
      if (payDate.getFullYear() === year) {
        paymentByType[pay.payment_type || "Patient"] = (paymentByType[pay.payment_type || "Patient"] || 0) + (pay.payment_amount || 0);

        const month = payDate.toLocaleDateString("en-US", { month: "short" });
        paymentByMonth[month] = (paymentByMonth[month] || 0) + (pay.payment_amount || 0);
      }
    });

    const totalCharges = claims.reduce((s, c) => s + (c.total_charge || 0), 0);
    const totalPayments = Object.values(paymentByType).reduce((s, v) => s + v, 0);
    const totalAdjustments = payments.filter(p => p.payment_type === "Adjustment").reduce((s, p) => s + (p.payment_amount || 0), 0);
    const writeOffs = payments.filter(p => p.payment_type === "Denial").reduce((s, p) => s + (p.payment_amount || 0), 0);

    return {
      totalCharges,
      totalPayments,
      totalAdjustments,
      writeOffs,
      paymentByType,
      paymentByMonth,
    };
  }, [claims, payments]);

  const outstandingBalance = financials.totalCharges - financials.totalPayments - financials.writeOffs;
  const collectionRate = financials.totalCharges > 0 ? ((financials.totalPayments / financials.totalCharges) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">End of Year Financial Summary</h2>
        <Button onClick={handlePrint} variant="outline" size="sm"><Printer className="w-4 h-4 mr-2" /> Print</Button>
      </div>

      <div className="print-area bg-white border border-border rounded-lg p-8 font-sans text-sm" style={{ margin: "1in" }}>
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-xl font-bold">END OF YEAR FINANCIAL SUMMARY</h1>
          <p className="text-xs text-muted-foreground mt-1">Calendar Year {new Date().getFullYear()}</p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
          <div className="border border-gray-300 rounded p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Charges</p>
            <p className="text-lg font-bold">${financials.totalCharges.toFixed(2)}</p>
          </div>
          <div className="border border-gray-300 rounded p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Payments Received</p>
            <p className="text-lg font-bold text-green-700">${financials.totalPayments.toFixed(2)}</p>
          </div>
          <div className="border border-gray-300 rounded p-4">
            <p className="text-xs text-muted-foreground mb-1">Collection Rate</p>
            <p className="text-lg font-bold">{collectionRate}%</p>
          </div>
          <div className="border border-gray-300 rounded p-4">
            <p className="text-xs text-muted-foreground mb-1">Outstanding A/R</p>
            <p className="text-lg font-bold text-red-700">${outstandingBalance.toFixed(2)}</p>
          </div>
        </div>

        {/* Payment by Type */}
        <div className="mb-8">
          <h3 className="text-sm font-bold border-b pb-2 mb-4">PAYMENTS BY TYPE</h3>
          <table className="w-full border-collapse">
            <tbody>
              {Object.entries(financials.paymentByType).map(([type, amount]) => (
                <tr key={type} className="border-b border-gray-300">
                  <td className="py-2 px-2">{type}</td>
                  <td className="text-right py-2 px-2 font-semibold">${amount.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-100 border-b-2 border-black">
                <td className="py-3 px-2">TOTAL RECEIVED</td>
                <td className="text-right py-3 px-2">${financials.totalPayments.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Monthly Breakdown */}
        <div className="mb-8">
          <h3 className="text-sm font-bold border-b pb-2 mb-4">MONTHLY PAYMENT SUMMARY</h3>
          <table className="w-full border-collapse text-xs">
            <tbody>
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(month => (
                <tr key={month} className="border-b border-gray-300">
                  <td className="py-1 px-2 w-12">{month}</td>
                  <td className="text-right py-1 px-2 font-semibold">${(financials.paymentByMonth[month] || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Year-End Adjustments */}
        <div className="mb-8">
          <h3 className="text-sm font-bold border-b pb-2 mb-4">ADJUSTMENTS & WRITE-OFFS</h3>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-2">Contractual Adjustments</td>
                <td className="text-right py-2 px-2 font-semibold">${financials.totalAdjustments.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-2">Denials & Write-offs</td>
                <td className="text-right py-2 px-2 font-semibold text-red-700">${financials.writeOffs.toFixed(2)}</td>
              </tr>
              <tr className="font-bold bg-gray-100 border-b-2 border-black">
                <td className="py-3 px-2">NET REVENUE</td>
                <td className="text-right py-3 px-2">${(financials.totalPayments + financials.totalAdjustments).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-black pt-4 text-xs text-muted-foreground">
          <p>This end-of-year summary includes all cash, credit, and insurance payments received.</p>
          <p className="mt-2">Outstanding A/R balance: ${outstandingBalance.toFixed(2)} | Collection Rate: {collectionRate}%</p>
        </div>
      </div>
    </div>
  );
}
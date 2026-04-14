import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function ProcedureUtilizationReport({ claims }) {
  const handlePrint = () => {
    window.print();
  };

  const procData = useMemo(() => {
    const map = {};

    claims.forEach(claim => {
      (claim.service_lines || []).forEach(line => {
        const key = `${line.code}`;
        if (!map[key]) {
          map[key] = {
            code: line.code,
            description: line.description || "Unknown",
            count: 0,
            totalCharge: 0,
            totalUnits: 0,
          };
        }
        map[key].count += 1;
        map[key].totalCharge += line.charge || 0;
        map[key].totalUnits += line.units || 1;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [claims]);

  const totals = {
    count: procData.reduce((s, p) => s + p.count, 0),
    charge: procData.reduce((s, p) => s + p.totalCharge, 0),
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Procedure Utilization (Top 20)</h2>
        <Button onClick={handlePrint} variant="outline" size="sm"><Printer className="w-4 h-4 mr-2" /> Print</Button>
      </div>

      <div className="print-area bg-white border border-border rounded-lg p-8 font-sans text-sm" style={{ margin: "1in" }}>
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-xl font-bold">PROCEDURE UTILIZATION REPORT</h1>
          <p className="text-xs text-muted-foreground mt-1">Top 20 Most Billed Procedures — {new Date().toLocaleDateString()}</p>
        </div>

        <table className="w-full mb-6 border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 px-2 font-bold">Code</th>
              <th className="text-left py-2 px-2 font-bold">Description</th>
              <th className="text-right py-2 px-2 font-bold">Frequency</th>
              <th className="text-right py-2 px-2 font-bold">Total Units</th>
              <th className="text-right py-2 px-2 font-bold">Total Charge</th>
              <th className="text-right py-2 px-2 font-bold">Avg Per Procedure</th>
            </tr>
          </thead>
          <tbody>
            {procData.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-300">
                <td className="py-2 px-2 font-mono font-bold">{row.code}</td>
                <td className="py-2 px-2">{row.description}</td>
                <td className="text-right py-2 px-2">{row.count}</td>
                <td className="text-right py-2 px-2">{row.totalUnits}</td>
                <td className="text-right py-2 px-2 font-semibold">${row.totalCharge.toFixed(2)}</td>
                <td className="text-right py-2 px-2">${(row.totalCharge / row.count).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold border-b-2 border-black">
              <td colSpan={2} className="py-3 px-2">TOTAL (Top 20)</td>
              <td className="text-right py-3 px-2">{totals.count}</td>
              <td className="text-right py-3 px-2">{procData.reduce((s, p) => s + p.totalUnits, 0)}</td>
              <td className="text-right py-3 px-2">${totals.charge.toFixed(2)}</td>
              <td className="text-right py-3 px-2">${(totals.charge / totals.count).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div className="border-t-2 border-black pt-4 text-xs text-muted-foreground">
          <p>This report shows the most frequently billed procedures and their revenue contribution.</p>
        </div>
      </div>
    </div>
  );
}
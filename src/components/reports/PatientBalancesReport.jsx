import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Printer } from "lucide-react";

export default function PatientBalancesReport({ patients = [], claims = [], payments = [] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, due, paid, credit

  const balances = useMemo(() => {
    return patients
      .map(p => {
        const patientClaims = claims.filter(c => c.patient_id === p.id);
        const patientPayments = payments.filter(pay => pay.patient_id === p.id);

        const totalCharged = patientClaims.reduce((sum, c) => sum + (c.total_charge || 0), 0);
        const totalPaid = patientPayments.reduce((sum, pay) => sum + (pay.payment_amount || 0), 0);
        const balance = totalCharged - totalPaid;

        return {
          patient: p,
          totalCharged,
          totalPaid,
          balance,
          claimCount: patientClaims.length,
          lastService: patientClaims.length > 0 ? patientClaims[0].date_of_service : null
        };
      })
      .filter(item => {
        const q = search.toLowerCase();
        const matchSearch = !q || item.patient.first_name?.toLowerCase().includes(q) || item.patient.last_name?.toLowerCase().includes(q);
        
        let matchStatus = true;
        if (filterStatus === "due") matchStatus = item.balance > 0;
        if (filterStatus === "paid") matchStatus = item.balance === 0;
        if (filterStatus === "credit") matchStatus = item.balance < 0;

        return matchSearch && matchStatus;
      })
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [patients, claims, payments, search, filterStatus]);

  const totals = useMemo(() => ({
    totalCharges: balances.reduce((sum, b) => sum + b.totalCharged, 0),
    totalPaid: balances.reduce((sum, b) => sum + b.totalPaid, 0),
    totalDue: balances.reduce((sum, b) => sum + Math.max(0, b.balance), 0),
    totalCredit: Math.abs(balances.reduce((sum, b) => sum + Math.min(0, b.balance), 0))
  }), [balances]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const csv = [
      ["Patient", "Total Charged", "Total Paid", "Balance", "Claims", "Last Service"],
      ...balances.map(b => [
        `${b.patient.first_name} ${b.patient.last_name}`,
        b.totalCharged.toFixed(2),
        b.totalPaid.toFixed(2),
        b.balance.toFixed(2),
        b.claimCount,
        b.lastService || ""
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patient-balances-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Patient Balances</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search patient..." className="pl-10 h-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Balances</SelectItem>
            <SelectItem value="due">Amount Due</SelectItem>
            <SelectItem value="paid">Paid in Full</SelectItem>
            <SelectItem value="credit">Credit Balance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Total Charges</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">${totals.totalCharges.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Total Paid</p>
          <p className="text-2xl font-bold text-green-900 mt-1">${totals.totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Amount Due</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">${totals.totalDue.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide">Total Credits</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">${totals.totalCredit.toFixed(2)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden no-print">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-2.5 px-3 font-medium text-xs">Patient Name</th>
              <th className="text-right py-2.5 px-3 font-medium text-xs hidden md:table-cell">Total Charged</th>
              <th className="text-right py-2.5 px-3 font-medium text-xs hidden md:table-cell">Total Paid</th>
              <th className="text-right py-2.5 px-3 font-medium text-xs">Balance</th>
              <th className="text-center py-2.5 px-3 font-medium text-xs hidden sm:table-cell">Claims</th>
              <th className="text-left py-2.5 px-3 font-medium text-xs hidden lg:table-cell">Last Service</th>
            </tr>
          </thead>
          <tbody>
            {balances.map(b => (
              <tr key={b.patient.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="py-2.5 px-3 font-medium">{b.patient.first_name} {b.patient.last_name}</td>
                <td className="py-2.5 px-3 text-right hidden md:table-cell">${b.totalCharged.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right hidden md:table-cell">${b.totalPaid.toFixed(2)}</td>
                <td className={`py-2.5 px-3 text-right font-semibold ${b.balance > 0 ? 'text-amber-700' : b.balance < 0 ? 'text-blue-700' : 'text-green-700'}`}>
                  {b.balance > 0 ? `$${b.balance.toFixed(2)} Due` : b.balance < 0 ? `$${Math.abs(b.balance).toFixed(2)} Credit` : 'Paid'}
                </td>
                <td className="py-2.5 px-3 text-center hidden sm:table-cell">{b.claimCount}</td>
                <td className="py-2.5 px-3 text-muted-foreground hidden lg:table-cell">{b.lastService || "—"}</td>
              </tr>
            ))}
            {balances.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  {search || filterStatus !== "all" ? "No patients match your filters" : "No patients found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Print View */}
      <div className="hidden print:block space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Patient Balance Report</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
        </div>

        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="border p-2">
            <p className="font-semibold">Total Charges</p>
            <p className="text-lg">${totals.totalCharges.toFixed(2)}</p>
          </div>
          <div className="border p-2">
            <p className="font-semibold">Total Paid</p>
            <p className="text-lg">${totals.totalPaid.toFixed(2)}</p>
          </div>
          <div className="border p-2">
            <p className="font-semibold">Amount Due</p>
            <p className="text-lg">${totals.totalDue.toFixed(2)}</p>
          </div>
          <div className="border p-2">
            <p className="font-semibold">Total Credits</p>
            <p className="text-lg">${totals.totalCredit.toFixed(2)}</p>
          </div>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="border p-2 text-left font-bold">Patient</th>
              <th className="border p-2 text-right font-bold">Charged</th>
              <th className="border p-2 text-right font-bold">Paid</th>
              <th className="border p-2 text-right font-bold">Balance</th>
              <th className="border p-2 text-center font-bold">Claims</th>
              <th className="border p-2 text-left font-bold">Last Service</th>
            </tr>
          </thead>
          <tbody>
            {balances.map(b => (
              <tr key={b.patient.id}>
                <td className="border p-2">{b.patient.first_name} {b.patient.last_name}</td>
                <td className="border p-2 text-right">${b.totalCharged.toFixed(2)}</td>
                <td className="border p-2 text-right">${b.totalPaid.toFixed(2)}</td>
                <td className="border p-2 text-right font-semibold">${Math.abs(b.balance).toFixed(2)}</td>
                <td className="border p-2 text-center">{b.claimCount}</td>
                <td className="border p-2">{b.lastService || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
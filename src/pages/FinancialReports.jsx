import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, CalendarDays, DollarSign, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function FinancialReports() {
  const [claims, setClaims] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("summary");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedPatient, setSelectedPatient] = useState("");
  const [patients, setPatients] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const [claimsData, paymentsData, patientsData] = await Promise.all([
        base44.entities.Claim.list("-updated_date", 500),
        base44.entities.Payment.list("-payment_date", 500),
        base44.entities.Patient.list("-updated_date", 200),
      ]);
      setClaims(claimsData);
      setPayments(paymentsData);
      setPatients(patientsData);
      setLoading(false);
    };
    init();
  }, []);

  // Filter data by date range
  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (!dateRange.from && !dateRange.to) return true;
      if (dateRange.from && c.date_of_service < dateRange.from) return false;
      if (dateRange.to && c.date_of_service > dateRange.to) return false;
      return true;
    });
  }, [claims, dateRange]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (!dateRange.from && !dateRange.to) return true;
      if (dateRange.from && p.payment_date < dateRange.from) return false;
      if (dateRange.to && p.payment_date > dateRange.to) return false;
      return true;
    });
  }, [payments, dateRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalCharged = filteredClaims.reduce((sum, c) => sum + (c.total_charge || 0), 0);
    const totalPaid = filteredPayments.reduce((sum, p) => sum + (p.payment_amount || 0), 0);
    const outstanding = totalCharged - totalPaid;

    // CM-3: Include Copay/Coinsurance and Deductible as patient-sourced payments
    const cashCollected = filteredPayments
      .filter(p => ["Patient", "Copay/Coinsurance", "Deductible"].includes(p.payment_type))
      .reduce((sum, p) => sum + (p.payment_amount || 0), 0);

    const insuranceCollected = filteredPayments
      .filter(p => p.payment_type === "Insurance")
      .reduce((sum, p) => sum + (p.payment_amount || 0), 0);

    const denials = filteredPayments
      .filter(p => p.payment_type === "Denial")
      .reduce((sum, p) => sum + (p.payment_amount || 0), 0);

    const byType = filteredClaims.reduce((acc, c) => {
      const type = c.visit_type || "Unknown";
      if (!acc[type]) acc[type] = { count: 0, total: 0 };
      acc[type].count += 1;
      acc[type].total += c.total_charge || 0;
      return acc;
    }, {});

    return {
      totalCharged,
      totalPaid,
      outstanding,
      cashCollected,
      insuranceCollected,
      denials,
      byType,
      claimCount: filteredClaims.length,
      patientCount: new Set(filteredClaims.map(c => c.patient_id)).size,
    };
  }, [filteredClaims, filteredPayments]);

  const patientBills = useMemo(() => {
    const bills = {};
    filteredClaims.forEach(c => {
      if (!bills[c.patient_id]) {
        bills[c.patient_id] = {
          patient_id: c.patient_id,
          patient_name: c.patient_name,
          total_charged: 0,
          total_paid: 0,
        };
      }
      bills[c.patient_id].total_charged += c.total_charge || 0;
    });

    filteredPayments.forEach(p => {
      if (bills[p.patient_id]) {
        bills[p.patient_id].total_paid += p.payment_amount || 0;
      }
    });

    return Object.values(bills).map(b => ({
      ...b,
      outstanding: b.total_charged - b.total_paid,
    })).sort((a, b) => b.outstanding - a.outstanding);
  }, [filteredClaims, filteredPayments]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-end">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide">From Date</label>
          <Input
            type="date"
            value={dateRange.from}
            onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide">To Date</label>
          <Input
            type="date"
            value={dateRange.to}
            onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="mt-1"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setDateRange({ from: "", to: "" })}
        >
          Clear Dates
        </Button>
      </div>

      {/* Report Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "summary", label: "Summary", icon: TrendingUp },
          { id: "patient-bills", label: "Patient Bills", icon: Users },
          { id: "collections", label: "Collections", icon: DollarSign },
        ].map(type => (
          <button
            key={type.id}
            onClick={() => setReportType(type.id)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
              reportType === type.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:bg-muted"
            }`}
          >
            <type.icon className="w-4 h-4" />
            {type.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Report */}
          {reportType === "summary" && (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Charged"
                  value={`$${metrics.totalCharged.toFixed(2)}`}
                  color="blue"
                />
                <MetricCard
                  label="Total Collected"
                  value={`$${metrics.totalPaid.toFixed(2)}`}
                  color="green"
                />
                <MetricCard
                  label="Outstanding Balance"
                  value={`$${metrics.outstanding.toFixed(2)}`}
                  color={metrics.outstanding > 10000 ? "red" : "amber"}
                />
                <MetricCard
                  label="Collection Rate"
                  value={`${((metrics.totalPaid / metrics.totalCharged) * 100).toFixed(1)}%`}
                  subtitle="Charges by service date; payments by payment date"
                  color="purple"
                />
              </div>

              {/* Collection Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CollectionBox label="Insurance Collected" amount={metrics.insuranceCollected} color="blue" />
                <CollectionBox label="Patient/Cash Collected" amount={metrics.cashCollected} color="green" />
                <CollectionBox label="Denials/Adjustments" amount={metrics.denials} color="red" />
              </div>

              {/* Visit Type Breakdown */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-4">Revenue by Visit Type</h3>
                <div className="space-y-2">
                  {Object.entries(metrics.byType).map(([type, data]) => (
                    <div key={type} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{type}</p>
                        <p className="text-xs text-muted-foreground">{data.count} claims</p>
                      </div>
                      <p className="font-bold text-lg">${data.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">Total Claims</p>
                  <p className="text-3xl font-bold mt-1">{metrics.claimCount}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">Unique Patients</p>
                  <p className="text-3xl font-bold mt-1">{metrics.patientCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* Patient Bills Report */}
          {reportType === "patient-bills" && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">Patient Name</th>
                    <th className="text-right py-3 px-4 font-medium">Amount Charged</th>
                    <th className="text-right py-3 px-4 font-medium">Amount Paid</th>
                    <th className="text-right py-3 px-4 font-medium">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {patientBills.map(bill => (
                    <tr key={bill.patient_id} className="border-b border-border hover:bg-muted/20">
                      <td className="py-3 px-4">{bill.patient_name}</td>
                      <td className="text-right py-3 px-4">${bill.total_charged.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-green-600 font-medium">${bill.total_paid.toFixed(2)}</td>
                      <td className={`text-right py-3 px-4 font-medium ${bill.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                        ${bill.outstanding.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50 font-bold">
                    <td className="py-3 px-4">TOTAL</td>
                    <td className="text-right py-3 px-4">${patientBills.reduce((s, b) => s + b.total_charged, 0).toFixed(2)}</td>
                    <td className="text-right py-3 px-4">${patientBills.reduce((s, b) => s + b.total_paid, 0).toFixed(2)}</td>
                    <td className="text-right py-3 px-4">${patientBills.reduce((s, b) => s + b.outstanding, 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Collections Report */}
          {reportType === "collections" && (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-4">Collections by Payment Type</h3>
                <div className="space-y-3">
                  {["Insurance", "Patient", "Adjustment", "Denial"].map(type => {
                    const amount = filteredPayments
                      .filter(p => p.payment_type === type)
                      .reduce((sum, p) => sum + (p.payment_amount || 0), 0);
                    const count = filteredPayments.filter(p => p.payment_type === type).length;
                    return (
                      <div key={type} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{type}</p>
                          <p className="text-xs text-muted-foreground">{count} entries</p>
                        </div>
                        <p className="font-bold text-lg">${amount.toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Recent Payments</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">Patient</th>
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-right py-3 px-4 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.slice(0, 20).map(p => (
                      <tr key={p.id} className="border-b border-border hover:bg-muted/20">
                        <td className="py-3 px-4">{p.patient_name}</td>
                        <td className="py-3 px-4">{p.payment_date}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            p.payment_type === "Insurance" ? "bg-blue-100 text-blue-700" :
                            p.payment_type === "Patient" ? "bg-green-100 text-green-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {p.payment_type}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 font-medium">${p.payment_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, color, subtitle }) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
    </div>
  );
}

function CollectionBox({ label, amount, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-2">${amount.toFixed(2)}</p>
    </div>
  );
}
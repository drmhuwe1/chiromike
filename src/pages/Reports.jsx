import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Mail, Briefcase, BarChart3, DollarSign } from "lucide-react";
import PatientBalancesReport from "../components/reports/PatientBalancesReport";
import CollectionsLetterModal from "../components/reports/CollectionsLetterModal";
import LegalCaseSummaryModal from "../components/reports/LegalCaseSummaryModal";
import ARAgingReport from "../components/reports/ARAgingReport";
import RevenueByPayerReport from "../components/reports/RevenueByPayerReport";
import ProcedureUtilizationReport from "../components/reports/ProcedureUtilizationReport";
import EndOfYearFinancialReport from "../components/reports/EndOfYearFinancialReport";

export default function Reports() {
  const [claims, setClaims] = useState([]);
  const [patients, setPatients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [reportTab, setReportTab] = useState("claims");
  const [collectionsPatient, setCollectionsPatient] = useState(null);
  const [legalPatient, setLegalPatient] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Claim.list("-created_date", 1000),
      base44.entities.Patient.list("-updated_date", 500),
      base44.entities.Payment.list("-created_date", 1000)
    ]).then(([claimData, patientData, paymentData]) => {
      setClaims(claimData);
      setPatients(patientData);
      setPayments(paymentData);
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

      {/* Report Tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit flex-wrap">
        <button
          onClick={() => setReportTab("claims")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportTab === "claims" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <FileText className="w-4 h-4 inline mr-1" /> Claims Analysis
        </button>
        <button
          onClick={() => setReportTab("balances")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportTab === "balances" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Patient Balances
        </button>
        <button
          onClick={() => setReportTab("collections")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportTab === "collections" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Mail className="w-4 h-4 inline mr-1" /> Collections
        </button>
        <button
          onClick={() => setReportTab("legal")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportTab === "legal" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Briefcase className="w-4 h-4 inline mr-1" /> Legal Case Summary
        </button>
        <button
          onClick={() => setReportTab("ar-aging")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportTab === "ar-aging" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <BarChart3 className="w-4 h-4 inline mr-1" /> A/R Aging
        </button>
        <button
          onClick={() => setReportTab("revenue-payer")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportTab === "revenue-payer" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <DollarSign className="w-4 h-4 inline mr-1" /> Revenue by Payer
        </button>
        <button
          onClick={() => setReportTab("procedures")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportTab === "procedures" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <FileText className="w-4 h-4 inline mr-1" /> Procedures
        </button>
        <button
          onClick={() => setReportTab("year-end")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportTab === "year-end" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <DollarSign className="w-4 h-4 inline mr-1" /> Year-End Summary
        </button>
      </div>

      {reportTab === "collections" && (
        <div>
          <div className="mb-6">
            <Label className="text-sm mb-2 block">Select Patient</Label>
            <select
              value={selectedPatient}
              onChange={e => {
                setSelectedPatient(e.target.value);
                if (e.target.value) {
                  const patient = patients.find(p => p.id === e.target.value);
                  if (patient) setCollectionsPatient(patient);
                }
              }}
              className="w-full md:w-80 border border-border rounded px-3 py-2 text-sm bg-background"
            >
              <option value="">-- Select a patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} — Balance: ${(
                    claims.filter(c => c.patient_id === p.id).reduce((s, c) => s + (c.total_charge || 0), 0) -
                    payments.filter(py => py.patient_id === p.id).reduce((s, py) => s + (py.payment_amount || 0), 0)
                  ).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {selectedPatient && (
            <Button
              onClick={() => {
                const p = patients.find(pt => pt.id === selectedPatient);
                setCollectionsPatient(p);
              }}
              className="mb-6"
            >
              Generate Collections Letter
            </Button>
          )}

          {!selectedPatient && (
            <div className="text-center py-12 text-muted-foreground">
              Select a patient to generate a collections letter.
            </div>
          )}
        </div>
      )}

      {reportTab === "legal" && (
        <div>
          <div className="mb-6">
            <Label className="text-sm mb-2 block">Select Patient (Injury Cases)</Label>
            <select
              value={selectedPatient}
              onChange={e => setSelectedPatient(e.target.value)}
              className="w-full md:w-80 border border-border rounded px-3 py-2 text-sm bg-background"
            >
              <option value="">-- Select a patient --</option>
              {patients
                .filter(p => claims.some(c => c.patient_id === p.id && c.accident_related))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
            </select>
          </div>

          {selectedPatient && (
            <Button
              onClick={() => {
                const p = patients.find(pt => pt.id === selectedPatient);
                setLegalPatient(p);
              }}
              className="mb-6"
            >
              Generate Legal Case Summary
            </Button>
          )}

          {!selectedPatient && (
            <div className="text-center py-12 text-muted-foreground">
              Select an injury case patient to generate a legal case summary report.
            </div>
          )}
        </div>
      )}

      {reportTab === "ar-aging" && (
       <ARAgingReport claims={claims} payments={payments} />
      )}

      {reportTab === "revenue-payer" && (
       <RevenueByPayerReport claims={claims} payments={payments} />
      )}

      {reportTab === "procedures" && (
       <ProcedureUtilizationReport claims={claims} />
      )}

      {reportTab === "year-end" && (
       <EndOfYearFinancialReport claims={claims} payments={payments} />
      )}

      {reportTab === "balances" && (
       <PatientBalancesReport patients={patients} claims={claims} payments={payments} />
      )}

      {reportTab === "claims" && (
      <div>
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
      )}

      {/* Collections Letter Modal */}
      {collectionsPatient && (
       <CollectionsLetterModal
         patient={collectionsPatient}
         claims={claims.filter(c => c.patient_id === collectionsPatient.id)}
         payments={payments.filter(p => p.patient_id === collectionsPatient.id)}
         onClose={() => {
           setCollectionsPatient(null);
           setSelectedPatient("");
         }}
       />
      )}

      {/* Legal Case Summary Modal */}
      {legalPatient && (
       <LegalCaseSummaryModal
         patient={legalPatient}
         claims={claims.filter(c => c.patient_id === legalPatient.id && c.accident_related)}
         onClose={() => {
           setLegalPatient(null);
           setSelectedPatient("");
         }}
       />
      )}
      </div>
      );
      }
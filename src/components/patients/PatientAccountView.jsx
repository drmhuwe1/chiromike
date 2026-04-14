import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, CreditCard } from "lucide-react";
import PatientStatementPrint from "./PatientStatementPrint";
import PaymentModal from "../payment/PaymentModal";

export default function PatientAccountView({ patient }) {
  const [claims, setClaims] = useState([]);
  const [payments, setPayments] = useState([]);
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showPrint, setShowPrint] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [c, p, s] = await Promise.all([
        base44.entities.Claim.filter({ patient_id: patient.id }, "-date_of_service", 500),
        base44.entities.Payment.filter({ patient_id: patient.id }, "-payment_date", 500),
        base44.entities.OfficeSettings.list("-updated_date", 1)
      ]);
      setClaims(c);
      setPayments(p);
      setOffice(s[0] || null);
      setLoading(false);
    };
    load();
  }, [patient.id]);

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (startDate && c.date_of_service < startDate) return false;
      if (endDate && c.date_of_service > endDate) return false;
      return true;
    }).sort((a, b) => new Date(b.date_of_service) - new Date(a.date_of_service));
  }, [claims, startDate, endDate]);

  const totalCharges = useMemo(() => 
    filteredClaims.reduce((sum, c) => sum + (c.total_charge || 0), 0),
    [filteredClaims]
  );

  const totalPayments = useMemo(() =>
    payments.filter(p => {
      if (startDate && p.payment_date < startDate) return false;
      if (endDate && p.payment_date > endDate) return false;
      return true;
    }).reduce((sum, p) => sum + (p.payment_amount || 0), 0),
    [payments, startDate, endDate]
  );

  const balance = totalCharges - totalPayments;

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (showPrint) {
    return (
      <PatientStatementPrint
        patient={patient}
        office={office}
        claims={filteredClaims}
        payments={payments.filter(p => {
          if (startDate && p.payment_date < startDate) return false;
          if (endDate && p.payment_date > endDate) return false;
          return true;
        })}
        onClose={() => setShowPrint(false)}
      />
    );
  }

  const mostRecentClaim = filteredClaims[0] || claims[0] || null;

  return (
    <>
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-lg font-bold mb-1">{patient.first_name} {patient.last_name}</h2>
        <p className="text-sm text-muted-foreground">{patient.email} | {patient.phone}</p>
        {patient.insurance_company && (
          <p className="text-sm text-muted-foreground mt-2">
            <strong>Insurance:</strong> {patient.insurance_company} {patient.insurance_id && `(${patient.insurance_id})`}
          </p>
        )}
      </div>

      {/* Date Filter */}
      <div className="bg-card border border-border rounded-xl p-4">
        <Label className="text-sm font-semibold mb-3 block">Filter by Date of Service</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="mt-1 h-9"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Charges</p>
          <p className="text-2xl font-bold">${totalCharges.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Payments</p>
          <p className="text-2xl font-bold text-green-600">${totalPayments.toFixed(2)}</p>
        </div>
        <div className={`bg-card border rounded-xl p-4 ${balance > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-green-200 bg-green-50'}`}>
          <p className="text-xs text-muted-foreground mb-1">Balance Due</p>
          <p className={`text-2xl font-bold ${balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
            ${Math.abs(balance).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold">{filteredClaims.length} Visits</h3>
          <div className="flex gap-2">
            <Button onClick={() => setShowPayment(true)} className="gap-2 bg-green-600 hover:bg-green-700">
              <CreditCard className="w-4 h-4" /> Collect Payment
            </Button>
            <Button onClick={() => setShowPrint(true)} variant="outline" className="gap-2">
              <Printer className="w-4 h-4" /> Statement PDF
            </Button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-2 px-4 font-medium">Date</th>
              <th className="text-left py-2 px-4 font-medium">Type</th>
              <th className="text-left py-2 px-4 font-medium">Procedures</th>
              <th className="text-left py-2 px-4 font-medium">Diagnoses</th>
              <th className="text-right py-2 px-4 font-medium">Charge</th>
            </tr>
          </thead>
          <tbody>
            {filteredClaims.map(c => (
              <tr key={c.id} className="border-b hover:bg-muted/30">
                <td className="py-2 px-4 font-mono text-sm">{c.date_of_service}</td>
                <td className="py-2 px-4">{c.visit_type}</td>
                <td className="py-2 px-4 text-xs">
                  {(c.service_lines || []).map(l => l.code).join(", ") || "—"}
                </td>
                <td className="py-2 px-4 text-xs">
                  {(c.diagnoses || []).map(d => d.code).join(", ") || "—"}
                </td>
                <td className="py-2 px-4 text-right font-semibold">${(c.total_charge || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {showPayment && (
      <PaymentModal
        claim={mostRecentClaim || { id: null, date_of_service: new Date().toISOString().split("T")[0], total_charge: balance }}
        patient={patient}
        onClose={() => setShowPayment(false)}
        onSuccess={() => { setShowPayment(false); }}
      />
    )}
    </>
  );
}
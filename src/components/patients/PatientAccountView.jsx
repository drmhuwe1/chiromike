import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, CreditCard, PlusCircle, ChevronDown, ChevronUp, FileText, Loader2, RefreshCw, Smartphone, Send, X } from "lucide-react";
import PatientStatementPrint from "./PatientStatementPrint";
import PaymentModal from "../payment/PaymentModal";
import PostPaymentModal from "./PostPaymentModal";
import { useToast } from "@/components/ui/use-toast";

export default function PatientAccountView({ patient }) {
  const [claims, setClaims] = useState([]);
  const [payments, setPayments] = useState([]);
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showPrint, setShowPrint] = useState(false);
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [postPaymentClaim, setPostPaymentClaim] = useState(null);
  const [expandedClaimId, setExpandedClaimId] = useState(null);
  const [soapNotes, setSoapNotes] = useState([]);
  const [generatingSoapNote, setGeneratingSoapNote] = useState(false);
  const [selectedClaimIds, setSelectedClaimIds] = useState(new Set());
  const { toast } = useToast();

  const load = async () => {
    const [c, p, s, notes] = await Promise.all([
      base44.entities.Claim.filter({ patient_id: patient.id }, "-date_of_service", 500),
      base44.entities.Payment.filter({ patient_id: patient.id }, "-payment_date", 500),
      base44.entities.OfficeSettings.list("-updated_date", 1),
      base44.entities.SoapNote.filter({ patient_id: patient.id }, "-date_of_service", 50)
    ]);
    setClaims(c);
    setPayments(p);
    setOffice(s[0] || null);
    setSoapNotes(notes);
    setLoading(false);
  };

  useEffect(() => { load(); }, [patient.id]);

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (startDate && c.date_of_service < startDate) return false;
      if (endDate && c.date_of_service > endDate) return false;
      return true;
    }).sort((a, b) => new Date(b.date_of_service) - new Date(a.date_of_service));
  }, [claims, startDate, endDate]);

  // Group payments by claim_id for per-row display
  // If a payment has no claim_id, try to match it to a claim by date_of_service
  const paymentsByClaimId = useMemo(() => {
    const map = {};
    // Build a DOS -> claim_id lookup
    const dosToClaim = {};
    claims.forEach(c => {
      if (c.date_of_service && !dosToClaim[c.date_of_service]) {
        dosToClaim[c.date_of_service] = c.id;
      }
    });
    payments.forEach(p => {
      const key = p.claim_id || dosToClaim[p.date_of_service] || "__unlinked__";
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [payments, claims]);

  const filteredPayments = useMemo(() =>
    payments.filter(p => {
      if (startDate && p.payment_date < startDate) return false;
      if (endDate && p.payment_date > endDate) return false;
      return true;
    }),
    [payments, startDate, endDate]
  );

  const totalCharges = useMemo(() =>
    filteredClaims.reduce((sum, c) => sum + (c.total_charge || 0), 0),
    [filteredClaims]
  );

  const totalPayments = useMemo(() =>
    filteredPayments.reduce((sum, p) => sum + (p.payment_amount || 0), 0),
    [filteredPayments]
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
        payments={filteredPayments}
        onClose={() => setShowPrint(false)}
      />
    );
  }

  const mostRecentClaim = filteredClaims[0] || claims[0] || null;

  const handleGenerateSoapNote = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Please select both From and To dates", variant: "destructive" });
      return;
    }
    setGeneratingSoapNote(true);
    try {
      const res = await base44.functions.invoke("generateSoapNote", {
        patient_id: patient.id,
        date_from: startDate,
        date_to: endDate,
        form_type: "claim"
      });
      if (res.data) {
        setSoapNotes([res.data, ...soapNotes]);
        toast({ title: "SOAP note generated successfully" });
      }
    } catch (e) {
      toast({ title: e.message || "Failed to generate SOAP note", variant: "destructive" });
    }
    setGeneratingSoapNote(false);
  };

  return (
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

      {/* Claims Table with per-row payment posting */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          {/* Date filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Filter by DOS:</span>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-36 text-xs" />
            <span className="text-xs text-muted-foreground">–</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-36 text-xs" />
            {(startDate || endDate) && (
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setStartDate(""); setEndDate(""); }}>
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
            <span className="text-sm font-bold ml-1">{filteredClaims.length} Visits</span>
          </div>
          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {selectedClaimIds.size > 0 ? (
                <>
                  <Button size="sm" className="gap-1.5 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                    onClick={() => [...selectedClaimIds].forEach(id => window.open(`/print-claim?id=${id}`, "_blank"))}>
                    <Send className="w-3.5 h-3.5" /> Submit Selected ({selectedClaimIds.size})
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedClaimIds(new Set())}>Deselect All</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-8 text-xs"
                  onClick={() => setSelectedClaimIds(new Set(filteredClaims.map(c => c.id)))}>
                  Select All Visible
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setPostPaymentClaim("general")} variant="outline" className="gap-2 text-green-700 border-green-300 hover:bg-green-50">
                <PlusCircle className="w-4 h-4" /> Post Manual Payment
              </Button>
              <Button onClick={() => setShowStripePayment(true)} className="gap-2 bg-green-600 hover:bg-green-700">
                <CreditCard className="w-4 h-4" /> Collect via Stripe
              </Button>
              <Button onClick={() => { const amountCents = Math.round(Math.max(balance, 0) * 100); window.location.href = `izettle://payment?amount=${amountCents}`; }}
                variant="outline" className="gap-2 border-[#009AC7] text-[#009AC7] hover:bg-[#009AC7]/10">
                <Smartphone className="w-4 h-4" /> Pay via Zettle
              </Button>
              <Button onClick={() => { if (!startDate && !endDate) { if (!window.confirm("No date filter — statement will include ALL visits. Continue?")) return; } setShowPrint(true); }}
                variant="outline" className="gap-2">
                <Printer className="w-4 h-4" /> Statement PDF
              </Button>
            </div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-2 px-3 w-8">
                <input type="checkbox" className="rounded"
                  checked={filteredClaims.length > 0 && filteredClaims.every(c => selectedClaimIds.has(c.id))}
                  onChange={e => setSelectedClaimIds(e.target.checked ? new Set(filteredClaims.map(c => c.id)) : new Set())}
                />
              </th>
              <th className="text-left py-2 px-4 font-medium">Date of Service</th>
              <th className="text-left py-2 px-4 font-medium">Type</th>
              <th className="text-left py-2 px-4 font-medium hidden md:table-cell">Procedures</th>
              <th className="text-right py-2 px-4 font-medium">Charge</th>
              <th className="text-right py-2 px-4 font-medium">Paid</th>
              <th className="text-right py-2 px-4 font-medium">Balance</th>
              <th className="py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredClaims.map(c => {
              const claimPayments = paymentsByClaimId[c.id] || [];
              const paidAmt = claimPayments.reduce((s, p) => s + (p.payment_amount || 0), 0);
              const claimBalance = (c.total_charge || 0) - paidAmt;
              const isExpanded = expandedClaimId === c.id;

              return [
                <tr key={c.id} className={`border-b hover:bg-muted/30 ${selectedClaimIds.has(c.id) ? "bg-blue-50/50" : ""}`}>
                  <td className="py-2 px-3">
                    <input type="checkbox" className="rounded"
                      checked={selectedClaimIds.has(c.id)}
                      onChange={e => {
                        const next = new Set(selectedClaimIds);
                        e.target.checked ? next.add(c.id) : next.delete(c.id);
                        setSelectedClaimIds(next);
                      }}
                    />
                  </td>
                  <td className="py-2 px-4 font-mono text-sm">{c.date_of_service}</td>
                  <td className="py-2 px-4">{c.visit_type}</td>
                  <td className="py-2 px-4 text-xs hidden md:table-cell">
                    {(c.service_lines || []).map(l => l.code).join(", ") || "—"}
                  </td>
                  <td className="py-2 px-4 text-right font-semibold">${(c.total_charge || 0).toFixed(2)}</td>
                  <td className="py-2 px-4 text-right text-green-700 font-semibold">
                    {paidAmt > 0 ? `$${paidAmt.toFixed(2)}` : "—"}
                  </td>
                  <td className={`py-2 px-4 text-right font-bold ${claimBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    ${Math.abs(claimBalance).toFixed(2)}
                    {claimBalance < 0 && <span className="text-xs font-normal"> CR</span>}
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-blue-700 border-blue-300 hover:bg-blue-50 px-2"
                        onClick={() => window.open(`/print-claim?id=${c.id}`, "_blank")}
                      >
                        <Send className="w-3 h-3 mr-1" /> Submit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50 px-2"
                        onClick={() => setPostPaymentClaim(c)}
                      >
                        Post
                      </Button>
                      {claimPayments.length > 0 && (
                        <button
                          className="text-muted-foreground hover:text-foreground p-1"
                          onClick={() => setExpandedClaimId(isExpanded ? null : c.id)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>,
                isExpanded && claimPayments.length > 0 && (
                  <tr key={`${c.id}-payments`} className="border-b bg-green-50/50">
                    <td colSpan={8} className="px-8 py-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">Posted Payments</div>
                      <div className="space-y-1">
                        {claimPayments.map(p => (
                          <div key={p.id} className="flex justify-between text-xs text-green-900">
                            <span>{p.payment_date} · {p.payment_type}{p.check_number ? ` · #${p.check_number}` : ""}</span>
                            <span className="font-semibold">${(p.payment_amount || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              ];
            })}
            {filteredClaims.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">No visits found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* SOAP Notes */}
      {soapNotes.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> SOAP Notes ({soapNotes.length})</h3>
          </div>
          <div className="space-y-2 p-4">
            {soapNotes.map(note => (
              <div key={note.id} className="border border-border rounded-lg p-3 bg-muted/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{note.visit_type} · {note.date_of_service}</p>
                    <p className="text-xs text-muted-foreground mt-1">Provider: {note.provider_name}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <p><strong>Subjective:</strong> {note.subjective?.substring(0, 100)}...</p>
                  <p><strong>Assessment:</strong> {note.assessment?.substring(0, 100)}...</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Payments History */}
      {filteredPayments.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold">Payment History ({filteredPayments.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-2 px-4 font-medium">Payment Date</th>
                <th className="text-left py-2 px-4 font-medium">DOS</th>
                <th className="text-left py-2 px-4 font-medium">Type</th>
                <th className="text-left py-2 px-4 font-medium hidden md:table-cell">Check #</th>
                <th className="text-left py-2 px-4 font-medium hidden md:table-cell">Notes</th>
                <th className="text-right py-2 px-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)).map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-4 font-mono text-xs">{p.payment_date}</td>
                  <td className="py-2 px-4 font-mono text-xs">{p.date_of_service || "—"}</td>
                  <td className="py-2 px-4 text-xs">{p.payment_type}</td>
                  <td className="py-2 px-4 text-xs hidden md:table-cell">{p.check_number || "—"}</td>
                  <td className="py-2 px-4 text-xs hidden md:table-cell text-muted-foreground truncate max-w-[150px]">{p.notes || "—"}</td>
                  <td className="py-2 px-4 text-right font-semibold text-green-700">${(p.payment_amount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SOAP Note Generator */}
      <div className="bg-card border border-border rounded-xl p-4">
        <Label className="text-sm font-semibold mb-3 block">Generate SOAP Note (use DOS filter above)</Label>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateSoapNote}
            disabled={generatingSoapNote || !startDate || !endDate}
            variant="outline"
            className="flex-1 gap-2"
          >
            {generatingSoapNote ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><FileText className="w-4 h-4" /> Generate SOAP Note</>}
          </Button>
        </div>
        {(!startDate || !endDate) && <p className="text-xs text-muted-foreground mt-2">Set a date range above to generate a SOAP note for that period.</p>}
      </div>



      {/* Post Manual Payment Modal */}
      {postPaymentClaim && (
        <PostPaymentModal
          patient={patient}
          claim={postPaymentClaim === "general" ? null : postPaymentClaim}
          onClose={() => setPostPaymentClaim(null)}
          onSaved={() => { setPostPaymentClaim(null); load(); }}
        />
      )}

      {/* Stripe Payment Modal */}
      {showStripePayment && (
        <PaymentModal
          claim={mostRecentClaim || { id: null, date_of_service: new Date().toISOString().split("T")[0], total_charge: balance }}
          patient={patient}
          onClose={() => setShowStripePayment(false)}
          onSuccess={() => { setShowStripePayment(false); load(); }}
        />
      )}

      {/* Action Links */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
        <Button
          onClick={() => window.location.href = `/claim-builder?patient=${patient.id}`}
          className="gap-2"
        >
          <FileText className="w-4 h-4" /> New Claim
        </Button>
        <Button
          onClick={() => window.location.href = `/patient-account?patient=${patient.id}`}
          variant="outline"
          className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
        >
          <CreditCard className="w-4 h-4" /> Patient Statement
        </Button>
        <Button
          onClick={() => window.location.href = `/re-examination?patient=${patient.id}`}
          variant="outline"
          className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
        >
          <RefreshCw className="w-4 h-4" /> Re-Exam
        </Button>
      </div>
    </div>
  );
}
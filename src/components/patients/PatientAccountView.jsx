import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, CreditCard, PlusCircle, ChevronDown, ChevronUp, FileText, Loader2, RefreshCw, Smartphone, Send, X, ClipboardList, Trash2, Download, BookOpen, Trash, Stethoscope, ChevronRight } from "lucide-react";
import OrthoSuggestionModal from "./OrthoSuggestionModal";
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
  const [literature, setLiterature] = useState([]);
  const [orthoSuggestions, setOrthoSuggestions] = useState([]);
  const [showOrthoModal, setShowOrthoModal] = useState(false);
  const [expandedOrthoId, setExpandedOrthoId] = useState(null);
  const [generatingSoapNote, setGeneratingSoapNote] = useState(false);
  const [selectedClaimIds, setSelectedClaimIds] = useState(new Set());
  const { toast } = useToast();

  const load = async () => {
    const [c, p, s, notes, lit, ortho] = await Promise.all([
      base44.entities.Claim.filter({ patient_id: patient.id }, "-date_of_service", 500),
      base44.entities.Payment.filter({ patient_id: patient.id }, "-payment_date", 500),
      base44.entities.OfficeSettings.list("-updated_date", 1),
      base44.entities.SoapNote.filter({ patient_id: patient.id }, "-date_of_service", 50),
      base44.entities.MedicalLiterature.filter({ patient_id: patient.id }, "-created_date", 100),
      base44.entities.OrthoSuggestion.filter({ patient_id: patient.id }, "-created_date", 50),
    ]);
    setClaims(c);
    setPayments(p);
    setOffice(s[0] || null);
    setSoapNotes(notes);
    setLiterature(lit);
    setOrthoSuggestions(ortho);
    setLoading(false);
  };

  const handleDeleteOrthoSuggestion = async (entry) => {
    if (!window.confirm(`Delete this AI suggestion set (${entry.recommended_tests?.length || 0} test(s))? The recommendation was already reviewed; this only removes the stored copy.`)) return;
    await base44.entities.OrthoSuggestion.delete(entry.id);
    setOrthoSuggestions(prev => prev.filter(o => o.id !== entry.id));
    toast({ title: "Suggestion removed" });
  };

  const handleDeleteLiterature = async (entry) => {
    if (!window.confirm(`Delete this saved literature set (${entry.citations?.length || 0} citation(s))? The citations were already inserted where used; this only removes the stored copy.`)) return;
    await base44.entities.MedicalLiterature.delete(entry.id);
    setLiterature(prev => prev.filter(l => l.id !== entry.id));
    toast({ title: "Saved literature removed" });
  };

  const handleCopyCitationBlock = (entry) => {
    const text = (entry.citations || [])
      .map((c, i) => `${i + 1}. ${c.ama_citation}${c.relevance_summary ? ` — ${c.relevance_summary}` : ""}`)
      .join("\n");
    navigator.clipboard?.writeText(text);
    toast({ title: `${entry.citations?.length || 0} citation(s) copied to clipboard` });
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

  const handleDownload837 = async (claim) => {
    try {
      const res = await base44.functions.invoke("generateEDI837", { claim_id: claim.id });
      const content = res.data;
      const filename = `claim_${claim.patient_name?.replace(/\s+/g, '_') || 'unknown'}_${claim.date_of_service || 'unknown'}.837`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `837 downloaded: ${filename}` });
    } catch (e) {
      toast({ title: e.message || "Failed to generate 837", variant: "destructive" });
    }
  };

  const handleDeleteClaim = async (claim) => {
    if (!window.confirm(`Delete claim for ${claim.date_of_service} ($${(claim.total_charge || 0).toFixed(2)})? This cannot be undone.`)) return;
    await base44.entities.Claim.delete(claim.id);
    setClaims(prev => prev.filter(c => c.id !== claim.id));
    toast({ title: "Claim deleted" });
  };

  const handleGenerateSoapNote = async () => {
    setGeneratingSoapNote(true);
    // Use date filter if set, otherwise derive range from filtered claims
    let dateFrom = startDate;
    let dateTo = endDate;
    if (!dateFrom || !dateTo) {
      const dates = filteredClaims.map(c => c.date_of_service).filter(Boolean).sort();
      dateFrom = dates[0] || new Date().toISOString().split("T")[0];
      dateTo = dates[dates.length - 1] || dateFrom;
    }
    try {
      const res = await base44.functions.invoke("generateSoapNote", {
        patient_id: patient.id,
        date_from: dateFrom,
        date_to: dateTo,
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
                    onClick={() => { const ids = [...selectedClaimIds]; if (ids.length > 0) window.location.href = `/print-claim?id=${ids[0]}`; }}>
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
                        className="h-7 text-xs text-purple-700 border-purple-300 hover:bg-purple-50 px-2"
                        onClick={() => window.location.href = `/print-claim?id=${c.id}`}
                        title="Print HCFA / CMS-1500"
                      >
                        <ClipboardList className="w-3 h-3 mr-1" /> HCFA
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-orange-700 border-orange-300 hover:bg-orange-50 px-2"
                        onClick={() => handleDownload837(c)}
                        title="Download 837 EDI file for Office Ally"
                      >
                        <Download className="w-3 h-3 mr-1" /> 837
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
                      <button
                        className="text-destructive/50 hover:text-destructive p-1"
                        title="Delete claim"
                        onClick={() => handleDeleteClaim(c)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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

      {/* Saved Medical Literature */}
      {literature.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" /> Saved Medical Literature ({literature.length})
            </h3>
            <p className="text-xs text-muted-foreground">Copies kept on file for future use</p>
          </div>
          <div className="space-y-3 p-4">
            {literature.map((entry) => (
              <div key={entry.id} className="border border-purple-200 rounded-lg p-3 bg-purple-50/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        {entry.source}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {entry.citations?.length || 0} citation(s)
                      </span>
                    </div>
                    {entry.search_context && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{entry.search_context}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleCopyCitationBlock(entry)} title="Copy all citations to clipboard">
                      Copy
                    </Button>
                    <button
                      className="text-destructive/50 hover:text-destructive p-1"
                      title="Remove saved literature"
                      onClick={() => handleDeleteLiterature(entry)}
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <ol className="mt-2 space-y-1 text-xs">
                  {(entry.citations || []).map((c, i) => (
                    <li key={i} className="border-l-2 border-purple-200 pl-2">
                      <p className="italic">{c.ama_citation}</p>
                      {c.relevance_summary && (
                        <p className="text-muted-foreground mt-0.5">{c.relevance_summary}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* AI Orthopedic / Treatment Suggestion Generator */}
      <div className="bg-card border border-purple-200 rounded-xl p-4 bg-purple-50/30">
        <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-purple-600" /> AI Suggested Ortho Tests & Treatment Plan
        </Label>
        <p className="text-xs text-muted-foreground mb-3">AI scans current peer-reviewed journals & clinical guidelines to recommend orthopedic / neurological tests, imaging considerations, and an evidence-based treatment plan based on this patient's complaint, pain areas, and mechanism of injury.</p>
        <Button onClick={() => setShowOrthoModal(true)} variant="outline" className="gap-2 w-full border-purple-300 text-purple-700 hover:bg-purple-50">
          <Stethoscope className="w-4 h-4" /> Generate Suggestions for {patient.first_name}
        </Button>
        {orthoSuggestions.length > 0 && (
          <div className="mt-3 space-y-2">
            {orthoSuggestions.map((sug) => {
              const expanded = expandedOrthoId === sug.id;
              return (
                <div key={sug.id} className="border border-purple-200 rounded-lg p-3 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      className="flex-1 text-left"
                      onClick={() => setExpandedOrthoId(expanded ? null : sug.id)}
                    >
                      <div className="flex items-center gap-1 flex-wrap text-xs">
                        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span className="font-semibold">{new Date(sug.created_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                        <span className="text-muted-foreground">· {sug.recommended_tests?.length || 0} test(s)</span>
                        {sug.visit_frequency && <span className="text-muted-foreground">· {sug.visit_frequency}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 italic">{sug.context_summary}</p>
                    </button>
                    <button
                      className="text-destructive/50 hover:text-destructive p-1 shrink-0"
                      title="Remove suggestion"
                      onClick={() => handleDeleteOrthoSuggestion(sug)}
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {expanded && (
                    <div className="mt-3 space-y-2 text-xs">
                      {/* Tests table */}
                      {(sug.recommended_tests || []).length > 0 && (
                        <div className="border border-border rounded overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50">
                              <tr className="border-b">
                                <th className="text-left py-1.5 px-2 font-semibold w-1/4">Test</th>
                                <th className="text-left py-1.5 px-2 font-semibold">Purpose</th>
                                <th className="text-left py-1.5 px-2 font-semibold">Positive Finding</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sug.recommended_tests.map((t, i) => (
                                <tr key={i} className="border-b last:border-0 align-top">
                                  <td className="py-1.5 px-2 font-semibold text-purple-700">{t.test_name}</td>
                                  <td className="py-1.5 px-2">{t.purpose}</td>
                                  <td className="py-1.5 px-2">{t.positive_finding}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {sug.diagnostic_considerations && (
                        <div className="border border-amber-200 bg-amber-50/40 rounded p-2">
                          <p className="font-semibold text-amber-800 mb-0.5">Diagnostic Considerations</p>
                          <p className="whitespace-pre-wrap">{sug.diagnostic_considerations}</p>
                        </div>
                      )}
                      {sug.treatment_plan && (
                        <div className="border border-blue-200 bg-blue-50/40 rounded p-2">
                          <p className="font-semibold text-blue-800 mb-0.5">Treatment Plan</p>
                          <p className="whitespace-pre-wrap">{sug.treatment_plan}</p>
                          <div className="flex gap-2 mt-1">
                            {sug.visit_frequency && <span className="text-muted-foreground">Visit freq: {sug.visit_frequency}</span>}
                            {sug.expected_duration && <span className="text-muted-foreground">Duration: {sug.expected_duration}</span>}
                          </div>
                        </div>
                      )}
                      {sug.supporting_summary && (
                        <div className="border border-border bg-muted/20 rounded p-2">
                          <p className="font-semibold mb-0.5">Clinical Rationale</p>
                          <p className="whitespace-pre-wrap">{sug.supporting_summary}</p>
                        </div>
                      )}
                      {(sug.cited_sources || []).length > 0 && (
                        <div className="text-xs">
                          <p className="font-semibold mb-0.5">Supporting Sources</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {sug.cited_sources.map((src, i) => <li key={i}>{src}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SOAP Note Generator */}
      <div className="bg-card border border-border rounded-xl p-4">
        <Label className="text-sm font-semibold mb-3 block">Generate SOAP Note</Label>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateSoapNote}
            disabled={generatingSoapNote || filteredClaims.length === 0}
            variant="outline"
            className="flex-1 gap-2"
          >
            {generatingSoapNote ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><FileText className="w-4 h-4" /> Generate SOAP Note</>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{startDate || endDate ? "Generating for filtered date range." : "Generating for all visits. Use DOS filter above to narrow the range."}</p>
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

      {/* AI Ortho Suggestion Modal */}
      {showOrthoModal && (
        <OrthoSuggestionModal
          patient={patient}
          onClose={() => setShowOrthoModal(false)}
          onSaved={() => load()}
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
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, Trash2, Mail, FileCode, ChevronDown, ChevronUp, X, History, CheckSquare, Square, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logAudit } from "../utils/auditLog";

const statusColors = {
  Draft: "bg-gray-100 text-gray-700",
  Saved: "bg-blue-100 text-blue-700",
  Printed: "bg-green-100 text-green-700",
  Submitted: "bg-purple-100 text-purple-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Denied: "bg-red-100 text-red-700",
};

export default function SavedClaims() {
  const [claims, setClaims] = useState([]);
  const [submissionCounts, setSubmissionCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [emailing, setEmailing] = useState(null);
  const [hcfaFlags, setHcfaFlags] = useState({});
  const [downloadingEdi, setDownloadingEdi] = useState(null);
  const [expandedClaim, setExpandedClaim] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchDownloading, setBatchDownloading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [data, subs] = await Promise.all([
      base44.entities.Claim.list("-created_date", 500),
      base44.entities.ClaimSubmission.list("-submitted_at", 1000)
    ]);
    setClaims(data);
    // Build a count map: claim_id -> number of submissions
    const counts = {};
    subs.forEach(s => { counts[s.claim_id] = (counts[s.claim_id] || 0) + 1; });
    setSubmissionCounts(counts);
    setLoading(false);
    logAudit("Viewed saved claims", "Claim");
  };

  useEffect(() => { load(); }, []);

  const filtered = claims.filter(c => {
    const q = search.toLowerCase();
    // Allow date search anytime, but patient name requires 3+ letters
    const matchSearch = c.date_of_service?.includes(q) || 
      (q.length >= 3 && c.patient_name?.toLowerCase().startsWith(q)) ||
      (q.length >= 3 && c.insurance_company?.toLowerCase().includes(q));
    const matchType = typeFilter === "All" || c.visit_type === typeFilter;
    return matchSearch && matchType;
  });

  const handlePrint = (claim) => {
    const isCash = claim.visit_type?.includes("Cash");
    navigate(isCash ? `/print-receipt?id=${claim.id}` : `/print-claim?id=${claim.id}`);
  };

  const handleEmailSuperbill = async (claim) => {
    setEmailing(claim.id);
    try {
      const res = await base44.functions.invoke('emailSuperbill', { claim_id: claim.id, include_hcfa: !!hcfaFlags[claim.id] });
      toast({ title: `Superbill emailed to ${res.data.sent_to}` });
      load();
    } catch (e) {
      toast({ title: e.message || 'Failed to send email', variant: 'destructive' });
    }
    setEmailing(null);
  };

  const handleDownloadEdi = async (claim) => {
    if (claim.visit_type?.includes('Cash')) {
      toast({ title: 'EDI files are for insurance claims only', variant: 'destructive' });
      return;
    }
    setDownloadingEdi(claim.id);
    try {
      const res = await base44.functions.invoke('generateEDI837', { claim_id: claim.id });
      const blob = new Blob([res.data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claim_${claim.patient_name?.replace(/\s+/g, '_')}_${claim.date_of_service}.edi`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: e.message || 'Failed to generate EDI', variant: 'destructive' });
    }
    setDownloadingEdi(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this claim?")) return;
    await base44.entities.Claim.delete(id);
    logAudit("Deleted claim", "Claim", id);
    load();
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const insuranceClaims = filtered.filter(c => !c.visit_type?.includes('Cash'));
    if (selectedIds.size === insuranceClaims.length && insuranceClaims.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(insuranceClaims.map(c => c.id)));
    }
  };

  const handleBatchHCFA = () => {
    const ids = [...selectedIds].join(',');
    // Open each in new tab sequentially
    const selectedClaims = filtered.filter(c => selectedIds.has(c.id));
    selectedClaims.forEach((c, i) => {
      setTimeout(() => window.open(`/print-claim?id=${c.id}`, '_blank'), i * 300);
    });
  };

  const handleBatch837 = async () => {
    const selectedClaims = filtered.filter(c => selectedIds.has(c.id) && !c.visit_type?.includes('Cash'));
    if (selectedClaims.length === 0) return;
    setBatchDownloading(true);
    let success = 0, failed = 0;
    for (const claim of selectedClaims) {
      try {
        const res = await base44.functions.invoke('generateEDI837', { claim_id: claim.id });
        const blob = new Blob([res.data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claim_${claim.patient_name?.replace(/\s+/g, '_')}_${claim.date_of_service}.edi`;
        a.click();
        URL.revokeObjectURL(url);
        success++;
      } catch { failed++; }
    }
    toast({ title: `Downloaded ${success} EDI file${success !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}` });
    setBatchDownloading(false);
  };

  const insuranceSelected = filtered.filter(c => selectedIds.has(c.id) && !c.visit_type?.includes('Cash'));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Saved Claims</h1>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by date, patient, or insurance..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
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

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex-wrap">
          <span className="text-sm font-medium text-blue-800">{selectedIds.size} claim{selectedIds.size !== 1 ? 's' : ''} selected</span>
          <Button size="sm" variant="outline" onClick={handleBatchHCFA} className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100">
            <Printer className="w-3.5 h-3.5" /> Batch Print HCFA
          </Button>
          <Button size="sm" variant="outline" onClick={handleBatch837} disabled={batchDownloading || insuranceSelected.length === 0} className="gap-1.5 border-green-300 text-green-700 hover:bg-green-100">
            {batchDownloading ? <div className="w-3.5 h-3.5 border-2 border-muted border-t-green-600 rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Batch Download 837 ({insuranceSelected.length})
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="ml-auto text-muted-foreground">
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-3 w-10">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-primary transition-colors">
                    {selectedIds.size > 0 && selectedIds.size === filtered.filter(c => !c.visit_type?.includes('Cash')).length
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Patient</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Type</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Insurance</th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">Total</th>
                <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">Status</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const isExpanded = expandedClaim === c.id;
                const isCash = c.visit_type?.includes('Cash');
                const insuranceDisplay = c.insurance_company || c.payer_type || '—';
                return [
                  <tr key={c.id} className={`border-b hover:bg-muted/30 cursor-pointer ${selectedIds.has(c.id) ? 'bg-blue-50/60' : ''}`} onClick={() => setExpandedClaim(isExpanded ? null : c.id)}>
                    <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                      {!isCash && (
                        <button onClick={() => toggleSelect(c.id)} className="text-muted-foreground hover:text-primary transition-colors">
                          {selectedIds.has(c.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">{c.date_of_service}</td>
                    <td className="py-3 px-4 font-medium">{c.patient_name}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{c.visit_type}</td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      {isCash ? <span className="text-muted-foreground">—</span> : (
                        <span className="font-medium text-foreground">{insuranceDisplay}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right hidden md:table-cell font-semibold">${(c.total_charge || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || ""}`}>
                          {c.status}
                        </span>
                        {submissionCounts[c.id] > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium" title="Times submitted">
                            <History className="w-3 h-3" />{submissionCounts[c.id]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        {!c.visit_type?.includes('Cash') && (
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadEdi(c)} title="Download 837P EDI" disabled={downloadingEdi === c.id}>
                            {downloadingEdi === c.id ? <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" /> : <FileCode className="w-4 h-4" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handlePrint(c)} title="Print">
                          <Printer className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-1" title="Also attach CMS-1500 when emailing">
                          <input type="checkbox" checked={!!hcfaFlags[c.id]} onChange={e => setHcfaFlags(f => ({ ...f, [c.id]: e.target.checked }))} className="w-3.5 h-3.5 accent-blue-600" />
                          <Button variant="ghost" size="sm" onClick={() => handleEmailSuperbill(c)} title={hcfaFlags[c.id] ? 'Email Superbill + CMS-1500' : 'Email Superbill to Patient'} disabled={emailing === c.id}>
                            {emailing === c.id ? <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" /> : <Mail className="w-4 h-4" />}
                          </Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} title="Delete" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <span className="text-muted-foreground pl-1">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                      </div>
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${c.id}-detail`} className="border-b bg-muted/10">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* Claim Info */}
                          <div className="space-y-2">
                            <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Claim Info</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <span className="text-muted-foreground">Patient:</span><span className="font-medium">{c.patient_name}</span>
                              <span className="text-muted-foreground">Date of Service:</span><span>{c.date_of_service}</span>
                              <span className="text-muted-foreground">Visit Type:</span><span>{c.visit_type}</span>
                              <span className="text-muted-foreground">Payer Type:</span><span>{c.payer_type}</span>
                              <span className="text-muted-foreground">Status:</span>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium w-fit ${statusColors[c.status] || ""}`}>{c.status}</span>
                              {c.insurance_company && <><span className="text-muted-foreground">Insurance:</span><span>{c.insurance_company}</span></>}
                              {c.insurance_id && <><span className="text-muted-foreground">Ins ID:</span><span>{c.insurance_id}</span></>}
                              {c.authorization_number && <><span className="text-muted-foreground">Auth #:</span><span>{c.authorization_number}</span></>}
                              {c.place_of_service && <><span className="text-muted-foreground">POS:</span><span>{c.place_of_service}</span></>}
                            </div>
                          </div>

                          {/* Diagnoses */}
                          <div className="space-y-2">
                            <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Diagnoses</p>
                            {c.diagnoses?.length > 0 ? (
                              <div className="space-y-1">
                                {c.diagnoses.map((d, i) => (
                                  <div key={i} className="text-xs flex gap-2">
                                    <span className="font-mono font-semibold text-primary">{d.code}</span>
                                    <span className="text-muted-foreground">{d.description}</span>
                                  </div>
                                ))}
                              </div>
                            ) : <p className="text-xs text-muted-foreground">None</p>}
                          </div>

                          {/* Service Lines */}
                          <div className="col-span-1 md:col-span-2 space-y-2">
                            <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Service Lines</p>
                            {c.service_lines?.length > 0 ? (
                              <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-muted/50 border-b">
                                    <th className="text-left py-1.5 px-3 font-medium">Date</th>
                                    <th className="text-left py-1.5 px-3 font-medium">Code</th>
                                    <th className="text-left py-1.5 px-3 font-medium">Description</th>
                                    <th className="text-left py-1.5 px-3 font-medium">Mod</th>
                                    <th className="text-left py-1.5 px-3 font-medium">Diag Ptr</th>
                                    <th className="text-right py-1.5 px-3 font-medium">Units</th>
                                    <th className="text-right py-1.5 px-3 font-medium">Charge</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.service_lines.map((sl, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                      <td className="py-1.5 px-3 font-mono">{sl.date_of_service || c.date_of_service}</td>
                                      <td className="py-1.5 px-3 font-mono font-semibold text-primary">{sl.code}</td>
                                      <td className="py-1.5 px-3 text-muted-foreground">{sl.description}</td>
                                      <td className="py-1.5 px-3">{sl.modifier || "—"}</td>
                                      <td className="py-1.5 px-3">{sl.diagnosis_pointers || "—"}</td>
                                      <td className="py-1.5 px-3 text-right">{sl.units || 1}</td>
                                      <td className="py-1.5 px-3 text-right font-semibold">${(sl.charge || 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t bg-muted/30">
                                    <td colSpan={6} className="py-1.5 px-3 text-right font-semibold">Total:</td>
                                    <td className="py-1.5 px-3 text-right font-bold text-primary">${(c.total_charge || 0).toFixed(2)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            ) : <p className="text-xs text-muted-foreground">No service lines</p>}
                          </div>

                          {/* Notes */}
                          {c.claim_notes && (
                            <div className="col-span-1 md:col-span-2">
                              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Claim Notes</p>
                              <p className="text-xs bg-muted/30 rounded px-3 py-2">{c.claim_notes}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="col-span-1 md:col-span-2 flex flex-wrap gap-2 pt-2 border-t border-border">
                            <Button size="sm" onClick={() => handlePrint(c)} className="gap-1.5">
                              <Printer className="w-3.5 h-3.5" /> Print / View Form
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/claim-builder?duplicate=${c.id}`)} className="gap-1.5">
                              Edit / Duplicate
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate(`/print-claim?id=${c.id}`)} className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50">
                              <History className="w-3.5 h-3.5" /> Submission History ({submissionCounts[c.id] || 0})
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setExpandedClaim(null)} className="ml-auto gap-1.5">
                              <X className="w-3.5 h-3.5" /> Close
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                ];
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    {search || typeFilter !== "All" ? "No claims match your filters" : "No saved claims yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
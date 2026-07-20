import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Download, Upload, CheckCircle, AlertCircle, Loader2, RefreshCw,
  ClipboardCheck, Server, FileText, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ClaimReadinessCheck, { validateClaimReadiness } from "@/components/officeally/ClaimReadinessCheck";
import OfficeAllyExportModal from "@/components/officeally/OfficeAllyExportModal";
import OfficeAllyInstructions from "@/components/officeally/OfficeAllyInstructions";

const STATUS_COLORS = {
  Draft: "bg-gray-100 text-gray-700",
  "Ready to Submit": "bg-blue-100 text-blue-700",
  "Exported for Office Ally": "bg-purple-100 text-purple-700",
  "Submitted to Office Ally": "bg-indigo-100 text-indigo-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Paid: "bg-green-100 text-green-700",
  "Needs Review": "bg-amber-100 text-amber-700",
};

const STATUSES = ["Draft","Ready to Submit","Exported for Office Ally","Submitted to Office Ally","Accepted","Rejected","Paid","Needs Review"];

export default function OfficeAllySubmissions() {
  const [claims, setClaims] = useState([]);
  const [patients, setPatients] = useState({});
  const [batches, setBatches] = useState([]);
  const [oaSettings, setOaSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedIds, setSelectedIds] = useState([]);
  const [exportModal, setExportModal] = useState(null); // { claim, patient }
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [sftp, setSftp] = useState({ submitting: false, checking: false });
  const [tab, setTab] = useState("claims"); // claims | batches
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [claimsData, batchData, oaRes, patientsData] = await Promise.all([
      base44.entities.Claim.list("-date_of_service", 500),
      base44.entities.OfficeAllyBatch.list("-submitted_at", 100),
      base44.functions.invoke('officeAllySettings', { action: 'get' }),
      base44.entities.Patient.list("-updated_date", 500),
    ]);
    setClaims(claimsData);
    setBatches(batchData);
    setOaSettings(oaRes.data?.settings || null);
    const pMap = {};
    patientsData.forEach(p => { pMap[p.id] = p; });
    setPatients(pMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = claims.filter(c => {
    if (c.visit_type?.includes("Cash")) return false; // cash claims don't go to insurance
    return statusFilter === "All" || c.status === statusFilter;
  });

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelectedIds(filtered.map(c => c.id));
  const clearSelect = () => setSelectedIds([]);

  const handleUpdateStatus = async (claimId, newStatus) => {
    setUpdatingStatus(claimId);
    await base44.functions.invoke('officeAllySftp', { action: 'update_claim_status', claim_id: claimId, new_status: newStatus });
    setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: newStatus } : c));
    setUpdatingStatus(null);
    toast({ title: `Status updated to "${newStatus}"` });
  };

  const handleBatchExport = async () => {
    if (selectedIds.length === 0) { toast({ title: "Select at least one claim", variant: "destructive" }); return; }
    // Validate all selected
    const validationFails = [];
    for (const id of selectedIds) {
      const claim = claims.find(c => c.id === id);
      const patient = patients[claim?.patient_id];
      const errs = validateClaimReadiness(claim, patient);
      if (errs.length > 0) validationFails.push({ name: claim.patient_name, errors: errs });
    }
    if (validationFails.length > 0) {
      toast({ title: `${validationFails.length} claim(s) have validation errors. Fix them before exporting.`, variant: "destructive" });
      return;
    }
    // Office Ally's first-file rule: first batch should have >=10 claims.
    if (batches.length === 0 && selectedIds.length < 10) {
      if (!confirm(
        `Office Ally typically requires at least 10 claims on your VERY FIRST file submission to verify formatting.\n\n` +
        `You have ${selectedIds.length} selected. Submitting now may be rejected by Office Ally.\n\n` +
        `Continue anyway?`
      )) return;
    }
    setSftp(s => ({ ...s, submitting: true }));
    try {
      const res = await base44.functions.invoke('officeAllyExport', { claim_ids: selectedIds, mode: 'batch' });
      if (res.data?.error) throw new Error(res.data.error);
      // Trigger browser download of the batch EDI text
      const ediText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fname = `batch_${selectedIds.length}claims_${dateStr}.edi`;
      const blob = new Blob([ediText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: `Batch of ${selectedIds.length} claims exported`, description: `${fname} downloaded` });
      setSelectedIds([]);
      load();
    } catch (err) {
      toast({ title: err.message || "Batch export failed", variant: "destructive" });
    }
    setSftp(s => ({ ...s, submitting: false }));
  };

  const handleSftpSubmit = async () => {
    if (selectedIds.length === 0) { toast({ title: "Select at least one claim", variant: "destructive" }); return; }
    setSftp(s => ({ ...s, submitting: true }));
    const res = await base44.functions.invoke('officeAllySftp', { action: 'sftp_submit', claim_ids: selectedIds });
    if (res.data?.error) {
      toast({ title: res.data.error, variant: "destructive" });
    } else {
      toast({ title: `Successfully submitted ${selectedIds.length} claim(s) via SFTP!` });
      setSelectedIds([]);
      load();
    }
    setSftp(s => ({ ...s, submitting: false }));
  };

  const handleCheckReports = async () => {
    setSftp(s => ({ ...s, checking: true }));
    const res = await base44.functions.invoke('officeAllySftp', { action: 'check_reports' });
    if (res.data?.error) {
      toast({ title: res.data.error, variant: "destructive" });
    } else {
      toast({ title: `Found ${res.data.reports?.length || 0} report file(s) in SFTP outbound folder` });
    }
    setSftp(s => ({ ...s, checking: false }));
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Office Ally Submissions</h1>
          <p className="text-sm text-muted-foreground">Generate, export, and track 837P electronic claim submissions.</p>
        </div>
        <div className="flex gap-2">
          <a href="https://www.officeally.com" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> Open Office Ally</Button>
          </a>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
        </div>
      </div>

      {/* Settings status */}
      {!oaSettings?.submitter_id && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Office Ally not configured</p>
            <p className="text-xs text-amber-700">Set your Submitter ID and practice info in <a href="/settings" className="underline">Office Settings → Office Ally</a>.</p>
          </div>
        </div>
      )}

      {/* Batch instructions */}
      <OfficeAllyInstructions />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {["claims", "batches"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t === "claims" ? "Insurance Claims" : "Submission History"}
          </button>
        ))}
      </div>

      {tab === "claims" && (
        <>
          {/* Filters + batch actions */}
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedIds.length > 0 && (
              <div className="flex gap-2 ml-auto flex-wrap">
                <span className="text-sm text-muted-foreground self-center">{selectedIds.length} selected</span>
                <Button size="sm" variant="outline" onClick={clearSelect}>Clear</Button>
                <Button size="sm" onClick={handleBatchExport} disabled={sftp.submitting}>
                  {sftp.submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                  Batch Download 837P
                </Button>
                {oaSettings?.submission_mode === "Direct SFTP" && oaSettings?.sftp_configured && (
                  <Button size="sm" onClick={handleSftpSubmit} disabled={sftp.submitting}>
                    {sftp.submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Server className="w-4 h-4 mr-1" />}
                    Submit via SFTP
                  </Button>
                )}
              </div>
            )}
            {selectedIds.length === 0 && filtered.length > 0 && (
              <Button size="sm" variant="ghost" className="ml-auto" onClick={selectAll}>Select All {filtered.length}</Button>
            )}
          </div>

          {/* Claims table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-3 w-8"><input type="checkbox" onChange={e => e.target.checked ? selectAll() : clearSelect()} checked={selectedIds.length === filtered.length && filtered.length > 0} className="accent-primary" /></th>
                  <th className="text-left py-3 px-3 font-medium">Date</th>
                  <th className="text-left py-3 px-3 font-medium">Patient</th>
                  <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Insurance</th>
                  <th className="text-left py-3 px-3 font-medium">Status</th>
                  <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">Readiness</th>
                  <th className="text-right py-3 px-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(claim => {
                  const patient = patients[claim.patient_id] || {};
                  const errs = validateClaimReadiness(claim, patient);
                  return (
                    <tr key={claim.id} className="border-b hover:bg-muted/20">
                      <td className="py-3 px-3">
                        <input type="checkbox" checked={selectedIds.includes(claim.id)} onChange={() => toggleSelect(claim.id)} className="accent-primary" />
                      </td>
                      <td className="py-3 px-3 font-mono text-xs">{claim.date_of_service}</td>
                      <td className="py-3 px-3 font-medium">{claim.patient_name}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground hidden md:table-cell">{claim.insurance_company}</td>
                      <td className="py-3 px-3">
                        {updatingStatus === claim.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Select value={claim.status || "Draft"} onValueChange={v => handleUpdateStatus(claim.id, v)}>
                            <SelectTrigger className="h-7 text-xs w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => (
                                <SelectItem key={s} value={s}>
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s] || ''}`}>{s}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="py-3 px-3 hidden lg:table-cell">
                        {errs.length === 0
                          ? <span className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle className="w-3.5 h-3.5" /> Ready</span>
                          : <span className="flex items-center gap-1 text-xs text-red-700"><AlertCircle className="w-3.5 h-3.5" /> {errs.length} issue{errs.length > 1 ? 's' : ''}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" disabled={errs.length > 0}
                            onClick={() => setExportModal({ claim, patient })}
                            title={errs.length > 0 ? errs.join("; ") : "Export 837P for Office Ally"}>
                            <Download className="w-4 h-4 mr-1" /> Export
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No insurance claims found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SFTP reports button */}
          {oaSettings?.sftp_configured && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleCheckReports} disabled={sftp.checking}>
                {sftp.checking ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                Check Office Ally Reports (SFTP)
              </Button>
            </div>
          )}
        </>
      )}

      {tab === "batches" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Filename</th>
                <th className="text-left py-3 px-4 font-medium hidden md:table-cell">Claims</th>
                <th className="text-left py-3 px-4 font-medium">Mode</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">File ID</th>
                <th className="py-3 px-4 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <>
                  <tr key={batch.id} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}>
                    <td className="py-3 px-4 text-xs font-mono">{batch.submitted_at?.slice(0, 10)}</td>
                    <td className="py-3 px-4 text-xs font-mono text-primary">{batch.batch_filename}</td>
                    <td className="py-3 px-4 hidden md:table-cell">{batch.claim_count}</td>
                    <td className="py-3 px-4 text-xs">{batch.submission_mode}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${batch.status === 'Submitted via SFTP' ? 'bg-emerald-100 text-emerald-700' : batch.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-xs text-muted-foreground">{batch.office_ally_file_id || '—'}</td>
                    <td className="py-3 px-4">{expandedBatch === batch.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</td>
                  </tr>
                  {expandedBatch === batch.id && (
                    <tr key={`${batch.id}-detail`} className="bg-muted/10 border-b">
                      <td colSpan={7} className="px-6 py-4 text-xs space-y-2">
                        <p><span className="font-medium">Submitted by:</span> {batch.submitted_by}</p>
                        <p><span className="font-medium">Claims included:</span> {(batch.claim_ids || []).join(', ')}</p>
                        {batch.sftp_result && <p><span className="font-medium">SFTP Result:</span> {batch.sftp_result}</p>}
                        {batch.office_ally_file_id && <p><span className="font-medium">Office Ally File ID:</span> {batch.office_ally_file_id}</p>}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {batches.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No submissions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Export Modal */}
      {exportModal && (
        <OfficeAllyExportModal
          claim={exportModal.claim}
          patient={exportModal.patient}
          open={!!exportModal}
          onClose={() => { setExportModal(null); load(); }}
          onStatusUpdate={(status) => {
            setClaims(prev => prev.map(c => c.id === exportModal.claim.id ? { ...c, status } : c));
          }}
        />
      )}
    </div>
  );
}
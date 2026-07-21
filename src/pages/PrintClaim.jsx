import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Send, CheckCircle, History, RefreshCw, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import CMS1500Form from "@/components/claim/CMS1500Form";

export default function PrintClaim() {
  const urlParams = new URLSearchParams(window.location.search);
  const claimId = urlParams.get("id");
  const [claim, setClaim] = useState(null);
  const [office, setOffice] = useState(null);
  const [patient, setPatient] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [resubmitNotes, setResubmitNotes] = useState("");
  const [resubmitMethod, setResubmitMethod] = useState("Print");
  const [bwMode, setBwMode] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [patientCase, setPatientCase] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [me, claims, settings] = await Promise.all([
        base44.auth.me(),
        base44.entities.Claim.filter({ id: claimId }),
        base44.entities.OfficeSettings.list("-updated_date", 1)
      ]);
      setUser(me);
      const c = claims[0];
      setClaim(c);
      if (c) {
        const [patients, subs, cases] = await Promise.all([
          base44.entities.Patient.filter({ id: c.patient_id }),
          base44.entities.ClaimSubmission.filter({ claim_id: claimId }, "-submitted_at", 50),
          base44.entities.PatientCase.filter({ patient_id: c.patient_id }, "-created_date", 50)
        ]);
        setPatient(patients[0] || null);
        setSubmissions(subs);
        const defaultCase = cases.find(pc => pc.is_default) || cases[0] || null;
        setPatientCase(defaultCase);
      }
      const officeData = settings[0] || null;
      setOffice(officeData);
      const def = officeData?.additional_providers?.find(p => p.is_default);
      if (def) setSelectedProvider(def);
      setLoading(false);
    };
    if (claimId) load();
  }, [claimId]);

  const logSubmission = async (method, notes, resubOf) => {
    const sub = await base44.entities.ClaimSubmission.create({
      claim_id: claim.id,
      patient_id: claim.patient_id,
      patient_name: claim.patient_name,
      date_of_service: claim.date_of_service,
      insurance_company: claim.insurance_company,
      total_charge: claim.total_charge,
      method,
      submitted_at: new Date().toISOString(),
      submitted_by: user?.full_name || user?.email || "Staff",
      submission_notes: notes || "",
      status: "Submitted",
      resubmission_of: resubOf || ""
    });
    setSubmissions(prev => [sub, ...prev]);
    return sub;
  };

  const handlePrint = async () => {
    if (claim?.status === "Draft" || claim?.status === "Saved") {
      await base44.entities.Claim.update(claim.id, { status: "Printed" });
      setClaim(prev => ({ ...prev, status: "Printed" }));
    }
    await logSubmission("Print", "", "");
    window.print();
  };

  const handleMarkSubmitted = async () => {
    setSubmitting(true);
    await base44.entities.Claim.update(claim.id, { status: "Submitted" });
    setClaim(prev => ({ ...prev, status: "Submitted" }));
    await logSubmission(resubmitMethod, resubmitNotes, submissions[0]?.id || "");
    setResubmitNotes("");
    toast({ title: "Claim marked as Submitted — submission logged" });
    setSubmitting(false);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!claim) return <div className="text-center py-12 text-muted-foreground">Claim not found</div>;

  const dx = claim.diagnoses || [];
  const lines = claim.service_lines || [];
  const pc = patientCase;

  const effectiveClaim = {
    ...claim,
    insured_name: claim.insured_name || pc?.insured_name || patient?.insured_name || claim.patient_name || "",
    insured_dob: claim.insured_dob || pc?.insured_dob || patient?.insured_dob || "",
    insured_sex: claim.insured_sex || pc?.insured_sex || patient?.sex || "",
    insured_employer: claim.insured_employer || pc?.insured_employer || patient?.insured_employer || "",
    insurance_plan: claim.insurance_plan || pc?.insurance_plan || patient?.insurance_plan || "",
    insurance_group: claim.insurance_group || pc?.insurance_group || patient?.insurance_group || "",
    relationship_to_insured: claim.relationship_to_insured || pc?.relationship_to_insured || patient?.relationship_to_insured || "Self",
    authorization_number: claim.authorization_number || pc?.authorization_number || "",
    referring_provider: claim.referring_provider || pc?.referring_provider || "",
    referring_npi: claim.referring_npi || pc?.referring_npi || "",
    place_of_service: claim.place_of_service || pc?.place_of_service || "11",
    date_of_first_visit: claim.date_of_first_visit || pc?.date_of_first_visit || patient?.date_of_first_visit || "",
    onset_date: pc?.onset_date || "",
    accident_date: claim.accident_date || pc?.accident_date || patient?.accident_date || "",
    accident_employment: pc?.accident_employment || false,
    accident_auto: pc?.accident_auto || claim.accident_type === "Auto" || false,
    accident_other: pc?.accident_other || (claim.accident_related && claim.accident_type !== "Auto" && claim.accident_type !== "Work") || false,
    accident_auto_state: pc?.accident_auto_state || claim.accident_state || patient?.accident_state || "",
  };

  const ep = selectedProvider ? {
    rendering_provider: selectedProvider.provider_name,
    rendering_npi: selectedProvider.npi,
    billing_npi: selectedProvider.npi,
    ein_tax_id: selectedProvider.ein_tax_id || office?.ein_tax_id,
    taxonomy_code: selectedProvider.taxonomy_code || office?.taxonomy_code,
  } : {
    rendering_provider: office?.rendering_provider,
    rendering_npi: office?.rendering_npi,
    billing_npi: office?.billing_npi,
    ein_tax_id: office?.ein_tax_id,
    taxonomy_code: office?.taxonomy_code,
  };

  // Split service lines into pages of 6
  const LINES_PER_PAGE = 6;
  const pages = [];
  if (lines.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
      pages.push(lines.slice(i, i + LINES_PER_PAGE));
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="no-print mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-1.5">
            <History className="w-4 h-4" /> Submission History ({submissions.length})
          </Button>
          <div className="ml-auto flex gap-2 flex-wrap items-center">
            {/* Color mode toggle */}
            <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden text-sm">
              <button
                onClick={() => setBwMode(false)}
                className={`px-3 py-1.5 transition-colors ${!bwMode ? "bg-red-600 text-white font-semibold" : "bg-white text-gray-700 hover:bg-gray-100"}`}
              >
                🔴 Red Form
              </button>
              <button
                onClick={() => setBwMode(true)}
                className={`px-3 py-1.5 transition-colors ${bwMode ? "bg-gray-800 text-white font-semibold" : "bg-white text-gray-700 hover:bg-gray-100"}`}
              >
                ⬛ B&W / Fax
              </button>
            </div>
            {(claim.status === "Submitted" || claim.status === "Paid") && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm font-medium">
                <CheckCircle className="w-4 h-4" /> {claim.status}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => window.location.href = `/print-receipt?id=${claimId}`}
              className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <FileText className="w-4 h-4" /> Print Superbill
            </Button>
            <Button onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print HCFA
            </Button>
          </div>
        </div>

        {office?.additional_providers?.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted/40 border border-border rounded-xl">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Billing Provider:</span>
            <select
              value={selectedProvider ? JSON.stringify(selectedProvider) : ""}
              onChange={e => setSelectedProvider(e.target.value ? JSON.parse(e.target.value) : null)}
              className="border border-border rounded px-2 py-1.5 text-sm bg-white flex-1"
            >
              <option value="">Primary: {office.rendering_provider || office.billing_provider || "Default"}</option>
              {office.additional_providers.map((p, i) => (
                <option key={i} value={JSON.stringify(p)}>{p.provider_name} {p.npi ? `(NPI: ${p.npi})` : ""}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <select value={resubmitMethod} onChange={e => setResubmitMethod(e.target.value)}
            className="border border-blue-300 rounded px-2 py-1.5 text-sm bg-white">
            {["Print","Fax","EDI","Email","Portal","Mail"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="text" placeholder="Optional notes (auth #, rep name, confirmation #...)"
            value={resubmitNotes} onChange={e => setResubmitNotes(e.target.value)}
            className="flex-1 min-w-[200px] border border-blue-300 rounded px-3 py-1.5 text-sm bg-white" />
          <Button onClick={handleMarkSubmitted} disabled={submitting} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
            {submissions.length > 0
              ? <><RefreshCw className="w-4 h-4" /> Log Resubmission</>
              : <><Send className="w-4 h-4" /> Mark as Submitted</>}
          </Button>
        </div>

        {showHistory && (
          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="px-4 py-2 bg-muted/50 border-b text-sm font-semibold">Submission History</div>
            {submissions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No submissions logged yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2 px-4 font-medium">#</th>
                    <th className="text-left py-2 px-4 font-medium">Date/Time</th>
                    <th className="text-left py-2 px-4 font-medium">Method</th>
                    <th className="text-left py-2 px-4 font-medium">By</th>
                    <th className="text-left py-2 px-4 font-medium">Status</th>
                    <th className="text-left py-2 px-4 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="py-2 px-4 text-muted-foreground">{submissions.length - i}</td>
                      <td className="py-2 px-4 font-mono">{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}</td>
                      <td className="py-2 px-4"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{s.method}</span></td>
                      <td className="py-2 px-4 text-muted-foreground">{s.submitted_by}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "Paid" ? "bg-emerald-100 text-emerald-700" : s.status === "Denied" ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"}`}>{s.status}</span>
                      </td>
                      <td className="py-2 px-4 text-muted-foreground max-w-[200px] truncate">{s.submission_notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {pages.length > 1 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            ⚠️ This claim has {lines.length} service lines and will print on <strong>{pages.length} pages</strong> (6 lines per page).
          </div>
        )}
      </div>

      {/* CMS-1500 FORM — one CMS1500Form component per page of 6 service lines */}
      <div className="print-area" style={{ display: "block", margin: 0, padding: 0 }}>
        {pages.map((pageLines, idx) => (
          <CMS1500Form
            key={idx}
            effectiveClaim={effectiveClaim}
            patient={patient}
            office={office}
            ep={ep}
            dx={dx}
            serviceLines={pageLines}
            bwMode={bwMode}
            pageNum={idx + 1}
            totalPages={pages.length}
          />
        ))}
      </div>

      {claim.claim_notes && (
        <div className="no-print mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl max-w-[8.5in] mx-auto">
          <p className="text-xs font-bold text-yellow-800 mb-1">CLAIM NOTES (not printed on form)</p>
          <p className="text-sm text-yellow-900">{claim.claim_notes}</p>
        </div>
      )}
    </div>
  );
}

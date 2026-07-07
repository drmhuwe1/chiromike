import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Send, CheckCircle, History, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null); // overrides office defaults

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
        const [patients, subs] = await Promise.all([
          base44.entities.Patient.filter({ id: c.patient_id }),
          base44.entities.ClaimSubmission.filter({ claim_id: claimId }, "-submitted_at", 50)
        ]);
        setPatient(patients[0] || null);
        setSubmissions(subs);
      }
      const officeData = settings[0] || null;
      setOffice(officeData);
      // Auto-select default additional provider if set
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
  const payerType = claim.payer_type || "";

  const isMedicare = payerType === "Medicare";
  const isBCBS = payerType === "BCBS";
  const isAutoPI = payerType === "Auto/PI";
  const isCash = payerType === "Cash";
  const isOther = !isMedicare && !isBCBS && !isAutoPI && !isCash;

  // Effective provider — selectedProvider overrides office defaults
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

  const chk = (val) => val ? "X" : " ";
  const dxLetter = (i) => String.fromCharCode(65 + i);

  // Pad service lines to at least 6 rows
  const paddedLines = [...lines];
  while (paddedLines.length < 6) paddedLines.push(null);

  return (
    <div>
      {/* Toolbar - hidden on print */}
      <div className="no-print mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/saved-claims">
            <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-1.5">
            <History className="w-4 h-4" /> Submission History ({submissions.length})
          </Button>
          <div className="ml-auto flex gap-2 flex-wrap">
            {(claim.status === "Submitted" || claim.status === "Paid") && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm font-medium">
                <CheckCircle className="w-4 h-4" /> {claim.status}
              </div>
            )}
            <Button onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Provider selector */}
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

      {/* Submit / Resubmit controls */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <select
            value={resubmitMethod}
            onChange={e => setResubmitMethod(e.target.value)}
            className="border border-blue-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            {["Print", "Fax", "EDI", "Email", "Portal", "Mail"].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Optional notes (auth #, rep name, confirmation #...)"
            value={resubmitNotes}
            onChange={e => setResubmitNotes(e.target.value)}
            className="flex-1 min-w-[200px] border border-blue-300 rounded px-3 py-1.5 text-sm bg-white"
          />
          <Button onClick={handleMarkSubmitted} disabled={submitting} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
            {submissions.length > 0
              ? <><RefreshCw className="w-4 h-4" /> Log Resubmission</>
              : <><Send className="w-4 h-4" /> Mark as Submitted</>}
          </Button>
        </div>

        {/* Submission history panel */}
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
                    <th className="text-right py-2 px-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="py-2 px-4 text-muted-foreground">{submissions.length - i}</td>
                      <td className="py-2 px-4 font-mono">{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}</td>
                      <td className="py-2 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{s.method}</span>
                      </td>
                      <td className="py-2 px-4 text-muted-foreground">{s.submitted_by}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.status === "Paid" ? "bg-emerald-100 text-emerald-700" :
                          s.status === "Denied" ? "bg-red-100 text-red-700" :
                          "bg-purple-100 text-purple-700"
                        }`}>{s.status}</span>
                      </td>
                      <td className="py-2 px-4 text-muted-foreground max-w-[200px] truncate">{s.submission_notes || "—"}</td>
                      <td className="py-2 px-4 text-right">
                        <button
                          onClick={() => window.print()}
                          className="text-primary hover:underline text-xs"
                        >Reprint</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* CMS-1500 Form */}
      <div className="print-area bg-white mx-auto" style={{
        width: "8.5in",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "9px",
        color: "#000",
        border: "1px solid #000"
      }}>
        {/* ── HEADER BAND ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #000" }}>
          <div style={{ padding: "4px 6px", borderRight: "1px solid #000" }}>
            <div style={{ fontSize: "7px", marginBottom: "2px" }}>HEALTH INSURANCE CLAIM FORM</div>
            <div style={{ fontSize: "7px" }}>APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE (NUCC) 02/12</div>
          </div>
          <div style={{ padding: "4px 6px", textAlign: "center" }}>
            <div style={{ fontWeight: "bold", fontSize: "11px", letterSpacing: "2px" }}>HEALTH INSURANCE CLAIM FORM</div>
            <div style={{ fontSize: "7px" }}>CMS-1500 (02-12)</div>
          </div>
        </div>

        {/* ── ROW 1: Insurance type checkboxes ── */}
        <div style={{ display: "flex", borderBottom: "1px solid #000", padding: "3px 6px", alignItems: "flex-start" }}>
          <div style={{ marginRight: "6px" }}>
            <div style={{ fontSize: "7px", fontWeight: "bold" }}>1. MEDICARE MEDICAID TRICARE CHAMPVA GROUP HEALTH PLAN FECA OTHER</div>
            <div style={{ marginTop: "2px", display: "flex", gap: "10px" }}>
              <span>[{chk(isMedicare)}] Medicare</span>
              <span>[{chk(isBCBS)}] BCBS</span>
              <span>[{chk(isAutoPI)}] Auto/PI</span>
              <span>[{chk(isCash)}] Cash</span>
              <span>[{chk(isOther)}] Other</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: "7px", fontWeight: "bold" }}>1a. INSURED'S I.D. NUMBER</div>
            <div>{claim.insurance_id || ""}</div>
          </div>
        </div>

        {/* ── ROW 2: Patient name | DOB/Sex | Insured name ── */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr 3fr", borderBottom: "1px solid #000" }}>
          <Cell label="2. PATIENT'S NAME (Last Name, First Name, Middle Initial)" value={claim.patient_name} borderRight />
          <Cell label="3. PATIENT'S BIRTH DATE / SEX" borderRight>
            <div>{patient?.dob || ""} &nbsp; Sex: {patient?.sex || ""}</div>
          </Cell>
          <Cell label="4. INSURED'S NAME (Last Name, First Name, Middle Initial)" value={claim.insured_name || claim.patient_name} />
        </div>

        {/* ── ROW 3: Patient address | Relationship | Insured address ── */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 3fr", borderBottom: "1px solid #000" }}>
          <Cell label="5. PATIENT'S ADDRESS (No., Street)" borderRight>
            <div>{patient?.address_line1 || ""}</div>
            <div>{patient?.city || ""} {patient?.state || ""} {patient?.zip || ""}</div>
            <div>Tel: {patient?.phone || ""}</div>
          </Cell>
          <Cell label="6. PATIENT RELATIONSHIP TO INSURED" borderRight>
            <div>[{chk(patient?.relationship_to_insured === "Self")}] Self</div>
            <div>[{chk(patient?.relationship_to_insured === "Spouse")}] Spouse</div>
            <div>[{chk(patient?.relationship_to_insured === "Child")}] Child</div>
            <div>[{chk(patient?.relationship_to_insured === "Other")}] Other</div>
          </Cell>
          <Cell label="7. INSURED'S ADDRESS (No., Street)">
            <div>{patient?.address_line1 || ""}</div>
            <div>{patient?.city || ""} {patient?.state || ""} {patient?.zip || ""}</div>
            <div>Tel: {patient?.phone || ""}</div>
          </Cell>
        </div>

        {/* ── ROW 4: Reserved | Other insured | Condition related | Insured policy ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr 2fr", borderBottom: "1px solid #000" }}>
          <Cell label="8. RESERVED FOR NUCC USE" borderRight>
            <div style={{ height: "36px" }}></div>
          </Cell>
          <Cell label="9. OTHER INSURED'S NAME" borderRight>
            <div style={{ height: "36px" }}></div>
          </Cell>
          <Cell label="10. IS PATIENT'S CONDITION RELATED TO:" borderRight>
            <div>[{chk(claim.accident_type === "Work")}] Employment</div>
            <div>[{chk(claim.accident_type === "Auto")}] Auto Accident &nbsp; State: {claim.accident_related ? (patient?.accident_state || "") : ""}</div>
            <div>[{chk(claim.accident_related && claim.accident_type === "Other")}] Other Accident</div>
          </Cell>
          <Cell label="11. INSURED'S POLICY GROUP OR FECA NUMBER">
            <div>{claim.insurance_group || ""}</div>
            <div style={{ marginTop: "4px", fontSize: "7px", fontWeight: "bold" }}>11a. INSURED'S DATE OF BIRTH / SEX</div>
            <div>{claim.insured_dob || ""}</div>
          </Cell>
        </div>

        {/* ── ROW 5: Signature | Insured signature | Accident date | Auth ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid #000" }}>
          <Cell label="12. PATIENT'S OR AUTHORIZED PERSON'S SIGNATURE" borderRight>
            <div>Signature on File</div>
            <div>Date: {claim.date_of_service || ""}</div>
          </Cell>
          <Cell label="13. INSURED'S OR AUTHORIZED PERSON'S SIGNATURE" borderRight>
            <div>Signature on File</div>
          </Cell>
          <Cell label="14. DATE OF CURRENT ILLNESS, INJURY, OR PREGNANCY" borderRight>
            <div>{claim.accident_related ? (claim.accident_date || claim.date_of_service || "") : claim.date_of_service || ""}</div>
          </Cell>
          <Cell label="15. OTHER DATE">
            <div></div>
          </Cell>
        </div>

        {/* ── ROW 6: Referring provider | Outside lab | Resubmission | Auth # ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr", borderBottom: "1px solid #000" }}>
          <Cell label="17. NAME OF REFERRING PROVIDER OR OTHER SOURCE" borderRight>
            <div>{claim.referring_provider || ""}</div>
            <div style={{ fontSize: "7px", fontWeight: "bold", marginTop: "2px" }}>17b. NPI: {claim.referring_npi || ""}</div>
          </Cell>
          <Cell label="20. OUTSIDE LAB" borderRight>
            <div>[ ] YES &nbsp; [X] NO</div>
          </Cell>
          <Cell label="22. RESUBMISSION CODE" borderRight>
            <div></div>
          </Cell>
          <Cell label="23. PRIOR AUTHORIZATION NUMBER">
            <div>{claim.authorization_number || ""}</div>
          </Cell>
        </div>

        {/* ── BOX 21: Diagnoses ── */}
        <div style={{ borderBottom: "1px solid #000", padding: "3px 6px" }}>
          <div style={{ fontSize: "7px", fontWeight: "bold", marginBottom: "3px" }}>
            21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY (Relate A-L to service line below — 24E) &nbsp; ICD Ind. [0]
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px" }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                <span style={{ fontWeight: "bold" }}>{dxLetter(i)}.</span>
                <span>{dx[i] ? `${dx[i].code}` : "_______________"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── BOX 24: Service Lines ── */}
        <div style={{ borderBottom: "1px solid #000" }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4in 0.35in 0.5in 0.8in 0.35in 0.6in 0.9in 0.7in 0.7in 1.1in", borderBottom: "1px solid #000", background: "#f0f0f0", padding: "2px 4px", gap: "0" }}>
            <div style={{ fontWeight: "bold", fontSize: "7px" }}>A. DATE(S) OF SERVICE<br/>From &nbsp;&nbsp;&nbsp;&nbsp; To</div>
            <div style={{ fontWeight: "bold", fontSize: "7px", borderLeft: "1px solid #000", paddingLeft: "2px" }}>B.<br/>POS</div>
            <div style={{ fontWeight: "bold", fontSize: "7px", borderLeft: "1px solid #000", paddingLeft: "2px" }}>C.<br/>EMG</div>
            <div style={{ fontWeight: "bold", fontSize: "7px", borderLeft: "1px solid #000", paddingLeft: "2px" }}>D. PROCEDURES, SERVICES<br/>CPT/HCPCS</div>
            <div style={{ fontWeight: "bold", fontSize: "7px", borderLeft: "1px solid #000", paddingLeft: "2px" }}>E.<br/>MOD</div>
            <div style={{ fontWeight: "bold", fontSize: "7px", borderLeft: "1px solid #000", paddingLeft: "2px" }}>E.<br/>DX PTR</div>
            <div style={{ fontWeight: "bold", fontSize: "7px", borderLeft: "1px solid #000", paddingLeft: "2px" }}>F.<br/>$ CHARGES</div>
            <div style={{ fontWeight: "bold", fontSize: "7px", borderLeft: "1px solid #000", paddingLeft: "2px" }}>G.<br/>UNITS</div>
            <div style={{ fontWeight: "bold", fontSize: "7px", borderLeft: "1px solid #000", paddingLeft: "2px" }}>H.<br/>EPSDT</div>
            <div style={{ fontWeight: "bold", fontSize: "7px", borderLeft: "1px solid #000", paddingLeft: "2px" }}>J.<br/>RENDERING NPI</div>
          </div>
          {/* Service line rows */}
          {paddedLines.map((line, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "1.4in 0.35in 0.5in 0.8in 0.35in 0.6in 0.9in 0.7in 0.7in 1.1in",
              borderBottom: i < paddedLines.length - 1 ? "1px solid #ccc" : "none",
              minHeight: "18px",
              padding: "2px 4px",
              alignItems: "center"
            }}>
              <div>{line ? `${line.date_of_service || claim.date_of_service}` : ""}</div>
              <div style={{ borderLeft: "1px solid #ccc", paddingLeft: "2px" }}>{line ? (claim.place_of_service || "11") : ""}</div>
              <div style={{ borderLeft: "1px solid #ccc", paddingLeft: "2px" }}></div>
              <div style={{ borderLeft: "1px solid #ccc", paddingLeft: "2px", fontWeight: line ? "bold" : "normal" }}>{line?.code || ""}</div>
              <div style={{ borderLeft: "1px solid #ccc", paddingLeft: "2px" }}>{line?.modifier || ""}</div>
              <div style={{ borderLeft: "1px solid #ccc", paddingLeft: "2px" }}>{line?.diagnosis_pointers || ""}</div>
              <div style={{ borderLeft: "1px solid #ccc", paddingLeft: "2px", textAlign: "right" }}>{line ? `$${(line.charge || 0).toFixed(2)}` : ""}</div>
              <div style={{ borderLeft: "1px solid #ccc", paddingLeft: "2px", textAlign: "center" }}>{line?.units || ""}</div>
              <div style={{ borderLeft: "1px solid #ccc", paddingLeft: "2px" }}></div>
              <div style={{ borderLeft: "1px solid #ccc", paddingLeft: "2px" }}>{line ? (ep.rendering_npi || "") : ""}</div>
            </div>
          ))}
        </div>

        {/* ── BOTTOM ROW: 25 EIN | 26 Acct | 27 Assign | 28 Total | 29 Paid | 30 Reserved ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 1.5fr 1.5fr", borderBottom: "1px solid #000" }}>
          <Cell label="25. FEDERAL TAX I.D. NUMBER &nbsp; SSN [  ] EIN [X]" borderRight>
            <div>{ep.ein_tax_id || ""}</div>
          </Cell>
          <Cell label="26. PATIENT'S ACCOUNT NO." borderRight>
            <div>{claim.patient_id?.slice(-8) || ""}</div>
          </Cell>
          <Cell label="27. ACCEPT ASSIGNMENT?" borderRight>
            <div>[X] YES</div>
          </Cell>
          <Cell label="28. TOTAL CHARGE" borderRight>
            <div style={{ fontWeight: "bold" }}>${(claim.total_charge || 0).toFixed(2)}</div>
          </Cell>
          <Cell label="29. AMOUNT PAID" borderRight>
            <div>${(claim.amount_paid || 0).toFixed(2)}</div>
          </Cell>
          <Cell label="30. RESERVED FOR NUCC USE">
            <div></div>
          </Cell>
        </div>

        {/* ── BOTTOM ROW: 31 Signature | 32 Facility | 33 Billing ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr 3fr" }}>
          <Cell label="31. SIGNATURE OF PHYSICIAN OR SUPPLIER (MD, DO, OTHER)" borderRight>
            <div style={{ marginTop: "4px" }}>{ep.rendering_provider || ""}</div>
            <div>Date: {claim.date_of_service || ""}</div>
            <div style={{ fontSize: "7px", marginTop: "2px" }}>NPI: {ep.rendering_npi || ""}</div>
            <div style={{ fontSize: "7px" }}>Taxonomy: {ep.taxonomy_code || ""}</div>
          </Cell>
          <Cell label="32. SERVICE FACILITY LOCATION INFORMATION" borderRight>
            <div>{office?.practice_name || ""}</div>
            <div>{office?.billing_address_line1 || ""}</div>
            <div>{office?.billing_city || ""} {office?.billing_state || ""} {office?.billing_zip || ""}</div>
            <div style={{ fontSize: "7px", marginTop: "2px" }}>NPI: {ep.billing_npi || ""}</div>
          </Cell>
          <Cell label="33. BILLING PROVIDER INFO & PH #">
            <div style={{ fontWeight: "bold" }}>{selectedProvider ? selectedProvider.provider_name : (office?.practice_name || "")}</div>
            <div>{office?.billing_address_line1 || ""}</div>
            <div>{office?.billing_city || ""} {office?.billing_state || ""} {office?.billing_zip || ""}</div>
            <div>Tel: {office?.phone || ""}</div>
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontSize: "7px", fontWeight: "bold" }}>33a. NPI: </span>{ep.billing_npi || ""}
              &nbsp;&nbsp;
              <span style={{ fontSize: "7px", fontWeight: "bold" }}>33b. </span>{ep.taxonomy_code || ""}
            </div>
          </Cell>
        </div>

        {/* Footer note */}
        <div style={{ borderTop: "1px solid #000", padding: "2px 6px", fontSize: "7px", textAlign: "center", background: "#f9f9f9" }}>
          NUCC Instruction Manual available at: www.nucc.org &nbsp;|&nbsp; PLEASE PRINT OR TYPE &nbsp;|&nbsp; APPROVED OMB-0938-1197 FORM 1500 (02-12)
        </div>
      </div>

      {/* Notes below form - no print */}
      {claim.claim_notes && (
        <div className="no-print mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl max-w-[8.5in] mx-auto">
          <p className="text-xs font-bold text-yellow-800 mb-1">CLAIM NOTES (not printed on form)</p>
          <p className="text-sm text-yellow-900">{claim.claim_notes}</p>
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, children, borderRight }) {
  return (
    <div style={{
      padding: "3px 5px",
      borderRight: borderRight ? "1px solid #000" : "none",
      minHeight: "36px"
    }}>
      <div style={{ fontSize: "7px", fontWeight: "bold", marginBottom: "2px", color: "#333" }}>{label}</div>
      {value !== undefined ? <div>{value}</div> : children}
    </div>
  );
}
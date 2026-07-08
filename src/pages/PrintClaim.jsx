import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Send, CheckCircle, History, RefreshCw, FileText } from "lucide-react";
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
  const [bwMode, setBwMode] = useState(false); // false = red form, true = black & white
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
  const payerType = claim.payer_type || "";

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

  const isMedicare = payerType === "Medicare";
  const isMedicaid = payerType === "Medicaid";
  const isBCBS = payerType === "BCBS";
  const isAutoPI = payerType === "Auto/PI";
  const isCash = payerType === "Cash";
  const isOther = !isMedicare && !isMedicaid && !isBCBS && !isAutoPI && !isCash;

  const relationship = effectiveClaim.relationship_to_insured;

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

  // Pad to exactly 6 service lines
  const paddedLines = [...lines];
  while (paddedLines.length < 6) paddedLines.push(null);

  // Format date MM DD YY
  const fmtDate = (d) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length === 3) return `${parts[1]} ${parts[2]} ${parts[0].slice(2)}`;
    return d;
  };

  // Colors
  const labelColor = bwMode ? "#000" : "#c0392b";
  const borderColor = bwMode ? "#000" : "#c0392b";
  const headerBg = bwMode ? "#e8e8e8" : "#fce8e8";
  const titleColor = bwMode ? "#000" : "#c0392b";

  const B = (s) => ({ style: { borderRight: `0.5px solid ${borderColor}` }, ...s });

  // Helper: box label style
  const lbl = { fontSize: "6px", fontWeight: "bold", color: labelColor, marginBottom: "1px", lineHeight: "1.2" };
  const val = { fontSize: "8px", color: "#000", lineHeight: "1.3" };
  const cellPad = { padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, verticalAlign: "top" };
  const cellPadLast = { padding: "2px 3px", verticalAlign: "top" };
  const bdr = { borderBottom: `0.5px solid ${borderColor}` };

  const Box = ({ label, children, style, last }) => (
    <td style={{ ...(last ? cellPadLast : cellPad), ...style }}>
      <div style={lbl}>{label}</div>
      <div style={val}>{children}</div>
    </td>
  );

  const chkBox = (checked) => (
    <span style={{ display: "inline-block", width: "8px", height: "8px", border: `0.5px solid ${borderColor}`, textAlign: "center", fontSize: "7px", lineHeight: "8px", marginRight: "2px" }}>
      {checked ? "X" : ""}
    </span>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="no-print mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/saved-claims">
            <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          </Link>
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
              onClick={() => window.open(`/print-receipt?id=${claimId}`, "_blank")}
              className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <FileText className="w-4 h-4" /> Print Superbill
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                // Print HCFA first, then open superbill in new tab
                await handlePrint();
                setTimeout(() => window.open(`/print-receipt?id=${claimId}`, "_blank"), 500);
              }}
              className="gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50"
            >
              <Printer className="w-4 h-4" /> Print Both
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
      </div>

      {/* CMS-1500 FORM */}
      <div className="print-area" style={{
        width: "8.5in",
        margin: "0 auto",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "8px",
        color: "#000",
        backgroundColor: "#fff",
        border: `1px solid ${borderColor}`,
        lineHeight: "1.2",
      }}>

        {/* TITLE HEADER */}
        <div style={{ borderBottom: `1px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 6px", backgroundColor: headerBg }}>
          <div>
            <div style={{ fontSize: "6px", color: labelColor }}>HEALTH INSURANCE CLAIM FORM</div>
            <div style={{ fontSize: "6px", color: labelColor }}>APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE (NUCC) 02/12</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: titleColor, letterSpacing: "1px" }}>HEALTH INSURANCE CLAIM FORM</div>
            <div style={{ fontSize: "6px", color: labelColor }}>CMS-1500 (02-12)</div>
          </div>
          <div style={{ fontSize: "6px", color: labelColor, textAlign: "right" }}>PICA</div>
        </div>

        {/* ROW 1 — Insurance type + 1a Insured ID */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: `0.5px solid ${borderColor}` }}>
          <tbody><tr>
            <td style={{ ...cellPad, width: "65%" }}>
              <div style={lbl}>1. MEDICARE &nbsp; MEDICAID &nbsp; TRICARE &nbsp; CHAMPVA &nbsp; GROUP HEALTH PLAN &nbsp; FECA BLK LUNG &nbsp; OTHER</div>
              <div style={{ display: "flex", gap: "10px", marginTop: "2px", fontSize: "8px" }}>
                <span>{chkBox(isMedicare)} Medicare (Medicare#)</span>
                <span>{chkBox(isMedicaid)} Medicaid (Medicaid#)</span>
                <span>{chkBox(false)} TRICARE (ID#/DoD#)</span>
                <span>{chkBox(false)} CHAMPVA (Member ID#)</span>
                <span>{chkBox(isBCBS)} Group Health Plan (ID#)</span>
                <span>{chkBox(false)} FECA (ID#)</span>
                <span>{chkBox(isOther || isAutoPI)} Other (ID#)</span>
              </div>
            </td>
            <Box label="1a. INSURED'S I.D. NUMBER (For Program in Item 1)" last>
              {effectiveClaim.insurance_id}
            </Box>
          </tr></tbody>
        </table>

        {/* ROW 2 — Patient Name | DOB Sex | Insured Name */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: `0.5px solid ${borderColor}` }}>
          <colgroup><col style={{ width: "38%" }} /><col style={{ width: "20%" }} /><col style={{ width: "42%" }} /></colgroup>
          <tbody><tr>
            <Box label="2. PATIENT'S NAME (Last Name, First Name, Middle Initial)">{claim.patient_name}</Box>
            <Box label="3. PATIENT'S BIRTH DATE &nbsp;&nbsp; SEX">
              <span>{fmtDate(patient?.dob)}</span>&nbsp;&nbsp;
              {chkBox(patient?.sex === "Male")} M &nbsp; {chkBox(patient?.sex === "Female")} F
            </Box>
            <Box label="4. INSURED'S NAME (Last Name, First Name, Middle Initial)" last>{effectiveClaim.insured_name}</Box>
          </tr></tbody>
        </table>

        {/* ROW 3 — Patient Address | Relationship | Insured Address */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: `0.5px solid ${borderColor}` }}>
          <colgroup><col style={{ width: "38%" }} /><col style={{ width: "20%" }} /><col style={{ width: "42%" }} /></colgroup>
          <tbody><tr style={{ verticalAlign: "top" }}>
            <Box label="5. PATIENT'S ADDRESS (No., Street)">
              <div>{patient?.address_line1 || ""}</div>
              <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                <div>
                  <div style={lbl}>CITY</div>
                  <div>{patient?.city || ""}</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <div style={lbl}>STATE</div>
                  <div>{patient?.state || ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                <div>
                  <div style={lbl}>ZIP CODE</div>
                  <div>{patient?.zip || ""}</div>
                </div>
                <div style={{ marginLeft: "4px" }}>
                  <div style={lbl}>TELEPHONE (Include Area Code)</div>
                  <div>({patient?.phone?.slice(0,3) || "   "}) {patient?.phone?.slice(3) || ""}</div>
                </div>
              </div>
            </Box>
            <Box label="6. PATIENT RELATIONSHIP TO INSURED">
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                <span>{chkBox(relationship === "Self")} Self</span>
                <span>{chkBox(relationship === "Spouse")} Spouse</span>
                <span>{chkBox(relationship === "Child")} Child</span>
                <span>{chkBox(relationship === "Other")} Other</span>
              </div>
              <div style={{ marginTop: "4px", fontSize: "6px", color: labelColor }}>8. RESERVED FOR NUCC USE</div>
            </Box>
            <Box label="7. INSURED'S ADDRESS (No., Street)" last>
              <div>{patient?.address_line1 || ""}</div>
              <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                <div><div style={lbl}>CITY</div><div>{patient?.city || ""}</div></div>
                <div style={{ marginLeft: "auto" }}><div style={lbl}>STATE</div><div>{patient?.state || ""}</div></div>
              </div>
              <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                <div><div style={lbl}>ZIP CODE</div><div>{patient?.zip || ""}</div></div>
                <div style={{ marginLeft: "4px" }}><div style={lbl}>TELEPHONE (Include Area Code)</div><div>({patient?.phone?.slice(0,3) || "   "}) {patient?.phone?.slice(3) || ""}</div></div>
              </div>
            </Box>
          </tr></tbody>
        </table>

        {/* ROW 4 — Other Insured | Condition Related | Insured Policy/Group */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: `0.5px solid ${borderColor}` }}>
          <colgroup><col style={{ width: "28%" }} /><col style={{ width: "30%" }} /><col style={{ width: "42%" }} /></colgroup>
          <tbody><tr style={{ verticalAlign: "top" }}>
            <Box label="9. OTHER INSURED'S NAME (Last Name, First Name, Middle Initial)">
              <div style={{ height: "8px" }}></div>
              <div style={lbl}>a. OTHER INSURED'S POLICY OR GROUP NUMBER</div>
              <div style={{ height: "8px" }}></div>
              <div style={lbl}>b. RESERVED FOR NUCC USE</div>
              <div style={{ height: "8px" }}></div>
              <div style={lbl}>c. RESERVED FOR NUCC USE</div>
              <div style={{ height: "8px" }}></div>
              <div style={lbl}>d. INSURANCE PLAN NAME OR PROGRAM NAME</div>
            </Box>
            <Box label="10. IS PATIENT'S CONDITION RELATED TO:">
              <div style={lbl}>a. EMPLOYMENT? (Current or Previous)</div>
              <div>{chkBox(effectiveClaim.accident_employment)} YES &nbsp; {chkBox(!effectiveClaim.accident_employment)} NO</div>
              <div style={{ ...lbl, marginTop: "4px" }}>b. AUTO ACCIDENT? &nbsp;&nbsp; PLACE (State)</div>
              <div>{chkBox(effectiveClaim.accident_auto)} YES &nbsp; {chkBox(!effectiveClaim.accident_auto)} NO &nbsp; {effectiveClaim.accident_auto_state || ""}</div>
              <div style={{ ...lbl, marginTop: "4px" }}>c. OTHER ACCIDENT?</div>
              <div>{chkBox(effectiveClaim.accident_other)} YES &nbsp; {chkBox(!effectiveClaim.accident_other)} NO</div>
              <div style={{ ...lbl, marginTop: "4px" }}>10d. CLAIM CODES (Designated by NUCC)</div>
            </Box>
            <Box label="11. INSURED'S POLICY GROUP OR FECA NUMBER" last>
              <div>{effectiveClaim.insurance_group}</div>
              <div style={{ ...lbl, marginTop: "4px" }}>a. INSURED'S DATE OF BIRTH &nbsp;&nbsp;&nbsp; SEX</div>
              <div>{fmtDate(effectiveClaim.insured_dob)} &nbsp; {chkBox(effectiveClaim.insured_sex === "Male")} M &nbsp; {chkBox(effectiveClaim.insured_sex === "Female")} F</div>
              <div style={{ ...lbl, marginTop: "4px" }}>b. OTHER CLAIM ID (Designated by NUCC)</div>
              <div style={{ height: "8px" }}></div>
              <div style={{ ...lbl, marginTop: "4px" }}>c. INSURANCE PLAN NAME OR PROGRAM NAME</div>
              <div>{effectiveClaim.insurance_plan}</div>
              <div style={{ ...lbl, marginTop: "4px" }}>d. IS THERE ANOTHER HEALTH BENEFIT PLAN?</div>
              <div>{chkBox(false)} YES &nbsp; {chkBox(true)} NO</div>
            </Box>
          </tr></tbody>
        </table>

        {/* ROW 5 — Signatures + Dates */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: `0.5px solid ${borderColor}` }}>
          <colgroup><col style={{ width: "38%" }} /><col style={{ width: "20%" }} /><col style={{ width: "21%" }} /><col style={{ width: "21%" }} /></colgroup>
          <tbody><tr style={{ verticalAlign: "top" }}>
            <Box label="12. PATIENT'S OR AUTHORIZED PERSON'S SIGNATURE">
              <div style={{ fontSize: "6.5px", lineHeight: "1.3" }}>I authorize the release of any medical information necessary to process this claim.</div>
              <div style={{ marginTop: "4px" }}>SIGNED <span style={{ borderBottom: `0.5px solid #000`, display: "inline-block", width: "80px" }}>Signature on File</span>&nbsp; DATE {fmtDate(effectiveClaim.date_of_service)}</div>
            </Box>
            <Box label="13. INSURED'S OR AUTHORIZED PERSON'S SIGNATURE">
              <div style={{ marginTop: "4px" }}>SIGNED <span style={{ borderBottom: `0.5px solid #000`, display: "inline-block", width: "60px" }}>Signature on File</span></div>
            </Box>
            <Box label="14. DATE OF CURRENT ILLNESS, INJURY, or PREGNANCY (LMP)">
              <div>MM DD YY</div>
              <div>{fmtDate(effectiveClaim.onset_date || effectiveClaim.accident_date || effectiveClaim.date_of_first_visit)}</div>
              <div style={lbl}>QUAL.</div>
            </Box>
            <Box label="15. OTHER DATE" last>
              <div>MM DD YY</div>
              <div>{fmtDate(effectiveClaim.date_of_first_visit)}</div>
              <div style={lbl}>QUAL.</div>
            </Box>
          </tr></tbody>
        </table>

        {/* ROW 6 — Unable to Work / Hospitalization */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: `0.5px solid ${borderColor}` }}>
          <colgroup><col style={{ width: "50%" }} /><col style={{ width: "50%" }} /></colgroup>
          <tbody><tr style={{ verticalAlign: "top" }}>
            <Box label="16. DATES PATIENT UNABLE TO WORK IN CURRENT OCCUPATION">
              <div>FROM MM DD YY &nbsp;&nbsp;&nbsp; TO MM DD YY</div>
            </Box>
            <Box label="18. HOSPITALIZATION DATES RELATED TO CURRENT SERVICES" last>
              <div>FROM MM DD YY &nbsp;&nbsp;&nbsp; TO MM DD YY</div>
            </Box>
          </tr></tbody>
        </table>

        {/* ROW 7 — Referring Provider | Outside Lab | Resubmission | Auth */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: `0.5px solid ${borderColor}` }}>
          <colgroup><col style={{ width: "35%" }} /><col style={{ width: "20%" }} /><col style={{ width: "20%" }} /><col style={{ width: "25%" }} /></colgroup>
          <tbody><tr style={{ verticalAlign: "top" }}>
            <Box label="17. NAME OF REFERRING PROVIDER OR OTHER SOURCE">
              <div>{effectiveClaim.referring_provider}</div>
              <div style={{ marginTop: "3px", display: "flex", gap: "8px" }}>
                <span style={lbl}>17a. &nbsp;</span>
                <span style={lbl}>17b. NPI: {effectiveClaim.referring_npi}</span>
              </div>
            </Box>
            <Box label="19. ADDITIONAL CLAIM INFORMATION (Designated by NUCC)">
              <div></div>
            </Box>
            <Box label="20. OUTSIDE LAB? &nbsp; $ CHARGES">
              <div>{chkBox(false)} YES &nbsp; {chkBox(true)} NO</div>
            </Box>
            <Box label="21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY" last style={{ fontSize: "6px" }}>
              <span style={{ fontSize: "6px", color: labelColor }}>ICD Ind. </span>
              <span style={{ border: `0.5px solid ${borderColor}`, padding: "0 3px", fontSize: "7px" }}>0</span>
            </Box>
          </tr></tbody>
        </table>

        {/* BOX 21 — Diagnosis codes A-L */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: `0.5px solid ${borderColor}` }}>
          <tbody><tr>
            <td style={{ padding: "3px 5px" }}>
              <div style={{ ...lbl, marginBottom: "3px" }}>21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY. Relate A–L to service line below (24E) &nbsp; ICD Ind. <span style={{ border: `0.5px solid ${borderColor}`, padding: "0 3px" }}>0</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px 8px" }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "2px", borderBottom: `0.5px solid ${i < 8 ? borderColor : "transparent"}`, paddingBottom: "1px" }}>
                    <span style={{ fontWeight: "bold", color: labelColor, fontSize: "7px", minWidth: "10px" }}>{dxLetter(i)}.</span>
                    <span style={{ fontSize: "8px", letterSpacing: "0.5px" }}>{dx[i]?.code || ""}</span>
                    {dx[i]?.code && <span style={{ fontSize: "7px", color: "#444", marginLeft: "3px" }}>{dx[i]?.description || ""}</span>}
                  </div>
                ))}
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* BOX 22+23 */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: `0.5px solid ${borderColor}` }}>
          <colgroup><col style={{ width: "30%" }} /><col style={{ width: "70%" }} /></colgroup>
          <tbody><tr style={{ verticalAlign: "top" }}>
            <Box label="22. RESUBMISSION CODE &nbsp;&nbsp; ORIGINAL REF. NO.">
              <div style={{ height: "10px" }}></div>
            </Box>
            <Box label="23. PRIOR AUTHORIZATION NUMBER" last>
              <div>{effectiveClaim.authorization_number}</div>
            </Box>
          </tr></tbody>
        </table>

        {/* BOX 24 — Service Lines */}
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", borderBottom: `0.5px solid ${borderColor}` }}>
          {/* Header */}
          <thead>
            <tr style={{ backgroundColor: headerBg }}>
              <th colSpan="2" style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, borderBottom: `0.5px solid ${borderColor}`, textAlign: "left", width: "14%" }}>
                <div style={lbl}>24. A.</div>
                <div style={lbl}>DATE(S) OF SERVICE</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "6px", color: labelColor }}>
                  <span>From</span><span>To</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "6px", color: labelColor }}>
                  <span>MM DD YY</span><span>MM DD YY</span>
                </div>
              </th>
              <th style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, borderBottom: `0.5px solid ${borderColor}`, textAlign: "center", width: "4%" }}>
                <div style={lbl}>B.</div><div style={lbl}>PLACE OF</div><div style={lbl}>SERVICE</div>
              </th>
              <th style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, borderBottom: `0.5px solid ${borderColor}`, textAlign: "center", width: "4%" }}>
                <div style={lbl}>C.</div><div style={lbl}>EMG</div>
              </th>
              <th colSpan="2" style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, borderBottom: `0.5px solid ${borderColor}`, textAlign: "left", width: "18%" }}>
                <div style={lbl}>D. PROCEDURES, SERVICES, OR SUPPLIES</div>
                <div style={lbl}>(Explain Unusual Circumstances)</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <span style={lbl}>CPT/HCPCS</span>
                  <span style={lbl}>MODIFIER</span>
                </div>
              </th>
              <th style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, borderBottom: `0.5px solid ${borderColor}`, textAlign: "center", width: "7%" }}>
                <div style={lbl}>E.</div><div style={lbl}>DIAGNOSIS</div><div style={lbl}>POINTER</div>
              </th>
              <th style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, borderBottom: `0.5px solid ${borderColor}`, textAlign: "center", width: "10%" }}>
                <div style={lbl}>F.</div><div style={lbl}>$ CHARGES</div>
              </th>
              <th style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, borderBottom: `0.5px solid ${borderColor}`, textAlign: "center", width: "6%" }}>
                <div style={lbl}>G.</div><div style={lbl}>DAYS</div><div style={lbl}>OR</div><div style={lbl}>UNITS</div>
              </th>
              <th style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, borderBottom: `0.5px solid ${borderColor}`, textAlign: "center", width: "5%" }}>
                <div style={lbl}>H.</div><div style={lbl}>EPSDT</div><div style={lbl}>Family</div><div style={lbl}>Plan</div>
              </th>
              <th style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, borderBottom: `0.5px solid ${borderColor}`, textAlign: "center", width: "5%" }}>
                <div style={lbl}>I.</div><div style={lbl}>ID.</div><div style={lbl}>QUAL</div>
              </th>
              <th style={{ padding: "2px 3px", borderBottom: `0.5px solid ${borderColor}`, textAlign: "center", width: "27%" }}>
                <div style={lbl}>J. RENDERING</div><div style={lbl}>PROVIDER ID. #</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paddedLines.map((line, i) => {
              const dos = line?.date_of_service || effectiveClaim.date_of_service || "";
              const formattedDos = fmtDate(dos);
              return (
                <tr key={i} style={{ borderBottom: i < paddedLines.length - 1 ? `0.5px solid ${borderColor}` : "none", minHeight: "20px" }}>
                  {/* Date From / To */}
                  <td colSpan="2" style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, fontSize: "8px", width: "14%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{line ? formattedDos : ""}</span>
                      <span>{line ? formattedDos : ""}</span>
                    </div>
                  </td>
                  {/* POS */}
                  <td style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, fontSize: "8px", textAlign: "center", width: "4%" }}>
                    {line ? (effectiveClaim.place_of_service || "11") : ""}
                  </td>
                  {/* EMG */}
                  <td style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, fontSize: "8px", textAlign: "center", width: "4%" }}></td>
                  {/* CPT + Modifier */}
                  <td style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, fontSize: "8px", fontWeight: "bold", width: "10%" }}>
                    {line?.code || ""}
                  </td>
                  <td style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, fontSize: "8px", width: "8%" }}>
                    {line?.modifier || ""}
                  </td>
                  {/* Dx Pointer */}
                  <td style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, fontSize: "8px", textAlign: "center", width: "7%" }}>
                    {line?.diagnosis_pointers || ""}
                  </td>
                  {/* Charges */}
                  <td style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, fontSize: "8px", textAlign: "right", width: "10%" }}>
                    {line ? `${((line.charge || 0)).toFixed(2)}` : ""}
                  </td>
                  {/* Units */}
                  <td style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, fontSize: "8px", textAlign: "center", width: "6%" }}>
                    {line?.units || ""}
                  </td>
                  {/* EPSDT */}
                  <td style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, fontSize: "8px", width: "5%" }}></td>
                  {/* ID Qual */}
                  <td style={{ padding: "2px 3px", borderRight: `0.5px solid ${borderColor}`, fontSize: "7px", width: "5%" }}>{line ? "NPI" : ""}</td>
                  {/* Rendering NPI */}
                  <td style={{ padding: "2px 3px", fontSize: "8px", width: "27%" }}>
                    <div>{line ? (ep.rendering_npi || "") : ""}</div>
                    {line && <div style={{ fontSize: "6px", color: "#555", marginTop: "1px" }}>{line.description || ""}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* BOX 25-30 */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: `0.5px solid ${borderColor}` }}>
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <tbody><tr style={{ verticalAlign: "top" }}>
            <Box label="25. FEDERAL TAX I.D. NUMBER &nbsp; SSN [ ] EIN [X]">
              <div>{ep.ein_tax_id}</div>
            </Box>
            <Box label="26. PATIENT'S ACCOUNT NO.">
              <div>{claim.patient_id?.slice(-8)}</div>
            </Box>
            <Box label="27. ACCEPT ASSIGNMENT?">
              <div>{chkBox(true)} YES &nbsp; {chkBox(false)} NO</div>
            </Box>
            <Box label="28. TOTAL CHARGE">
              <div style={{ fontWeight: "bold" }}>$ {(effectiveClaim.total_charge || 0).toFixed(2)}</div>
            </Box>
            <Box label="29. AMOUNT PAID">
              <div>$ {(effectiveClaim.amount_paid || 0).toFixed(2)}</div>
            </Box>
            <Box label="30. Rsvd for NUCC Use" last>
              <div></div>
            </Box>
          </tr></tbody>
        </table>

        {/* BOX 31-33 */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <colgroup>
            <col style={{ width: "28%" }} />
            <col style={{ width: "36%" }} />
            <col style={{ width: "36%" }} />
          </colgroup>
          <tbody><tr style={{ verticalAlign: "top" }}>
            <Box label="31. SIGNATURE OF PHYSICIAN OR SUPPLIER INCLUDING DEGREES OR CREDENTIALS">
              <div style={{ marginTop: "6px" }}>{ep.rendering_provider}</div>
              <div>DATE: {fmtDate(effectiveClaim.date_of_service)}</div>
              <div style={{ marginTop: "4px", display: "flex", gap: "8px" }}>
                <span><span style={{ ...lbl, display: "inline" }}>a.</span> NPI {ep.rendering_npi}</span>
                <span><span style={{ ...lbl, display: "inline" }}>b.</span> {ep.taxonomy_code}</span>
              </div>
            </Box>
            <Box label="32. SERVICE FACILITY LOCATION INFORMATION">
              <div>{office?.practice_name}</div>
              <div>{office?.billing_address_line1}</div>
              <div>{office?.billing_city} {office?.billing_state} {office?.billing_zip}</div>
              <div style={{ marginTop: "4px", display: "flex", gap: "8px" }}>
                <span><span style={{ ...lbl, display: "inline" }}>a.</span> NPI {ep.billing_npi}</span>
                <span><span style={{ ...lbl, display: "inline" }}>b.</span></span>
              </div>
            </Box>
            <Box label="33. BILLING PROVIDER INFO & PH #" last>
              <div>{office?.phone ? `( ${office.phone.slice(0,3)} ) ${office.phone.slice(3)}` : ""}</div>
              <div style={{ fontWeight: "bold" }}>{selectedProvider ? selectedProvider.provider_name : office?.practice_name}</div>
              <div>{office?.billing_address_line1}</div>
              <div>{office?.billing_city} {office?.billing_state} {office?.billing_zip}</div>
              <div style={{ marginTop: "4px", display: "flex", gap: "8px" }}>
                <span><span style={{ ...lbl, display: "inline" }}>a.</span> NPI {ep.billing_npi}</span>
                <span><span style={{ ...lbl, display: "inline" }}>b.</span> {ep.taxonomy_code}</span>
              </div>
            </Box>
          </tr></tbody>
        </table>

        {/* Footer */}
        <div style={{ borderTop: `0.5px solid ${borderColor}`, padding: "2px 6px", fontSize: "6px", textAlign: "center", color: labelColor, backgroundColor: headerBg }}>
          NUCC Instruction Manual available at: www.nucc.org &nbsp;|&nbsp; <strong>PLEASE PRINT OR TYPE</strong> &nbsp;|&nbsp; APPROVED OMB-0938-1197 FORM 1500 (02-12)
        </div>
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
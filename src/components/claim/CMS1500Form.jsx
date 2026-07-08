import React from "react";

// Renders one CMS-1500 page with exactly 6 service lines
export default function CMS1500Form({ effectiveClaim, patient, office, ep, dx, serviceLines, bwMode, pageNum, totalPages }) {
  const R = bwMode ? "#000" : "#c0392b";
  const BG = bwMode ? "#e0e0e0" : "#fde8e8";

  const fmtDate = (d) => {
    if (!d) return "";
    const p = String(d).split("-");
    if (p.length === 3) return `${p[1]}  ${p[2]}  ${p[0].slice(2)}`;
    return d;
  };

  const chkBox = (checked) => (
    <span style={{ display: "inline-block", width: "7px", height: "7px", border: `1px solid ${R}`, textAlign: "center", fontSize: "6px", lineHeight: "7px", marginRight: "1px", flexShrink: 0 }}>
      {checked ? "X" : ""}
    </span>
  );

  const relationship = effectiveClaim.relationship_to_insured || "Self";
  const payerType = effectiveClaim.payer_type || "";
  const isMedicare = payerType === "Medicare";
  const isMedicaid = payerType === "Medicaid";
  const isBCBS = payerType === "BCBS";
  const isAutoPI = payerType === "Auto/PI";
  const isCash = payerType === "Cash";
  const isOther = !isMedicare && !isMedicaid && !isBCBS && !isAutoPI && !isCash;

  // Styles
  const border = `0.5px solid ${R}`;
  const font = { fontFamily: "Arial, Helvetica, sans-serif", fontSize: "7px", color: "#000" };
  const lbl = { fontFamily: "Arial, Helvetica, sans-serif", fontSize: "6px", fontWeight: "bold", color: R, display: "block", lineHeight: "1.1", marginBottom: "1px" };
  const cell = (extra = {}) => ({ padding: "2px 3px", borderRight: border, verticalAlign: "top", ...font, ...extra });
  const cellLast = (extra = {}) => ({ padding: "2px 3px", verticalAlign: "top", ...font, ...extra });

  const Row = ({ children, style }) => (
    <tr style={{ borderBottom: border, ...style }}>{children}</tr>
  );

  const pageStyle = {
    width: "8in",
    minHeight: "10.5in",
    margin: "0",
    backgroundColor: "#fff",
    border: `1px solid ${R}`,
    boxSizing: "border-box",
    pageBreakAfter: "always",
    breakAfter: "page",
    pageBreakInside: "avoid",
    breakInside: "avoid",
    display: "flex",
    flexDirection: "column",
  };

  // Pad service lines to exactly 6
  const lines = [...serviceLines];
  while (lines.length < 6) lines.push(null);

  // Per page, totals only on last page
  const isLastPage = pageNum === totalPages;
  const pageCharge = serviceLines.reduce((s, l) => s + (l?.charge || 0) * (l?.units || 1), 0);

  return (
    <div style={pageStyle}>
      {/* ── HEADER ── */}
      <div style={{ borderBottom: border, padding: "2px 6px", backgroundColor: BG, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ ...lbl, fontSize: "7px" }}>HEALTH INSURANCE CLAIM FORM</div>
          <div style={{ ...lbl, fontSize: "5.5px" }}>APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE (NUCC) 02/12</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Arial, sans-serif", fontSize: "11px", fontWeight: "bold", color: R, letterSpacing: "0.5px" }}>HEALTH INSURANCE CLAIM FORM</div>
          <div style={{ ...lbl, textAlign: "center", fontSize: "6px" }}>CMS-1500 (02-12)</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ ...lbl, fontSize: "6px" }}>PICA</div>
          <div style={{ width: "24px", height: "14px", border: border }}></div>
          {totalPages > 1 && <div style={{ ...lbl, fontSize: "5.5px", marginTop: "2px" }}>PAGE {pageNum}/{totalPages}</div>}
        </div>
      </div>

      {/* ── ROW 1: Insurance type + 1a ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: border }}>
        <tbody><tr>
          <td style={{ ...cell(), width: "62%" }}>
            <span style={lbl}>1. MEDICARE &nbsp; MEDICAID &nbsp; TRICARE &nbsp; CHAMPVA &nbsp; GROUP HEALTH PLAN &nbsp; FECA BLK LUNG &nbsp; OTHER</span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "nowrap", fontSize: "6.5px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "1px" }}>{chkBox(isMedicare)} Medicare <span style={{ fontSize: "5.5px" }}>(Medicare#)</span></span>
              <span style={{ display: "flex", alignItems: "center", gap: "1px" }}>{chkBox(isMedicaid)} Medicaid <span style={{ fontSize: "5.5px" }}>(Medicaid#)</span></span>
              <span style={{ display: "flex", alignItems: "center", gap: "1px" }}>{chkBox(false)} TRICARE <span style={{ fontSize: "5.5px" }}>(ID#/DoD#)</span></span>
              <span style={{ display: "flex", alignItems: "center", gap: "1px" }}>{chkBox(false)} CHAMPVA <span style={{ fontSize: "5.5px" }}>(Member ID#)</span></span>
              <span style={{ display: "flex", alignItems: "center", gap: "1px" }}>{chkBox(isBCBS)} Group Health Plan <span style={{ fontSize: "5.5px" }}>(ID#)</span></span>
              <span style={{ display: "flex", alignItems: "center", gap: "1px" }}>{chkBox(false)} FECA <span style={{ fontSize: "5.5px" }}>(ID#)</span></span>
              <span style={{ display: "flex", alignItems: "center", gap: "1px" }}>{chkBox(isOther || isAutoPI)} Other <span style={{ fontSize: "5.5px" }}>(ID#)</span></span>
            </div>
          </td>
          <td style={cellLast({ width: "38%" })}>
            <span style={lbl}>1a. INSURED'S I.D. NUMBER &nbsp;<span style={{ fontWeight: "normal" }}>(For Program in Item 1)</span></span>
            <div style={{ fontSize: "8px", marginTop: "2px" }}>{effectiveClaim.insurance_id || ""}</div>
          </td>
        </tr></tbody>
      </table>

      {/* ── ROW 2: Patient Name | DOB/Sex | Insured Name ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: border }}>
        <colgroup><col style={{ width: "34%" }}/><col style={{ width: "18%" }}/><col style={{ width: "48%" }}/></colgroup>
        <tbody><tr>
          <td style={cell()}>
            <span style={lbl}>2. PATIENT'S NAME <span style={{ fontWeight: "normal" }}>(Last Name, First Name, Middle Initial)</span></span>
            <div style={{ fontSize: "8px", marginTop: "2px" }}>{patient ? `${patient.last_name}, ${patient.first_name}` : (effectiveClaim.patient_name || "")}</div>
          </td>
          <td style={cell()}>
            <span style={lbl}>3. PATIENT'S BIRTH DATE &nbsp;&nbsp; SEX</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px", fontSize: "7px" }}>
              <div>
                <div style={{ ...lbl, fontSize: "5px" }}>MM &nbsp;&nbsp; DD &nbsp;&nbsp; YY</div>
                <div style={{ fontSize: "7.5px" }}>{fmtDate(patient?.dob)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                {chkBox(patient?.sex === "Male")} M &nbsp; {chkBox(patient?.sex === "Female")} F
              </div>
            </div>
          </td>
          <td style={cellLast()}>
            <span style={lbl}>4. INSURED'S NAME <span style={{ fontWeight: "normal" }}>(Last Name, First Name, Middle Initial)</span></span>
            <div style={{ fontSize: "8px", marginTop: "2px" }}>{effectiveClaim.insured_name || ""}</div>
          </td>
        </tr></tbody>
      </table>

      {/* ── ROW 3: Patient Address | Relationship | Insured Address ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: border }}>
        <colgroup><col style={{ width: "34%" }}/><col style={{ width: "18%" }}/><col style={{ width: "48%" }}/></colgroup>
        <tbody><tr style={{ verticalAlign: "top" }}>
          <td style={cell()}>
            <span style={lbl}>5. PATIENT'S ADDRESS <span style={{ fontWeight: "normal" }}>(No., Street)</span></span>
            <div style={{ fontSize: "7.5px", marginTop: "2px" }}>{patient?.address_line1 || ""}</div>
            <div style={{ display: "flex", gap: "4px", marginTop: "3px" }}>
              <div style={{ flex: 2 }}><span style={lbl}>CITY</span><div style={{ fontSize: "7.5px" }}>{patient?.city || ""}</div></div>
              <div style={{ flex: 1 }}><span style={lbl}>STATE</span><div style={{ fontSize: "7.5px" }}>{patient?.state || ""}</div></div>
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "3px" }}>
              <div style={{ flex: 1 }}><span style={lbl}>ZIP CODE</span><div style={{ fontSize: "7.5px" }}>{patient?.zip || ""}</div></div>
              <div style={{ flex: 2 }}><span style={lbl}>TELEPHONE (Include Area Code)</span><div style={{ fontSize: "7.5px" }}>( {patient?.phone?.slice(0,3) || "   "} ) {patient?.phone?.slice(3) || ""}</div></div>
            </div>
          </td>
          <td style={cell()}>
            <span style={lbl}>6. PATIENT RELATIONSHIP TO INSURED</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px", marginTop: "2px", fontSize: "6.5px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "1px" }}>{chkBox(relationship === "Self")} Self</span>
              <span style={{ display: "flex", alignItems: "center", gap: "1px" }}>{chkBox(relationship === "Spouse")} Spouse</span>
              <span style={{ display: "flex", alignItems: "center", gap: "1px" }}>{chkBox(relationship === "Child")} Child</span>
              <span style={{ display: "flex", alignItems: "center", gap: "1px" }}>{chkBox(relationship === "Other")} Other</span>
            </div>
            <div style={{ marginTop: "6px", borderTop: border, paddingTop: "2px" }}>
              <span style={lbl}>8. RESERVED FOR NUCC USE</span>
            </div>
          </td>
          <td style={cellLast()}>
            <span style={lbl}>7. INSURED'S ADDRESS <span style={{ fontWeight: "normal" }}>(No., Street)</span></span>
            <div style={{ fontSize: "7.5px", marginTop: "2px" }}>{patient?.address_line1 || ""}</div>
            <div style={{ display: "flex", gap: "4px", marginTop: "3px" }}>
              <div style={{ flex: 2 }}><span style={lbl}>CITY</span><div style={{ fontSize: "7.5px" }}>{patient?.city || ""}</div></div>
              <div style={{ flex: 1 }}><span style={lbl}>STATE</span><div style={{ fontSize: "7.5px" }}>{patient?.state || ""}</div></div>
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "3px" }}>
              <div style={{ flex: 1 }}><span style={lbl}>ZIP CODE</span><div style={{ fontSize: "7.5px" }}>{patient?.zip || ""}</div></div>
              <div style={{ flex: 2 }}><span style={lbl}>TELEPHONE (Include Area Code)</span><div style={{ fontSize: "7.5px" }}>( {patient?.phone?.slice(0,3) || "   "} ) {patient?.phone?.slice(3) || ""}</div></div>
            </div>
          </td>
        </tr></tbody>
      </table>

      {/* ── ROW 4: Other Insured | Condition Related | Insured Policy ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: border }}>
        <colgroup><col style={{ width: "28%" }}/><col style={{ width: "24%" }}/><col style={{ width: "48%" }}/></colgroup>
        <tbody><tr style={{ verticalAlign: "top" }}>
          <td style={cell()}>
            <span style={lbl}>9. OTHER INSURED'S NAME <span style={{ fontWeight: "normal" }}>(Last Name, First Name, Middle Initial)</span></span>
            <div style={{ height: "8px" }}></div>
            <span style={lbl}>a. OTHER INSURED'S POLICY OR GROUP NUMBER</span>
            <div style={{ height: "8px" }}></div>
            <span style={lbl}>b. RESERVED FOR NUCC USE</span>
            <div style={{ height: "8px" }}></div>
            <span style={lbl}>c. RESERVED FOR NUCC USE</span>
            <div style={{ height: "8px" }}></div>
            <span style={lbl}>d. INSURANCE PLAN NAME OR PROGRAM NAME</span>
          </td>
          <td style={cell()}>
            <span style={lbl}>10. IS PATIENT'S CONDITION RELATED TO:</span>
            <div style={{ marginTop: "2px" }}>
              <span style={lbl}>a. EMPLOYMENT? (Current or Previous)</span>
              <div style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "6.5px", marginTop: "1px" }}>
                {chkBox(effectiveClaim.accident_employment)} YES &nbsp; {chkBox(!effectiveClaim.accident_employment)} NO
              </div>
            </div>
            <div style={{ marginTop: "3px" }}>
              <span style={lbl}>b. AUTO ACCIDENT? &nbsp; PLACE (State)</span>
              <div style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "6.5px", marginTop: "1px" }}>
                {chkBox(effectiveClaim.accident_auto)} YES &nbsp; {chkBox(!effectiveClaim.accident_auto)} NO &nbsp;
                <span style={{ borderBottom: border, display: "inline-block", width: "20px", fontSize: "7px" }}>{effectiveClaim.accident_auto_state || ""}</span>
              </div>
            </div>
            <div style={{ marginTop: "3px" }}>
              <span style={lbl}>c. OTHER ACCIDENT?</span>
              <div style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "6.5px", marginTop: "1px" }}>
                {chkBox(effectiveClaim.accident_other)} YES &nbsp; {chkBox(!effectiveClaim.accident_other)} NO
              </div>
            </div>
            <div style={{ marginTop: "3px" }}>
              <span style={lbl}>10d. CLAIM CODES (Designated by NUCC)</span>
            </div>
          </td>
          <td style={cellLast()}>
            <span style={lbl}>11. INSURED'S POLICY GROUP OR FECA NUMBER</span>
            <div style={{ fontSize: "7.5px", marginTop: "2px" }}>{effectiveClaim.insurance_group || ""}</div>
            <div style={{ marginTop: "3px" }}>
              <span style={lbl}>a. INSURED'S DATE OF BIRTH &nbsp;&nbsp; SEX</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "7px", marginTop: "1px" }}>
                <div>
                  <div style={{ ...lbl, fontSize: "5px" }}>MM &nbsp;&nbsp; DD &nbsp;&nbsp; YY</div>
                  <div>{fmtDate(effectiveClaim.insured_dob)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                  {chkBox(effectiveClaim.insured_sex === "Male")} M &nbsp; {chkBox(effectiveClaim.insured_sex === "Female")} F
                </div>
              </div>
            </div>
            <div style={{ marginTop: "3px" }}>
              <span style={lbl}>b. OTHER CLAIM ID (Designated by NUCC)</span>
              <div style={{ height: "8px" }}></div>
            </div>
            <div style={{ marginTop: "2px" }}>
              <span style={lbl}>c. INSURANCE PLAN NAME OR PROGRAM NAME</span>
              <div style={{ fontSize: "7.5px", marginTop: "1px" }}>{effectiveClaim.insurance_plan || ""}</div>
            </div>
            <div style={{ marginTop: "3px" }}>
              <span style={lbl}>d. IS THERE ANOTHER HEALTH BENEFIT PLAN?</span>
              <div style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "6.5px", marginTop: "1px" }}>
                {chkBox(false)} YES &nbsp; {chkBox(true)} NO &nbsp; <span style={{ fontSize: "5.5px" }}>If yes, complete items 9, 9a, and 9d.</span>
              </div>
            </div>
          </td>
        </tr></tbody>
      </table>

      {/* ── READ BACK / Signatures ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: border }}>
        <colgroup><col style={{ width: "52%" }}/><col style={{ width: "48%" }}/></colgroup>
        <tbody><tr style={{ verticalAlign: "top" }}>
          <td style={cell({ backgroundColor: "#fff8f0" })}>
            <span style={{ ...lbl, color: R }}>READ BACK OF FORM BEFORE COMPLETING &amp; SIGNING THIS FORM.</span>
            <div style={{ fontSize: "6px", lineHeight: "1.3", marginTop: "1px" }}>
              12. PATIENT'S OR AUTHORIZED PERSON'S SIGNATURE I authorize the release of any medical or other information necessary to process this claim. I also request payment of government benefits either to myself or to the party who accepts assignment below.
            </div>
            <div style={{ marginTop: "4px", fontSize: "6.5px", display: "flex", gap: "8px" }}>
              <span>SIGNED <span style={{ borderBottom: "0.5px solid #000", display: "inline-block", width: "80px", fontSize: "7px" }}>Signature on File</span></span>
              <span>DATE {fmtDate(effectiveClaim.date_of_service)}</span>
            </div>
          </td>
          <td style={cellLast({ backgroundColor: "#fff8f0" })}>
            <span style={{ fontSize: "6px", lineHeight: "1.3", color: "#000" }}>
              13. INSURED'S OR AUTHORIZED PERSON'S SIGNATURE I authorize payment of medical benefits to the undersigned physician or supplier for services described below.
            </span>
            <div style={{ marginTop: "4px", fontSize: "6.5px" }}>
              SIGNED <span style={{ borderBottom: "0.5px solid #000", display: "inline-block", width: "100px" }}>Signature on File</span>
            </div>
          </td>
        </tr></tbody>
      </table>

      {/* ── ROW: 14 | 15 | 16 ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: border }}>
        <colgroup><col style={{ width: "26%" }}/><col style={{ width: "20%" }}/><col style={{ width: "54%" }}/></colgroup>
        <tbody><tr style={{ verticalAlign: "top" }}>
          <td style={cell()}>
            <span style={lbl}>14. DATE OF CURRENT ILLNESS, INJURY, or PREGNANCY (LMP)</span>
            <div style={{ ...lbl, fontSize: "5px" }}>MM &nbsp;&nbsp; DD &nbsp;&nbsp; YY</div>
            <div style={{ fontSize: "7.5px" }}>{fmtDate(effectiveClaim.onset_date || effectiveClaim.accident_date || effectiveClaim.date_of_first_visit)}</div>
            <span style={lbl}>QUAL.</span>
          </td>
          <td style={cell()}>
            <span style={lbl}>15. OTHER DATE</span>
            <div style={{ ...lbl, fontSize: "5px" }}>MM &nbsp;&nbsp; DD &nbsp;&nbsp; YY</div>
            <div style={{ fontSize: "7.5px" }}>{fmtDate(effectiveClaim.date_of_first_visit)}</div>
            <span style={lbl}>QUAL.</span>
          </td>
          <td style={cellLast()}>
            <span style={lbl}>16. DATES PATIENT UNABLE TO WORK IN CURRENT OCCUPATION</span>
            <div style={{ display: "flex", gap: "8px", fontSize: "6.5px", marginTop: "2px" }}>
              <span>FROM <span style={{ ...lbl, fontSize: "5px", display: "inline" }}>MM DD YY</span></span>
              <span>TO <span style={{ ...lbl, fontSize: "5px", display: "inline" }}>MM DD YY</span></span>
            </div>
          </td>
        </tr></tbody>
      </table>

      {/* ── ROW: 17 | 18 ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: border }}>
        <colgroup><col style={{ width: "46%" }}/><col style={{ width: "54%" }}/></colgroup>
        <tbody><tr style={{ verticalAlign: "top" }}>
          <td style={cell()}>
            <span style={lbl}>17. NAME OF REFERRING PROVIDER OR OTHER SOURCE</span>
            <div style={{ fontSize: "7.5px", marginTop: "2px" }}>{effectiveClaim.referring_provider || ""}</div>
            <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
              <span style={lbl}>17a. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              <span style={lbl}>17b. NPI &nbsp; {effectiveClaim.referring_npi || ""}</span>
            </div>
          </td>
          <td style={cellLast()}>
            <span style={lbl}>18. HOSPITALIZATION DATES RELATED TO CURRENT SERVICES</span>
            <div style={{ display: "flex", gap: "8px", fontSize: "6.5px", marginTop: "2px" }}>
              <span>FROM <span style={{ ...lbl, fontSize: "5px", display: "inline" }}>MM DD YY</span></span>
              <span>TO <span style={{ ...lbl, fontSize: "5px", display: "inline" }}>MM DD YY</span></span>
            </div>
          </td>
        </tr></tbody>
      </table>

      {/* ── ROW: 19 | 20 ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: border }}>
        <colgroup><col style={{ width: "60%" }}/><col style={{ width: "40%" }}/></colgroup>
        <tbody><tr style={{ verticalAlign: "top" }}>
          <td style={cell()}>
            <span style={lbl}>19. ADDITIONAL CLAIM INFORMATION (Designated by NUCC)</span>
            <div style={{ height: "10px" }}></div>
          </td>
          <td style={cellLast()}>
            <span style={lbl}>20. OUTSIDE LAB? &nbsp;&nbsp; $ CHARGES</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "6.5px", marginTop: "2px" }}>
              {chkBox(false)} YES &nbsp; {chkBox(true)} NO
            </div>
          </td>
        </tr></tbody>
      </table>

      {/* ── BOX 21 + 22 + 23 ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: border }}>
        <colgroup><col style={{ width: "60%" }}/><col style={{ width: "15%" }}/><col style={{ width: "25%" }}/></colgroup>
        <tbody><tr style={{ verticalAlign: "top" }}>
          <td style={cell()}>
            <span style={lbl}>21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY. <span style={{ fontWeight: "normal" }}>Relate A–L to service line below (24E)</span> &nbsp; ICD Ind. <span style={{ border: border, padding: "0 2px" }}>0</span></span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px 4px", marginTop: "2px" }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "2px", borderBottom: i < 8 ? border : "none", paddingBottom: "1px", fontSize: "7.5px" }}>
                  <span style={{ fontWeight: "bold", color: R, fontSize: "6.5px", minWidth: "9px" }}>{String.fromCharCode(65 + i)}.</span>
                  <span>{dx[i]?.code || ""}</span>
                </div>
              ))}
            </div>
          </td>
          <td style={cell()}>
            <span style={lbl}>22. RESUBMISSION CODE &nbsp; ORIGINAL REF. NO.</span>
            <div style={{ height: "30px" }}></div>
          </td>
          <td style={cellLast()}>
            <span style={lbl}>23. PRIOR AUTHORIZATION NUMBER</span>
            <div style={{ fontSize: "7.5px", marginTop: "2px" }}>{effectiveClaim.authorization_number || ""}</div>
          </td>
        </tr></tbody>
      </table>

      {/* ── BOX 24: Service Lines ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: border, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "8%" }}/>  {/* Date From */}
          <col style={{ width: "8%" }}/>  {/* Date To */}
          <col style={{ width: "4%" }}/>  {/* POS */}
          <col style={{ width: "3%" }}/>  {/* EMG */}
          <col style={{ width: "9%" }}/>  {/* CPT */}
          <col style={{ width: "9%" }}/>  {/* Modifier */}
          <col style={{ width: "7%" }}/>  {/* Dx Pointer */}
          <col style={{ width: "9%" }}/>  {/* $ Charges */}
          <col style={{ width: "5%" }}/>  {/* Units */}
          <col style={{ width: "4%" }}/>  {/* EPSDT */}
          <col style={{ width: "4%" }}/>  {/* ID Qual */}
          <col style={{ width: "30%" }}/> {/* Rendering NPI */}
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: BG, borderBottom: border }}>
            <th colSpan="2" style={{ padding: "2px 2px", borderRight: border, textAlign: "left" }}>
              <span style={lbl}>24. A.</span>
              <span style={lbl}>DATE(S) OF SERVICE</span>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "5.5px", color: R }}>
                <span>From</span><span>To</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "5px", color: R }}>
                <span>MM DD YY</span><span>MM DD YY</span>
              </div>
            </th>
            <th style={{ padding: "2px 1px", borderRight: border, textAlign: "center" }}>
              <span style={lbl}>B.</span>
              <span style={{ ...lbl, fontSize: "5px" }}>PLACE OF</span>
              <span style={{ ...lbl, fontSize: "5px" }}>SERVICE</span>
            </th>
            <th style={{ padding: "2px 1px", borderRight: border, textAlign: "center" }}>
              <span style={lbl}>C.</span>
              <span style={{ ...lbl, fontSize: "5px" }}>EMG</span>
            </th>
            <th colSpan="2" style={{ padding: "2px 2px", borderRight: border, textAlign: "left" }}>
              <span style={lbl}>D. PROCEDURES, SERVICES, OR SUPPLIES</span>
              <span style={{ ...lbl, fontSize: "5.5px" }}>(Explain Unusual Circumstances)</span>
              <div style={{ display: "flex", gap: "4px", fontSize: "5.5px", color: R, fontWeight: "bold" }}>
                <span>CPT/HCPCS</span><span>MODIFIER</span>
              </div>
            </th>
            <th style={{ padding: "2px 1px", borderRight: border, textAlign: "center" }}>
              <span style={lbl}>E.</span>
              <span style={{ ...lbl, fontSize: "5px" }}>DIAGNOSIS</span>
              <span style={{ ...lbl, fontSize: "5px" }}>POINTER</span>
            </th>
            <th style={{ padding: "2px 2px", borderRight: border, textAlign: "center" }}>
              <span style={lbl}>F.</span>
              <span style={{ ...lbl, fontSize: "5px" }}>$ CHARGES</span>
            </th>
            <th style={{ padding: "2px 1px", borderRight: border, textAlign: "center" }}>
              <span style={lbl}>G.</span>
              <span style={{ ...lbl, fontSize: "5px" }}>DAYS</span>
              <span style={{ ...lbl, fontSize: "5px" }}>OR</span>
              <span style={{ ...lbl, fontSize: "5px" }}>UNITS</span>
            </th>
            <th style={{ padding: "2px 1px", borderRight: border, textAlign: "center" }}>
              <span style={lbl}>H.</span>
              <span style={{ ...lbl, fontSize: "5px" }}>EPSDT</span>
              <span style={{ ...lbl, fontSize: "5px" }}>Family</span>
              <span style={{ ...lbl, fontSize: "5px" }}>Plan</span>
            </th>
            <th style={{ padding: "2px 1px", borderRight: border, textAlign: "center" }}>
              <span style={lbl}>I.</span>
              <span style={{ ...lbl, fontSize: "5px" }}>ID.</span>
              <span style={{ ...lbl, fontSize: "5px" }}>QUAL</span>
            </th>
            <th style={{ padding: "2px 2px", textAlign: "center" }}>
              <span style={lbl}>J. RENDERING</span>
              <span style={{ ...lbl, fontSize: "5px" }}>PROVIDER ID. #</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const dos = line?.date_of_service || effectiveClaim.date_of_service || "";
            const formattedDos = fmtDate(dos);
            const rowNum = (pageNum - 1) * 6 + i + 1;
            return (
              <tr key={i} style={{ borderBottom: i < 5 ? border : "none", height: "18px" }}>
                {/* Row number + Date From */}
                <td style={{ padding: "1px 2px", borderRight: border, fontSize: "7px", position: "relative" }}>
                  <span style={{ position: "absolute", left: "1px", top: "1px", fontWeight: "bold", color: R, fontSize: "6px" }}>{rowNum}</span>
                  <div style={{ paddingLeft: "7px", fontSize: "7.5px" }}>{line ? formattedDos : ""}</div>
                </td>
                {/* Date To */}
                <td style={{ padding: "1px 2px", borderRight: border, fontSize: "7.5px" }}>
                  {line ? formattedDos : ""}
                </td>
                {/* POS */}
                <td style={{ padding: "1px 2px", borderRight: border, fontSize: "7.5px", textAlign: "center" }}>
                  {line ? (effectiveClaim.place_of_service || "11") : ""}
                </td>
                {/* EMG */}
                <td style={{ padding: "1px 2px", borderRight: border, fontSize: "7.5px" }}></td>
                {/* CPT */}
                <td style={{ padding: "1px 2px", borderRight: border, fontSize: "7.5px", fontWeight: "bold" }}>
                  {line?.code || ""}
                </td>
                {/* Modifier */}
                <td style={{ padding: "1px 2px", borderRight: border, fontSize: "7.5px" }}>
                  {line?.modifier || ""}
                </td>
                {/* Dx Pointer */}
                <td style={{ padding: "1px 2px", borderRight: border, fontSize: "7.5px", textAlign: "center" }}>
                  {line?.diagnosis_pointers || ""}
                </td>
                {/* $ Charges */}
                <td style={{ padding: "1px 2px", borderRight: border, fontSize: "7.5px", textAlign: "right" }}>
                  {line ? `${(line.charge || 0).toFixed(2)}` : ""}
                </td>
                {/* Units */}
                <td style={{ padding: "1px 2px", borderRight: border, fontSize: "7.5px", textAlign: "center" }}>
                  {line?.units || ""}
                </td>
                {/* EPSDT */}
                <td style={{ padding: "1px 2px", borderRight: border, fontSize: "7.5px" }}></td>
                {/* ID Qual */}
                <td style={{ padding: "1px 2px", borderRight: border, fontSize: "6.5px" }}>
                  {line ? "NPI" : ""}
                </td>
                {/* Rendering NPI */}
                <td style={{ padding: "1px 2px", fontSize: "7.5px" }}>
                  {line ? (ep.rendering_npi || "") : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── BOX 25–30 ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: border }}>
        <colgroup>
          <col style={{ width: "24%" }}/>
          <col style={{ width: "14%" }}/>
          <col style={{ width: "14%" }}/>
          <col style={{ width: "16%" }}/>
          <col style={{ width: "16%" }}/>
          <col style={{ width: "16%" }}/>
        </colgroup>
        <tbody><tr style={{ verticalAlign: "top" }}>
          <td style={cell()}>
            <span style={lbl}>25. FEDERAL TAX I.D. NUMBER &nbsp; SSN &nbsp; EIN</span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px", fontSize: "7.5px" }}>
              <span>{effectiveClaim.ein_tax_id || ep.ein_tax_id || ""}</span>
              <span style={{ marginLeft: "auto", fontSize: "6.5px" }}>{chkBox(false)} SSN &nbsp; {chkBox(true)} EIN</span>
            </div>
          </td>
          <td style={cell()}>
            <span style={lbl}>26. PATIENT'S ACCOUNT NO.</span>
            <div style={{ fontSize: "7.5px", marginTop: "2px" }}>{effectiveClaim.patient_id?.slice(-8) || ""}</div>
          </td>
          <td style={cell()}>
            <span style={lbl}>27. ACCEPT ASSIGNMENT?</span>
            <div style={{ fontSize: "6.5px", marginTop: "2px" }}>{chkBox(true)} YES &nbsp; {chkBox(false)} NO</div>
          </td>
          <td style={cell()}>
            <span style={lbl}>28. TOTAL CHARGE</span>
            <div style={{ fontSize: "8px", fontWeight: "bold", marginTop: "2px" }}>
              $ {isLastPage ? (effectiveClaim.total_charge || 0).toFixed(2) : pageCharge.toFixed(2)}
            </div>
          </td>
          <td style={cell()}>
            <span style={lbl}>29. AMOUNT PAID</span>
            <div style={{ fontSize: "8px", marginTop: "2px" }}>$ {isLastPage ? (effectiveClaim.amount_paid || 0).toFixed(2) : "0.00"}</div>
          </td>
          <td style={cellLast()}>
            <span style={lbl}>30. Rsvd for NUCC Use</span>
          </td>
        </tr></tbody>
      </table>

      {/* ── BOX 31–33 ── */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <colgroup><col style={{ width: "28%" }}/><col style={{ width: "36%" }}/><col style={{ width: "36%" }}/></colgroup>
        <tbody><tr style={{ verticalAlign: "top" }}>
          <td style={cell({ minHeight: "40px" })}>
            <span style={lbl}>31. SIGNATURE OF PHYSICIAN OR SUPPLIER INCLUDING DEGREES OR CREDENTIALS</span>
            <div style={{ fontSize: "5.5px", lineHeight: "1.3", marginTop: "1px" }}>(I certify that the statements on the reverse apply to this bill and are made a part thereof.)</div>
            <div style={{ marginTop: "4px", fontSize: "7.5px" }}>SIGNED &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; DATE {fmtDate(effectiveClaim.date_of_service)}</div>
            <div style={{ marginTop: "4px", display: "flex", gap: "8px", fontSize: "6.5px" }}>
              <span>a. <span style={{ ...lbl, display: "inline" }}>NPI</span> &nbsp; {ep.rendering_npi || ""}</span>
              <span>b. {ep.taxonomy_code || ""}</span>
            </div>
          </td>
          <td style={cell({ minHeight: "40px" })}>
            <span style={lbl}>32. SERVICE FACILITY LOCATION INFORMATION</span>
            <div style={{ fontSize: "7.5px", marginTop: "2px" }}>{office?.practice_name || ""}</div>
            <div style={{ fontSize: "7.5px" }}>{office?.billing_address_line1 || ""}</div>
            <div style={{ fontSize: "7.5px" }}>{[office?.billing_city, office?.billing_state, office?.billing_zip].filter(Boolean).join(" ")}</div>
            <div style={{ marginTop: "4px", display: "flex", gap: "8px", fontSize: "6.5px" }}>
              <span>a. <span style={{ ...lbl, display: "inline" }}>NPI</span> &nbsp; {ep.billing_npi || ""}</span>
              <span>b.</span>
            </div>
          </td>
          <td style={cellLast({ minHeight: "40px" })}>
            <span style={lbl}>33. BILLING PROVIDER INFO &amp; PH #</span>
            <div style={{ fontSize: "7.5px", marginTop: "2px" }}>
              {office?.phone ? `( ${office.phone.slice(0,3)} ) ${office.phone.slice(3)}` : ""}
            </div>
            <div style={{ fontSize: "7.5px", fontWeight: "bold" }}>{ep.rendering_provider || office?.practice_name || ""}</div>
            <div style={{ fontSize: "7.5px" }}>{office?.billing_address_line1 || ""}</div>
            <div style={{ fontSize: "7.5px" }}>{[office?.billing_city, office?.billing_state, office?.billing_zip].filter(Boolean).join(" ")}</div>
            <div style={{ marginTop: "4px", display: "flex", gap: "8px", fontSize: "6.5px" }}>
              <span>a. <span style={{ ...lbl, display: "inline" }}>NPI</span> &nbsp; {ep.billing_npi || ""}</span>
              <span>b. {ep.taxonomy_code || ""}</span>
            </div>
          </td>
        </tr></tbody>
      </table>

      {/* ── Footer ── */}
      <div style={{ borderTop: border, padding: "2px 6px", fontSize: "5.5px", textAlign: "center", color: R, backgroundColor: BG }}>
        NUCC Instruction Manual available at: www.nucc.org &nbsp;|&nbsp; <strong>PLEASE PRINT OR TYPE</strong> &nbsp;|&nbsp; APPROVED OMB-0938-1197 FORM 1500 (02-12)
      </div>
    </div>
  );
}
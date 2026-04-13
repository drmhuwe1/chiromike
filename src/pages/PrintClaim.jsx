import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrintClaim() {
  const urlParams = new URLSearchParams(window.location.search);
  const claimId = urlParams.get("id");
  const [claim, setClaim] = useState(null);
  const [office, setOffice] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inkColor, setInkColor] = useState('black');

  useEffect(() => {
    const load = async () => {
      const claims = await base44.entities.Claim.filter({ id: claimId });
      const c = claims[0];
      setClaim(c);
      if (c) {
        const patients = await base44.entities.Patient.filter({ id: c.patient_id });
        setPatient(patients[0] || null);
      }
      const settings = await base44.entities.OfficeSettings.list("-updated_date", 1);
      setOffice(settings[0] || null);
      setLoading(false);
    };
    if (claimId) load();
  }, [claimId]);

  const handlePrint = async () => {
    if (claim?.status !== "Printed") {
      await base44.entities.Claim.update(claim.id, { status: "Printed" });
    }
    window.print();
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!claim) return <div className="text-center py-12 text-muted-foreground">Claim not found</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 no-print">
        <Link to="/saved-claims"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 bg-card">
          <span className="text-xs text-muted-foreground font-medium">Ink Color:</span>
          <button onClick={() => setInkColor('black')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${inkColor === 'black' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
            <span className="w-3 h-3 rounded-full bg-black inline-block" /> Black
          </button>
          <button onClick={() => setInkColor('red')} className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${inkColor === 'red' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-300 hover:bg-red-50'}`}>
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Red
          </button>
        </div>
        <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print CMS-1500</Button>
      </div>

      <div className="print-area bg-white p-8 max-w-[8.5in] mx-auto border border-border rounded-xl" style={{ fontFamily: "'Courier New', monospace", fontSize: "11px", color: inkColor === 'red' ? '#cc0000' : 'black' }}>
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-lg font-bold tracking-wider">HEALTH INSURANCE CLAIM FORM</h1>
          <p className="text-[10px]">APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE (NUCC) 02/12</p>
          <p className="text-[10px]">CMS-1500 / HCFA-1500</p>
        </div>

        {/* Patient & Insured Info */}
        <div className="grid grid-cols-2 gap-4 border border-black p-3 mb-3">
          <div>
            <p className="text-[9px] font-bold mb-1">1. PATIENT'S NAME (Last, First, MI)</p>
            <p>{claim.patient_name}</p>
            <p className="text-[9px] font-bold mt-2 mb-1">3. PATIENT'S BIRTH DATE / SEX</p>
            <p>{patient?.dob || "—"} &nbsp; {patient?.sex || ""}</p>
            <p className="text-[9px] font-bold mt-2 mb-1">5. PATIENT'S ADDRESS</p>
            <p>{patient?.address_line1 || ""}</p>
            <p>{patient?.city || ""} {patient?.state || ""} {patient?.zip || ""}</p>
            <p>{patient?.phone || ""}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold mb-1">1a. INSURED'S I.D. NUMBER</p>
            <p>{claim.insurance_id || "—"}</p>
            <p className="text-[9px] font-bold mt-2 mb-1">4. INSURED'S NAME</p>
            <p>{claim.insured_name || "—"}</p>
            <p className="text-[9px] font-bold mt-2 mb-1">11. INSURED'S GROUP NO.</p>
            <p>{claim.insurance_group || "—"}</p>
            <p className="text-[9px] font-bold mt-2 mb-1">11c. INSURANCE PLAN NAME</p>
            <p>{claim.insurance_company || "—"}</p>
          </div>
        </div>

        {/* Accident Info */}
        {claim.accident_related && (
          <div className="border border-black p-3 mb-3">
            <p className="text-[9px] font-bold mb-1">10. IS PATIENT'S CONDITION RELATED TO:</p>
            <p>Accident: YES &nbsp; Type: {claim.accident_type || "—"} &nbsp; Date: {claim.accident_date || "—"}</p>
          </div>
        )}

        {/* Authorization */}
        {claim.authorization_number && (
          <div className="border border-black p-3 mb-3">
            <p className="text-[9px] font-bold mb-1">23. PRIOR AUTHORIZATION NUMBER</p>
            <p>{claim.authorization_number}</p>
          </div>
        )}

        {/* Diagnosis Codes */}
        <div className="border border-black p-3 mb-3">
          <p className="text-[9px] font-bold mb-2">21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY</p>
          <div className="grid grid-cols-4 gap-2">
            {(claim.diagnoses || []).map((dx, i) => (
              <div key={i}>
                <span className="font-bold">{String.fromCharCode(65 + i)}.</span> {dx.code} {dx.description ? `- ${dx.description}` : ""}
              </div>
            ))}
          </div>
        </div>

        {/* Service Lines */}
        <div className="border border-black mb-3">
          <div className="grid grid-cols-12 bg-black text-white text-[9px] font-bold p-1">
            <div className="col-span-2">DATE(S) OF SVC</div>
            <div className="col-span-1">POS</div>
            <div className="col-span-2">CPT/HCPCS</div>
            <div className="col-span-1">MOD</div>
            <div className="col-span-2">DX PTR</div>
            <div className="col-span-2 text-right">CHARGES</div>
            <div className="col-span-1 text-right">UNITS</div>
            <div className="col-span-1"></div>
          </div>
          {(claim.service_lines || []).map((line, i) => (
            <div key={i} className="grid grid-cols-12 border-t border-black p-1 text-[10px]">
              <div className="col-span-2">{line.date_of_service}</div>
              <div className="col-span-1">{claim.place_of_service}</div>
              <div className="col-span-2 font-bold">{line.code}</div>
              <div className="col-span-1">{line.modifier}</div>
              <div className="col-span-2">{line.diagnosis_pointers}</div>
              <div className="col-span-2 text-right">${(line.charge || 0).toFixed(2)}</div>
              <div className="col-span-1 text-right">{line.units}</div>
              <div className="col-span-1"></div>
            </div>
          ))}
          <div className="grid grid-cols-12 border-t-2 border-black p-1 font-bold text-[10px]">
            <div className="col-span-8"></div>
            <div className="col-span-2 text-right">TOTAL: ${(claim.total_charge || 0).toFixed(2)}</div>
            <div className="col-span-2 text-right">PAID: ${(claim.amount_paid || 0).toFixed(2)}</div>
          </div>
        </div>

        {/* Referring & Rendering Provider */}
        <div className="grid grid-cols-2 gap-4 border border-black p-3 mb-3">
          <div>
            <p className="text-[9px] font-bold mb-1">17. NAME OF REFERRING PROVIDER</p>
            <p>{claim.referring_provider || "—"}</p>
            <p className="text-[9px] font-bold mt-1 mb-1">17b. NPI</p>
            <p>{claim.referring_npi || "—"}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold mb-1">24J. RENDERING PROVIDER NPI</p>
            <p>{office?.rendering_npi || "—"}</p>
          </div>
        </div>

        {/* Billing Provider */}
        <div className="border border-black p-3">
          <p className="text-[9px] font-bold mb-1">33. BILLING PROVIDER INFO & PH #</p>
          <p className="font-bold">{office?.practice_name || ""}</p>
          <p>{office?.billing_address_line1 || ""}</p>
          <p>{office?.billing_city || ""} {office?.billing_state || ""} {office?.billing_zip || ""}</p>
          <p>Phone: {office?.phone || ""}</p>
          <div className="grid grid-cols-2 mt-2">
            <div>
              <p className="text-[9px] font-bold">33a. NPI: {office?.billing_npi || ""}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold">25. EIN: {office?.ein_tax_id || ""}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {claim.claim_notes && (
          <div className="border border-black p-3 mt-3">
            <p className="text-[9px] font-bold mb-1">NOTES</p>
            <p>{claim.claim_notes}</p>
          </div>
        )}

        {/* Signature line */}
        <div className="mt-6 pt-3 border-t border-black text-center text-[9px]">
          <p>SIGNATURE OF PHYSICIAN OR SUPPLIER &nbsp;&nbsp;&nbsp; DATE: {claim.date_of_service}</p>
          <p className="mt-1">{office?.rendering_provider || ""} &nbsp; NPI: {office?.rendering_npi || ""}</p>
        </div>
      </div>
    </div>
  );
}
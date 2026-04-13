import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrintReceipt() {
  const urlParams = new URLSearchParams(window.location.search);
  const claimId = urlParams.get("id");
  const [claim, setClaim] = useState(null);
  const [office, setOffice] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const total = claim.total_charge || 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 no-print">
        <Link to="/saved-claims"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>
        <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print Receipt</Button>
      </div>

      <div className="print-area bg-white text-black p-8 max-w-[5in] mx-auto border border-border rounded-xl" style={{ fontFamily: "'Courier New', monospace", fontSize: "12px", pageBreakAfter: "avoid" }}>
        {/* Header */}
        <div className="text-center mb-6">
          {office?.logo_url && (
            <img src={office.logo_url} alt="Logo" className="h-16 mx-auto mb-2 object-contain" />
          )}
          <h1 className="text-xl font-bold">{office?.practice_name || "Huwe Chiropractic"}</h1>
          <p className="text-[11px]">{office?.billing_address_line1 || ""}</p>
          <p className="text-[11px]">{office?.billing_city || ""} {office?.billing_state || ""} {office?.billing_zip || ""}</p>
          <p className="text-[11px]">{office?.phone || ""}</p>
          {office?.receipt_header && <p className="mt-2 text-[11px]">{office.receipt_header}</p>}
        </div>

        <div className="border-t border-dashed border-black pt-3 mb-3">
          <h2 className="text-center font-bold mb-3">
            {claim.visit_type?.includes("Cash") ? "RECEIPT" : "SUPERBILL"}
          </h2>
        </div>

        {/* Patient & Date */}
        <div className="mb-4">
          <div className="flex justify-between">
            <span className="font-bold">Patient:</span>
            <span>{claim.patient_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Date:</span>
            <span>{claim.date_of_service}</span>
          </div>
          {patient?.dob && (
            <div className="flex justify-between">
              <span className="font-bold">DOB:</span>
              <span>{patient.dob}</span>
            </div>
          )}
        </div>

        {/* Diagnoses */}
        {claim.diagnoses?.length > 0 && (
          <div className="mb-4">
            <p className="font-bold border-b border-black mb-1">Diagnoses:</p>
            {claim.diagnoses.map((dx, i) => (
              <p key={i} className="text-[11px]">{dx.code} - {dx.description}</p>
            ))}
          </div>
        )}

        {/* Services */}
        <div className="border-t border-black pt-2 mb-2">
          <div className="grid grid-cols-12 font-bold text-[10px] mb-1">
            <div className="col-span-3">CODE</div>
            <div className="col-span-5">DESCRIPTION</div>
            <div className="col-span-2 text-right">QTY</div>
            <div className="col-span-2 text-right">AMOUNT</div>
          </div>
          {(claim.service_lines || []).map((line, i) => (
            <div key={i} className="grid grid-cols-12 text-[11px] border-t border-dotted border-gray-400 py-1">
              <div className="col-span-3 font-mono">{line.code}</div>
              <div className="col-span-5">{line.description}</div>
              <div className="col-span-2 text-right">{line.units}</div>
              <div className="col-span-2 text-right">${((line.charge || 0) * (line.units || 1)).toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t-2 border-black pt-2 mt-2">
          <div className="flex justify-between font-bold text-lg">
            <span>TOTAL CHARGE</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] mt-1">
            <span>Amount Paid</span>
            <span>${(claim.amount_paid || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-black pt-1 mt-1">
            <span>Balance Due</span>
            <span>${(total - (claim.amount_paid || 0)).toFixed(2)}</span>
          </div>
        </div>

        {/* Provider */}
        <div className="mt-4 pt-3 border-t border-dashed border-black text-center text-[10px]">
          <p>Provider: {office?.rendering_provider || ""}</p>
          {office?.rendering_npi && <p>NPI: {office.rendering_npi}</p>}
          {office?.ein_tax_id && <p>Tax ID: {office.ein_tax_id}</p>}
        </div>

        {/* Footer */}
        {office?.receipt_footer && (
          <div className="mt-4 pt-3 border-t border-dashed border-black text-center text-[11px]">
            <p>{office.receipt_footer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
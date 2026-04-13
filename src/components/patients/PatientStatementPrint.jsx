import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

export default function PatientStatementPrint({ patient, office, claims, payments, onClose }) {
  const totalCharges = claims.reduce((sum, c) => sum + (c.total_charge || 0), 0);
  const totalPayments = payments.reduce((sum, p) => sum + (p.payment_amount || 0), 0);
  const balance = totalCharges - totalPayments;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 no-print">
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" /> Print Statement PDF
        </Button>
      </div>

      <div 
        className="print-area bg-white text-black mx-auto"
        style={{
          width: "8.5in",
          minHeight: "11in",
          margin: "0 auto",
          padding: "1in",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          lineHeight: "1.4",
          boxShadow: "0 0 0 1px #ccc",
          pageBreakAfter: "always"
        }}
      >
        {/* Header with Logo */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          {office?.logo_url && (
            <img 
              src={office.logo_url} 
              alt="Logo" 
              style={{ 
                maxHeight: "80px", 
                maxWidth: "400px",
                marginBottom: "10px",
                objectFit: "contain"
              }} 
            />
          )}
          <h1 style={{ margin: "8px 0", fontSize: "18px", fontWeight: "bold" }}>
            {office?.practice_name || "Practice"}
          </h1>
          <p style={{ margin: "2px 0", fontSize: "11px" }}>
            {office?.billing_address_line1} {office?.billing_address_line2}
          </p>
          <p style={{ margin: "2px 0", fontSize: "11px" }}>
            {office?.billing_city}, {office?.billing_state} {office?.billing_zip}
          </p>
          <p style={{ margin: "2px 0", fontSize: "11px" }}>
            Phone: {office?.phone}
          </p>
        </div>

        <div style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "8px 0", margin: "12px 0", textAlign: "center" }}>
          <h2 style={{ margin: "0", fontSize: "16px", fontWeight: "bold" }}>PATIENT ACCOUNT STATEMENT</h2>
        </div>

        {/* Patient Info */}
        <div style={{ marginBottom: "16px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: "bold", width: "30%", paddingBottom: "4px" }}>Patient Name:</td>
                <td style={{ paddingBottom: "4px" }}>{patient.first_name} {patient.last_name}</td>
                <td style={{ fontWeight: "bold", width: "30%", paddingBottom: "4px", textAlign: "right" }}>Statement Date:</td>
                <td style={{ paddingBottom: "4px", textAlign: "right" }}>{new Date().toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", paddingBottom: "4px" }}>DOB:</td>
                <td style={{ paddingBottom: "4px" }}>{patient.dob || "—"}</td>
                <td style={{ fontWeight: "bold", paddingBottom: "4px", textAlign: "right" }}>Account #:</td>
                <td style={{ paddingBottom: "4px", textAlign: "right" }}>{patient.id?.substring(0, 8)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", paddingBottom: "4px" }}>Email:</td>
                <td style={{ paddingBottom: "4px" }}>{patient.email || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Services Detail Table */}
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "12px" }}>SERVICES PROVIDED</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #000", backgroundColor: "#f5f5f5" }}>
                <th style={{ textAlign: "left", padding: "6px", fontWeight: "bold" }}>Date</th>
                <th style={{ textAlign: "left", padding: "6px", fontWeight: "bold" }}>Procedure Codes</th>
                <th style={{ textAlign: "left", padding: "6px", fontWeight: "bold" }}>Diagnosis Codes</th>
                <th style={{ textAlign: "right", padding: "6px", fontWeight: "bold" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim, idx) => (
                <tr key={claim.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "6px", fontFamily: "monospace" }}>{claim.date_of_service}</td>
                  <td style={{ padding: "6px", fontSize: "10px" }}>
                    {(claim.service_lines || []).map(l => `${l.code}`).join(", ") || "—"}
                  </td>
                  <td style={{ padding: "6px", fontSize: "10px" }}>
                    {(claim.diagnoses || []).map(d => d.code).join(", ") || "—"}
                  </td>
                  <td style={{ padding: "6px", textAlign: "right", fontWeight: "500" }}>
                    ${(claim.total_charge || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div style={{ marginBottom: "16px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderTop: "2px solid #000", borderBottom: "1px solid #000" }}>
                <td style={{ textAlign: "right", padding: "8px", fontWeight: "bold" }}>Total Charges:</td>
                <td style={{ textAlign: "right", padding: "8px", fontWeight: "bold", width: "120px" }}>
                  ${totalCharges.toFixed(2)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #000" }}>
                <td style={{ textAlign: "right", padding: "8px", fontWeight: "bold" }}>Total Payments:</td>
                <td style={{ textAlign: "right", padding: "8px", fontWeight: "bold" }}>
                  ${totalPayments.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: "right", padding: "8px", fontWeight: "bold", fontSize: "14px" }}>Balance Due:</td>
                <td style={{ textAlign: "right", padding: "8px", fontWeight: "bold", fontSize: "14px", color: balance > 0 ? "#dc2626" : "#16a34a" }}>
                  ${Math.abs(balance).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ fontSize: "10px", borderTop: "1px dashed #000", paddingTop: "12px", marginTop: "auto", textAlign: "center" }}>
          {office?.rendering_provider && (
            <p style={{ margin: "2px 0" }}>Provider: {office.rendering_provider}</p>
          )}
          {office?.ein_tax_id && (
            <p style={{ margin: "2px 0" }}>Tax ID: {office.ein_tax_id}</p>
          )}
          <p style={{ margin: "2px 0", marginTop: "8px" }}>Thank you for your business.</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-area {
            box-shadow: none !important;
            width: 8.5in !important;
            height: 11in !important;
            margin: 0 !important;
            padding: 1in !important;
            page-break-after: always;
          }
          @page {
            size: letter;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
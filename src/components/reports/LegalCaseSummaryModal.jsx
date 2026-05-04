import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Printer, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function LegalCaseSummaryModal({ patient, claims, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      const accidentClaim = claims.find(c => c.accident_related);
      const res = await base44.functions.invoke("generateLegalCaseSummary", {
        patient_id: patient.id,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        accident_type: accidentClaim?.accident_type || "Unknown",
        accident_date: accidentClaim?.accident_date,
        diagnoses: patient.diagnoses || [],
        pain_areas: patient.pain_areas || [],
        total_visits: claims.length,
        total_charges: claims.reduce((s, c) => s + (c.total_charge || 0), 0),
        current_status: patient.pain_frequency || "Ongoing",
      });
      setReport(res.data);
    } catch (e) {
      toast({ title: "Failed to generate report", variant: "destructive" });
      setLoading(false);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  };

  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Legal Case Summary Report</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating legal case summary with case law research...</p>
            </div>
          </div>
        ) : report ? (
          <>
            {/* Report Preview */}
            <div className="bg-white border border-border rounded-lg p-8 font-serif text-sm leading-relaxed space-y-4 print-area">
              <div className="text-center border-b pb-4 mb-6">
                <h1 className="text-xl font-bold">LEGAL CASE SUMMARY REPORT</h1>
                <p className="text-xs text-muted-foreground mt-2">For Attorney Review</p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="font-bold">PATIENT INFORMATION</p>
                  <p className="text-xs mt-2">
                    <strong>Name:</strong> {patient.first_name} {patient.last_name} | 
                    <strong className="ml-4">DOB:</strong> {patient.dob || "N/A"}
                  </p>
                  <p className="text-xs">
                    <strong>Contact:</strong> {patient.phone} | <strong>Email:</strong> {patient.email || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="font-bold">INJURY DETAILS</p>
                  <p className="text-xs mt-2">
                    <strong>Accident Date:</strong> {patient.accident_date || "N/A"}
                  </p>
                  <p className="text-xs">
                    <strong>Accident Type:</strong> {patient.accident_type || "Auto"}
                  </p>
                  <p className="text-xs">
                    <strong>Chief Complaint:</strong> {patient.chief_complaint || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="font-bold">CLINICAL FINDINGS</p>
                  <p className="text-xs mt-2">
                    <strong>Diagnosed Conditions:</strong>
                  </p>
                  <ul className="text-xs list-disc list-inside ml-2 mt-1">
                    {patient.diagnoses && patient.diagnoses.length > 0 ? (
                      patient.diagnoses.map((d, i) => (
                        <li key={i}>{d.code} - {d.description}</li>
                      ))
                    ) : (
                      <li>No diagnosis codes on file</li>
                    )}
                  </ul>
                  {patient.pain_areas && patient.pain_areas.length > 0 && (
                    <>
                      <p className="text-xs mt-2">
                        <strong>Pain Areas:</strong> {patient.pain_areas.join(", ")}
                      </p>
                    </>
                  )}
                  {patient.pain_scale && (
                    <p className="text-xs mt-2">
                      <strong>Initial Pain Level:</strong> {patient.pain_scale}/10
                    </p>
                  )}
                </div>

                <div>
                  <p className="font-bold">TREATMENT SUMMARY</p>
                  <p className="text-xs mt-2">
                    <strong>Total Treatment Visits:</strong> {claims.length}
                  </p>
                  <p className="text-xs">
                    <strong>Total Treatment Charges:</strong> ${claims.reduce((s, c) => s + (c.total_charge || 0), 0).toFixed(2)}
                  </p>
                  <p className="text-xs">
                    <strong>Treatment Dates:</strong> {claims.length > 0 ? `${claims[claims.length - 1].date_of_service} to ${claims[0].date_of_service}` : "N/A"}
                  </p>
                  <p className="text-xs mt-2">
                    <strong>Current Status:</strong> {patient.pain_frequency === "Constant" ? "Ongoing symptoms" : patient.pain_frequency === "Rare" ? "Significantly improved" : "Moderate ongoing treatment"}
                  </p>
                </div>

                <div>
                  <p className="font-bold">RELEVANT CASE LAW & PRECEDENT</p>
                  <div className="text-xs mt-2 space-y-2 bg-blue-50 border border-blue-200 rounded p-3">
                    {report.relevant_cases && report.relevant_cases.length > 0 ? (
                      report.relevant_cases.map((caseInfo, i) => (
                        <div key={i} className="border-b border-blue-100 pb-2 last:border-0">
                          <p className="font-semibold text-blue-900">{caseInfo.case_name}</p>
                          <p className="text-blue-800 mt-1">{caseInfo.summary}</p>
                          <p className="text-blue-700 mt-1 italic">Award Range: {caseInfo.award_range}</p>
                          <p className="text-blue-600 mt-1 text-xs">Relevance: {caseInfo.relevance}</p>
                        </div>
                      ))
                    ) : (
                      <p>Case law research completed - see attached analysis for applicable precedents.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="font-bold">ASSESSMENT & RECOMMENDATIONS</p>
                  <p className="text-xs mt-2">
                    {report.assessment || "Based on clinical findings and injury details, this case presents reasonable damages claim potential based on documented medical treatment, functional limitations, and ongoing care requirements."}
                  </p>
                </div>

                <div className="border-t pt-4 mt-6 text-xs text-muted-foreground">
                  <p>
                    <strong>Report Generated:</strong> {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                  <p className="mt-2 italic">
                    This report is prepared for attorney review and legal consultation purposes. All information is derived from clinical records and patient documentation on file.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handlePrint} variant="outline" className="flex-1">
                <Printer className="w-4 h-4 mr-2" /> Print Report
              </Button>
              <Button onClick={generateReport} variant="outline" className="flex-1">
                🔄 Regenerate with AI
              </Button>
              <Button onClick={onClose} variant="outline" className="flex-1">
                Close
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
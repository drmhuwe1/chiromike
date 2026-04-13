import { AlertCircle, CheckCircle } from "lucide-react";

const REQUIRED_FIELDS = [
  { key: "dob", label: "Date of Birth" },
  { key: "phone", label: "Cell Phone" },
  { key: "email", label: "Email" },
  { key: "insurance_company", label: "Insurance Company" },
  { key: "insurance_id", label: "Insurance ID" },
  { key: "chief_complaint", label: "Chief Complaint" },
  { key: "hipaa_consent", label: "HIPAA Consent" },
];

export default function IntakeAlertBanner({ patient }) {
  if (!patient) return null;

  const missing = REQUIRED_FIELDS.filter(f => {
    const val = patient[f.key];
    return !val || val === "" || val === false;
  });

  const isNewIntake = patient.intake_source === "intake_form";

  if (missing.length === 0 && !isNewIntake) return null;

  return (
    <div className="space-y-2 mb-4">
      {isNewIntake && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span><strong>New Patient Intake Form</strong> — submitted by patient online on {new Date(patient.intake_completed_at).toLocaleDateString()}</span>
        </div>
      )}
      {missing.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Missing information for this patient:</p>
            <p className="text-amber-700 mt-0.5">{missing.map(f => f.label).join(" · ")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
import { AlertCircle, CheckCircle } from "lucide-react";

export function validateClaimReadiness(claim, patient) {
  const errors = [];
  if (!patient?.first_name || !patient?.last_name) errors.push("Patient first and last name are required");
  if (!patient?.dob) errors.push("Patient date of birth is required");
  if (!patient?.address_line1) errors.push("Patient street address is required");
  if (!claim?.date_of_service) errors.push("Date of service is required");
  if (!claim?.insurance_company) errors.push("Insurance company name is required");
  if (!claim?.insurance_id) errors.push("Subscriber / Member ID is required");
  if (!claim?.diagnoses || claim.diagnoses.length === 0) errors.push("At least one ICD-10 diagnosis code is required");
  if (!claim?.service_lines || claim.service_lines.length === 0) errors.push("At least one CPT service line is required");
  (claim?.service_lines || []).forEach((line, i) => {
    if (!line.code) errors.push(`Service line ${i + 1}: CPT code is missing`);
    if (!line.charge || line.charge <= 0) errors.push(`Service line ${i + 1}: Charge amount must be greater than $0`);
    if (!line.diagnosis_pointers) errors.push(`Service line ${i + 1}: Diagnosis pointer (e.g. A, B) is required`);
  });
  return errors;
}

export default function ClaimReadinessCheck({ claim, patient }) {
  const errors = validateClaimReadiness(claim, patient);
  const isReady = errors.length === 0;

  return (
    <div className={`rounded-lg border p-3 ${isReady ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        {isReady
          ? <CheckCircle className="w-4 h-4 text-emerald-600" />
          : <AlertCircle className="w-4 h-4 text-red-600" />}
        <span className={`text-sm font-semibold ${isReady ? 'text-emerald-700' : 'text-red-700'}`}>
          {isReady ? 'Claim Ready for Export' : `${errors.length} issue${errors.length > 1 ? 's' : ''} must be fixed`}
        </span>
      </div>
      {!isReady && (
        <ul className="mt-1 space-y-0.5">
          {errors.map((e, i) => (
            <li key={i} className="text-xs text-red-700 flex items-start gap-1">
              <span className="mt-0.5">•</span><span>{e}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
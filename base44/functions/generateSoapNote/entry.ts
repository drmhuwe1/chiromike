import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { claim_id, pain_scale, functional_limitations, doctor_notes } = await req.json();

    // Fetch claim, patient, office settings
    const [claims, settings] = await Promise.all([
      base44.entities.Claim.filter({ id: claim_id }),
      base44.entities.OfficeSettings.list('-updated_date', 1),
    ]);

    const claim = claims[0];
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    const patients = await base44.entities.Patient.filter({ id: claim.patient_id });
    const patient = patients[0];
    const office = settings[0] || {};

    const isAutoPI = claim.visit_type === 'Auto' || claim.payer_type === 'Auto/PI';
    const isWorkComp = claim.payer_type === 'Workers Comp';
    const isAccident = isAutoPI || isWorkComp || claim.accident_related;

    const diagList = (claim.diagnoses || []).map(d => `${d.code} - ${d.description}`).join('; ');
    const procList = (claim.service_lines || []).map(l => `${l.code} ${l.description} (x${l.units})`).join('; ');

    const prompt = `You are a licensed chiropractic physician writing a professional SOAP note for a patient visit.
Write in the first person as the treating physician. Use clinical, professional language suitable for insurance review, legal proceedings, and Workers' Compensation / Auto/PI claims.

PATIENT: ${patient ? patient.first_name + ' ' + patient.last_name : 'Unknown'}
DOB: ${patient?.dob || 'N/A'}
DATE OF SERVICE: ${claim.date_of_service}
VISIT TYPE: ${claim.visit_type}
PAYER: ${claim.payer_type}
${isAccident ? `ACCIDENT DATE: ${claim.accident_date || 'N/A'}\nACCIDENT TYPE: ${claim.accident_type || isAutoPI ? 'Auto' : 'Work'}\n` : ''}
DIAGNOSES: ${diagList || 'See claim'}
PROCEDURES PERFORMED: ${procList || 'See claim'}
CURRENT PAIN SCALE: ${pain_scale || 'N/A'} / 10
FUNCTIONAL LIMITATIONS: ${functional_limitations || 'Not specified'}
DOCTOR ADDITIONAL NOTES: ${doctor_notes || 'None'}

Write a complete SOAP note with these four sections. For Auto/PI and Workers Comp cases, include causation language connecting injuries to the accident/work incident, functional limitations, and treatment necessity. Include treatment plan expectations (frequency, duration, goals).

Return JSON with:
- subjective: (patient's complaints, history, mechanism of injury if accident, pain description, aggravating/relieving factors)
- objective: (physical exam findings, range of motion, orthopedic/neurological tests performed, palpation findings, posture)
- assessment: (clinical impression, ICD-10 diagnoses with descriptions, severity, prognosis, causation if accident-related)
- plan: (treatment performed today, home care instructions, next visit frequency, expected treatment duration, functional goals, referrals if any)`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          subjective: { type: 'string' },
          objective: { type: 'string' },
          assessment: { type: 'string' },
          plan: { type: 'string' },
        }
      }
    });

    // Save SOAP note to database
    const soapNote = await base44.asServiceRole.entities.SoapNote.create({
      patient_id: claim.patient_id,
      patient_name: claim.patient_name,
      claim_id: claim.id,
      date_of_service: claim.date_of_service,
      visit_type: claim.visit_type,
      provider_name: office.rendering_provider || '',
      subjective: result.subjective,
      objective: result.objective,
      assessment: result.assessment,
      plan: result.plan,
      diagnoses: claim.diagnoses || [],
      procedures: claim.service_lines || [],
      accident_related: claim.accident_related || false,
      accident_date: claim.accident_date || '',
      accident_type: claim.accident_type || '',
      pain_scale_current: pain_scale || null,
      functional_limitations: functional_limitations || '',
      doctor_signature: office.rendering_provider || '',
    });

    return Response.json({ soap_note: soapNote, office });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
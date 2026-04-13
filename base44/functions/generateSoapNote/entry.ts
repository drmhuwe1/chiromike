import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { claim_id, pain_scale, functional_limitations, doctor_notes } = await req.json();

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
    const isAccident = isAutoPI || claim.accident_related;

    const diagList = (claim.diagnoses || []).map(d => `${d.code} - ${d.description}`).join('; ');
    const procList = (claim.service_lines || []).map(l => `${l.code} ${l.description} (x${l.units}${l.modifier ? ', mod: ' + l.modifier : ''})`).join('; ');

    const patientAge = patient?.dob
      ? Math.floor((new Date() - new Date(patient.dob)) / 31536000000)
      : null;

    const autoPromptExtra = isAutoPI ? `
IMPORTANT — AUTO/PI INSURANCE DOCUMENTATION REQUIREMENTS:
This note MUST satisfy the documentation standards required by auto liability insurers, PIP carriers, and plaintiff attorneys for chiropractic treatment causally related to a motor vehicle accident (MVA).

You MUST include in the appropriate SOAP sections:
- Mechanism of injury: describe the MVA impact direction, estimated speed/force if known, seatbelt use, airbag deployment, vehicle damage description (use clinical language such as "patient reports rear-end impact at moderate speed with resultant sudden acceleration-deceleration force applied to the cervical and lumbar spine")
- Causation statement: clearly connect all diagnoses to the MVA using language such as "within reasonable chiropractic certainty, the patient's current symptoms and diagnoses are causally related to the motor vehicle accident of [accident date]"
- Symptom onset and progression: date symptoms began (ideally same day or within 72 hours of accident), how symptoms have changed since onset
- Neurological screening results (e.g. DTRs, sensation, grip strength, Spurling's, SLR, Kemp's)
- ROM measurements with degrees for cervical and lumbar spine (e.g. "Cervical flexion 35°/60° normal, extension 20°/75° normal...")
- Orthopedic test results (positive/negative): Cervical Compression, Distraction, Soto Hall, Valsalva, SLR, Braggard's as applicable
- Muscle palpation findings: specific regions, grades of spasm, trigger points
- Treatment necessity statement: explain why chiropractic care is medically necessary and not solely for comfort
- Functional limitations with specific ADL impact (work, sleep, driving, household, recreation)
- Current pain scale numeric and comparison to initial presentation
- Treatment plan with frequency and duration: e.g. "3x/week x 4 weeks, then reassess"
- Prognosis: good/fair/guarded with rationale
- Referral considerations if neurological signs are present` : '';

    const prompt = `You are a licensed chiropractic physician (DC) writing a legally and clinically defensible SOAP note for a patient visit. Write in the first person as the treating physician. Use precise clinical language appropriate for insurance review, peer review, IME defense, and potential litigation.

PATIENT: ${patient ? patient.first_name + ' ' + patient.last_name : 'Unknown'}
DOB: ${patient?.dob || 'N/A'}${patientAge ? ` (Age ${patientAge})` : ''}
SEX: ${patient?.sex || 'N/A'}
DATE OF SERVICE: ${claim.date_of_service}
VISIT TYPE: ${claim.visit_type}
PAYER TYPE: ${claim.payer_type}
ACCIDENT RELATED: ${isAccident ? 'YES' : 'NO'}
${isAccident ? `ACCIDENT DATE: ${claim.accident_date || 'N/A'}
ACCIDENT TYPE: ${claim.accident_type || 'Auto'}` : ''}
DIAGNOSES (ICD-10): ${diagList || 'See claim'}
PROCEDURES PERFORMED TODAY: ${procList || 'See claim'}
CURRENT PAIN SCALE: ${pain_scale !== null && pain_scale !== undefined ? pain_scale + ' / 10' : 'Not recorded'}
FUNCTIONAL LIMITATIONS REPORTED: ${functional_limitations || 'Not specified'}
PROVIDER NOTES: ${doctor_notes || 'None'}
RENDERING PROVIDER: ${office.rendering_provider || 'Treating Physician'}
${isAccident && claim.accident_date ? `DAYS SINCE ACCIDENT: ${Math.floor((new Date(claim.date_of_service) - new Date(claim.accident_date)) / 86400000)}` : ''}
${patient?.chief_complaint ? `CHIEF COMPLAINT ON FILE: ${patient.chief_complaint}` : ''}
${patient?.pain_areas?.length ? `PAIN AREAS: ${patient.pain_areas.join(', ')}` : ''}
${patient?.occupation ? `OCCUPATION: ${patient.occupation}` : ''}
${patient?.current_medications ? `CURRENT MEDICATIONS: ${patient.current_medications}` : ''}
${patient?.health_history?.length ? `HEALTH HISTORY: ${patient.health_history.join(', ')}` : ''}
${patient?.surgeries ? `PRIOR SURGERIES: ${patient.surgeries}` : ''}
${isAutoPI && patient?.attorney_name ? `PATIENT'S ATTORNEY: ${patient.attorney_name}` : ''}
${isAutoPI && patient?.insurance_company ? `AUTO INSURER: ${patient.insurance_company}` : ''}
${isAutoPI && patient?.insured_id ? `CLAIM/POLICY NUMBER: ${patient.insured_id}` : ''}

CLAIM NOTES: ${claim.claim_notes || 'None'}

${autoPromptExtra}

Write a COMPLETE, DETAILED SOAP note with four sections. Be thorough and specific. Do NOT use vague language. Include actual clinical findings, measurements, and clinical reasoning.

Return JSON with exactly these four string fields:
- subjective: Patient's reported complaints, history of present illness, mechanism of injury (for accidents: full MVA description), symptom onset/progression, aggravating and relieving factors, functional impact on daily activities, sleep, work. Reference the pain scale and specific symptoms.
- objective: Physical examination findings including vital signs if relevant, posture and gait observation, spinal range of motion with degrees for all planes measured, orthopedic test results (positive/negative for each test performed), neurological screening (DTRs, sensation, motor strength), muscle palpation findings (specific regions, spasm grade, trigger points, tenderness levels), chiropractic analysis findings. List all procedures performed with clinical rationale.
- assessment: Clinical impression, all ICD-10 diagnoses with full descriptions and severity, response to treatment so far, prognosis (good/fair/guarded with reasoning), causation statement for accident cases (use "within a reasonable degree of chiropractic certainty" language), barriers to recovery if any.
- plan: Treatment rendered today (specific techniques, areas treated, modalities), home care instructions (ice/heat, stretching, activity restrictions), next appointment frequency and duration, total expected treatment course, short and long-term functional goals, referral recommendations if neurological involvement, re-examination schedule.`;

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
      accident_related: isAccident || false,
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
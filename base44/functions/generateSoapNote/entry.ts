import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { patient_id, date_from, date_to, form_type } = await req.json();

    if (!patient_id) return Response.json({ error: 'patient_id required' }, { status: 400 });

    const [patients, claims, settings] = await Promise.all([
      base44.entities.Patient.filter({ id: patient_id }),
      base44.entities.Claim.filter({ patient_id }, '-date_of_service', 50),
      base44.entities.OfficeSettings.list('-updated_date', 1),
    ]);

    const patient = patients[0];
    if (!patient) return Response.json({ error: 'Patient not found' }, { status: 404 });

    const office = settings[0] || {};

    // Filter claims by date range
    const filteredClaims = claims.filter(c => {
      if (date_from && c.date_of_service < date_from) return false;
      if (date_to && c.date_of_service > date_to) return false;
      return true;
    });

    if (filteredClaims.length === 0) {
      return Response.json({ error: 'No claims found in date range' }, { status: 404 });
    }

    // Use first claim as reference or create multi-visit note
    const claim = filteredClaims[0];
    const isAutoPI = claim.visit_type === 'Auto' || claim.payer_type === 'Auto/PI';
    const isAccident = isAutoPI || claim.accident_related;

    const diagList = (claim.diagnoses || []).map(d => `${d.code} - ${d.description}`).join('; ');
    const procList = (claim.service_lines || []).map(l => `${l.code} ${l.description} (x${l.units}${l.modifier ? ', mod: ' + l.modifier : ''})`).join('; ');

    const patientAge = patient?.dob
      ? Math.floor((new Date() - new Date(patient.dob)) / 31536000000)
      : null;

    const visitHistory = filteredClaims.length > 1
      ? filteredClaims.map((v, i) => `Visit ${i + 1} (${v.date_of_service}): ${v.visit_type}, Procedures: ${v.service_lines?.map(s => s.code).join(', ') || 'N/A'}, Total: $${(v.total_charge || 0).toFixed(2)}`).join('\n')
      : '';

    const autoPromptExtra = isAutoPI ? `
IMPORTANT — AUTO/PI INSURANCE DOCUMENTATION REQUIREMENTS:
This note MUST satisfy the documentation standards required by auto liability insurers, PIP carriers, and plaintiff attorneys for chiropractic treatment causally related to a motor vehicle accident (MVA).

You MUST include in the appropriate SOAP sections:
- Mechanism of injury: describe the MVA impact direction, estimated speed/force if known, seatbelt use, airbag deployment, vehicle damage description
- Causation statement: clearly connect all diagnoses to the MVA using language such as "within reasonable chiropractic certainty, the patient's current symptoms and diagnoses are causally related to the motor vehicle accident"
- Symptom onset and progression: date symptoms began, how symptoms have changed since onset
- Neurological screening results
- ROM measurements with degrees for cervical and lumbar spine
- Orthopedic test results (positive/negative)
- Muscle palpation findings: specific regions, grades of spasm, trigger points
- Treatment necessity statement
- Functional limitations with specific ADL impact
- Current pain scale numeric
- Treatment plan with frequency and duration
- Prognosis: good/fair/guarded with rationale` : '';

    const prompt = `You are a licensed chiropractic physician (DC) writing a legally and clinically defensible SOAP note. Write in the first person as the treating physician. Use precise clinical language.

PATIENT: ${patient.first_name} ${patient.last_name}
DOB: ${patient?.dob || 'N/A'}${patientAge ? ` (Age ${patientAge})` : ''}
SEX: ${patient?.sex || 'N/A'}
DATE RANGE: ${date_from} to ${date_to}
VISIT COUNT: ${filteredClaims.length}
ACCIDENT RELATED: ${isAccident ? 'YES' : 'NO'}
${isAccident ? `ACCIDENT DATE: ${claim.accident_date || 'N/A'}\nACCIDENT TYPE: ${claim.accident_type || 'Auto'}` : ''}
DIAGNOSES (ICD-10): ${diagList || 'See claims'}
PROCEDURES: ${procList || 'See claims'}
RENDERING PROVIDER: ${office.rendering_provider || 'Treating Physician'}
${patient?.chief_complaint ? `CHIEF COMPLAINT: ${patient.chief_complaint}` : ''}
${patient?.occupation ? `OCCUPATION: ${patient.occupation}` : ''}
${patient?.current_medications ? `CURRENT MEDICATIONS: ${patient.current_medications}` : ''}

${visitHistory ? `VISIT HISTORY:\n${visitHistory}` : ''}

${autoPromptExtra}

Write a COMPLETE, DETAILED SOAP note covering the treatment period from ${date_from} to ${date_to}. Include progress across all visits if multiple visits occurred.

Return JSON with exactly these four string fields:
- subjective: Patient's reported complaints, history, symptom progression across visits
- objective: Physical examination findings, vital signs, ROM, orthopedic tests, neurological screening, palpation findings, all procedures performed
- assessment: Clinical impression, all ICD-10 diagnoses, response to treatment, prognosis, causation statement for accident cases
- plan: Treatment rendered, home care instructions, next appointment frequency, expected treatment course, functional goals, referral recommendations`;

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
      patient_id: patient.id,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      claim_id: claim.id,
      date_of_service: date_from,
      visit_type: filteredClaims.length > 1 ? 'Multi-Visit Summary' : claim.visit_type,
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
      doctor_signature: office.rendering_provider || '',
    });

    return Response.json({ data: soapNote });
  } catch (error) {
    console.error('SOAP note generation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
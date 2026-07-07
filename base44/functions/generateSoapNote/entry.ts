import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { patient_id, date_from, date_to, form_type } = await req.json();

    if (!patient_id) return Response.json({ error: 'patient_id required' }, { status: 400 });

    // RBAC: only admins may generate SOAP notes for arbitrary patients
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch patient, claims, and office settings
    const patientData = await base44.asServiceRole.entities.Patient.get(patient_id);
    if (!patientData) return Response.json({ error: 'Patient not found' }, { status: 404 });

    const claims = await base44.asServiceRole.entities.Claim.filter({ patient_id }, '-date_of_service', 50);
    const settingsList = await base44.asServiceRole.entities.OfficeSettings.list('-updated_date', 1);
    const office = settingsList[0] || {};

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

    const patientAge = patientData?.dob
      ? Math.floor((new Date() - new Date(patientData.dob)) / 31536000000)
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

PATIENT: ${patientData.first_name} ${patientData.last_name}
DOB: ${patientData?.dob || 'N/A'}${patientAge ? ` (Age ${patientAge})` : ''}
SEX: ${patientData?.sex || 'N/A'}
DATE RANGE: ${date_from} to ${date_to}
VISIT COUNT: ${filteredClaims.length}
ACCIDENT RELATED: ${isAccident ? 'YES' : 'NO'}
${isAccident ? `ACCIDENT DATE: ${claim.accident_date || 'N/A'}\nACCIDENT TYPE: ${claim.accident_type || 'Auto'}` : ''}
DIAGNOSES (ICD-10): ${diagList || 'See claims'}
PROCEDURES: ${procList || 'See claims'}
RENDERING PROVIDER: ${office.rendering_provider || 'Treating Physician'}
${patientData?.chief_complaint ? `CHIEF COMPLAINT: ${patientData.chief_complaint}` : ''}
${patientData?.occupation ? `OCCUPATION: ${patientData.occupation}` : ''}
${patientData?.current_medications ? `CURRENT MEDICATIONS: ${patientData.current_medications}` : ''}

${visitHistory ? `VISIT HISTORY:\n${visitHistory}` : ''}

${autoPromptExtra}

Write a COMPLETE, DETAILED, MEDICALLY COMPREHENSIVE SOAP note covering the treatment period from ${date_from} to ${date_to}. This note must be suitable for insurance documentation and legal review if needed.

CRITICAL REQUIREMENTS:
- Include specific clinical findings with measurements where applicable
- Reference all diagnoses and procedures documented in the claim
- Use professional medical terminology
- If multiple visits, summarize progress and treatment response across visits
- For accident cases, include clear causation statements

Return a JSON object with exactly these four REQUIRED string fields (all must be populated with substantive content):

1. "subjective": Patient's chief complaints, history of present illness, symptom onset and progression, how symptoms have affected daily activities and work, response to previous treatments, comorbidities relevant to condition. Should be 200+ words.

2. "objective": Vital signs if applicable, ROM measurements (cervical/lumbar with degrees), orthopedic test results (specific test names and positive/negative), neurological screening findings (DTR, sensory, motor strength), palpation findings (muscle spasm grades, trigger points by location), all procedures performed with dates. Should be 300+ words.

3. "assessment": Clinical impression including mechanism of injury if applicable, all ICD-10 diagnosis codes with descriptions, clinical response to treatment (improvement percentage if possible), functional limitations, prognosis with rationale, causation statement for accident cases with specific reference to MVA impact. Should be 250+ words.

4. "plan": Detailed treatment plan including specific procedures recommended, frequency and duration of treatment (e.g., "3x per week for 4 weeks, then 2x per week"), home care and ergonomic instructions, functional goals, expected treatment timeline, when to re-evaluate, indication for referral (if any). Should be 200+ words.

Ensure comprehensive medical detail suitable for insurance submission.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          subjective: { type: 'string', description: 'Patient subjective findings' },
          objective: { type: 'string', description: 'Objective examination findings' },
          assessment: { type: 'string', description: 'Clinical assessment and diagnoses' },
          plan: { type: 'string', description: 'Treatment plan and recommendations' },
        },
        required: ['subjective', 'objective', 'assessment', 'plan']
      }
    });

    console.log('Raw AI Result type:', typeof result);
    console.log('Raw AI Result keys:', Object.keys(result || {}));
    
    // Handle response - InvokeLLM wraps in {response: {...}} sometimes
    let soapData = result;
    if (result.response && !result.subjective) {
      soapData = result.response;
    }
    
    console.log('Final SOAP fields:', { 
      hasSubjective: !!soapData.subjective,
      hasObjective: !!soapData.objective,
      hasAssessment: !!soapData.assessment,
      hasPlan: !!soapData.plan,
      subjectiveLen: soapData.subjective?.length || 0,
      objectiveLen: soapData.objective?.length || 0,
    });

    // Validate we have content
    if (!soapData.subjective || !soapData.objective || !soapData.assessment || !soapData.plan) {
      console.error('Missing SOAP fields:', { 
        subjective: !!soapData.subjective,
        objective: !!soapData.objective,
        assessment: !!soapData.assessment,
        plan: !!soapData.plan
      });
      return Response.json({ 
        error: 'AI incomplete response' 
      }, { status: 500 });
    }

    const soapNote = await base44.asServiceRole.entities.SoapNote.create({
      patient_id: patientData.id,
      patient_name: `${patientData.first_name} ${patientData.last_name}`,
      claim_id: claim.id,
      date_of_service: date_from,
      visit_type: filteredClaims.length > 1 ? 'Multi-Visit Summary' : claim.visit_type,
      provider_name: office.rendering_provider || '',
      subjective: soapData.subjective || '',
      objective: soapData.objective || '',
      assessment: soapData.assessment || '',
      plan: soapData.plan || '',
      diagnoses: claim.diagnoses || [],
      procedures: claim.service_lines || [],
      accident_related: isAccident || false,
      accident_date: claim.accident_date || '',
      accident_type: claim.accident_type || '',
      doctor_signature: office.rendering_provider || '',
    });

    return Response.json({ data: soapNote });
  } catch (error) {
    console.error('SOAP note generation error:', error);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message || 'Failed to generate SOAP note' }, { status: 500 });
  }
});
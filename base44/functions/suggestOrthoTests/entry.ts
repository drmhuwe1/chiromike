import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      chief_complaint,
      pain_areas,
      diagnoses,
      accident_type,
      pain_scale,
      pain_description,
      pain_frequency,
      onset,
      additional_context,
      patient_age,
      patient_sex,
    } = await req.json();

    const dxStr = diagnoses && diagnoses.length > 0
      ? diagnoses.map(d => `${d.code} (${d.description || 'undiagnosed condition'})`).join('; ')
      : 'Not yet diagnosed — base diagnostic workup expected';
    const painStr = pain_areas && pain_areas.length > 0 ? pain_areas.join(', ') : 'Not specified';
    const complaintStr = chief_complaint || 'Musculoskeletal pain — location unspecified';
    const sexStr = patient_sex ? `Sex: ${patient_sex}; ` : '';
    const ageStr = patient_age ? `Age: ${patient_age}; ` : '';
    const onsetStr = onset ? `Onset: ${onset}; ` : '';
    const painDetail = pain_description ? `Pain quality: ${pain_description}; ` : '';
    const painFreq = pain_frequency ? `Frequency: ${pain_frequency}. ` : '';
    const mechanism = accident_type || 'Personal injury / musculoskeletal complaint';
    const painScore = (typeof pain_scale === 'number') ? `Pain VAS: ${pain_scale}/10.` : '';

    const prompt = `You are a chiropractic clinical decision-support assistant. The clinician needs an evidence-based recommendation for ORTHOPEDIC / NEUROLOGICAL EXAM TESTS and an associated DIAGNOSTIC + TREATMENT PLAN based on the patient's complaints and presentation. Use current peer-reviewed literature, clinical practice guidelines (CCGI, CCGS, American Chiropractic Association, NICE, ACR Appropriateness Criteria), and textbook standards of orthopedic testing (Magee, Evans, Cipriano) — search the internet to confirm the most current recommendations.

PATIENT PRESENTATION:
- ${ageStr}${sexStr}
- Chief Complaint: ${complaintStr}
- Mechanism of Injury: ${mechanism}
- Pain Areas: ${painStr}
- ${onsetStr}${painDetail}${painFreq}${painScore}
- Diagnoses (ICD-10, if any): ${dxStr}
- Additional Context: ${additional_context || 'None'}

TASK:
1. Recommend 4-8 SPECIFIC orthopedic and neurological tests most appropriate to fully diagnose this patient's presentation. For each, list:
   - test_name (full formal name, e.g., "Spurling's Test", "Straight Leg Raise")
   - purpose (which structure/condition the test differentiates — be specific, e.g., "Cervical radiculopathy involving C5-C7 nerve roots")
   - positive_finding (the sign that constitutes a positive result and its clinical significance)

2. Provide diagnostic_considerations: imaging recommendations (X-ray views, MRI, CT indications), red-flag screening, and differential diagnoses that should be ruled out — specific to this presentation.

3. Provide a treatment_plan: specific chiropractic and adjunctive modalities recommended (manipulation level/approach, therapies, exercises, modalities), with brief rationale.

4. Provide visit_frequency (e.g., "2-3x/week for 2 weeks, then 1-2x/week").

5. Provide expected_duration: typical episode length and when to re-evaluate (e.g., "4-6 weeks with functional outcome re-exam at visit 6 or 30 days").

6. Provide a supporting_summary: a 4-6 sentence clinical rationale explaining how the recommended tests, diagnostics, and treatment align with the patient's mechanism, complaints, and any existing diagnoses — written for a peer reviewer or PI attorney.

7. Provide cited_sources: 2-5 supporting sources (guideline names, key journal article citations with year, or textbook references). Prefer recent (last 10 years; current year is 2026) peer-reviewed systematic reviews, RCTs, and clinical practice guidelines. Each entry can be a short citation line.

Format response as a single JSON object matching the schema. Do NOT include any text outside the JSON.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          recommended_tests: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                test_name: { type: 'string' },
                purpose: { type: 'string' },
                positive_finding: { type: 'string' },
              },
              required: ['test_name', 'purpose', 'positive_finding'],
            },
          },
          diagnostic_considerations: { type: 'string' },
          treatment_plan: { type: 'string' },
          visit_frequency: { type: 'string' },
          expected_duration: { type: 'string' },
          supporting_summary: { type: 'string' },
          cited_sources: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: [
          'recommended_tests',
          'diagnostic_considerations',
          'treatment_plan',
          'visit_frequency',
          'expected_duration',
          'supporting_summary',
          'cited_sources',
        ],
      },
    });

    return Response.json(res);
  } catch (error) {
    console.error('Error in suggestOrthoTests:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
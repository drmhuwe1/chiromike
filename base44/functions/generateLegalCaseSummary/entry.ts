import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      patient_id,
      patient_name,
      accident_type,
      accident_date,
      diagnoses,
      pain_areas,
      total_visits,
      total_charges,
      current_status,
    } = await req.json();

    // Build diagnosis string for AI
    const diagnosisStr = diagnoses && diagnoses.length > 0
      ? diagnoses.map(d => `${d.code} (${d.description})`).join(', ')
      : 'Not specified';

    const painAreasStr = pain_areas && pain_areas.length > 0
      ? pain_areas.join(', ')
      : 'Multiple areas';

    // Prompt to generate case assessment and search for relevant case law
    const prompt = `
You are a legal case assistant helping prepare a medical-legal report for a chiropractic injury case.

Patient Case Details:
- Name: ${patient_name}
- Accident Type: ${accident_type}
- Accident Date: ${accident_date}
- Diagnoses: ${diagnosisStr}
- Pain Areas Affected: ${painAreasStr}
- Treatment Visits: ${total_visits}
- Total Medical Charges: $${total_charges.toFixed(2)}
- Current Status: ${current_status}

Please provide:
1. A professional assessment of the case strength and damages potential
2. Research and identify 3-5 relevant case law precedents or similar injury awards that apply to this type of accident and these diagnoses
3. For each case, provide: case name, brief summary of facts, award range/result, and relevance to this patient's case

Format your response as JSON:
{
  "assessment": "Professional assessment paragraph",
  "relevant_cases": [
    {
      "case_name": "Case Name",
      "summary": "Summary of case facts and ruling",
      "award_range": "$X - $Y or specific amount",
      "relevance": "How this case applies to the patient's situation"
    }
  ]
}
`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          assessment: { type: "string" },
          relevant_cases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                case_name: { type: "string" },
                summary: { type: "string" },
                award_range: { type: "string" },
                relevance: { type: "string" },
              },
            },
          },
        },
      },
      model: "gemini_3_1_pro", // Use advanced model for legal research
    });

    return Response.json(res);
  } catch (error) {
    console.error('Error generating legal case summary:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
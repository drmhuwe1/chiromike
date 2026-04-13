import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { diagnosis, pain_findings, ortho_results, vital_signs } = await req.json();

    const orthoList = ortho_results?.map(t => `${t.test_name}: ${t.result}`).join(", ") || "None performed";

    const prompt = `Generate 3-4 specific, professional chiropractic treatment plans based on the following examination findings:

Diagnosis: ${diagnosis || "Not specified"}

Pain Findings:
- Cervical: ${pain_findings?.cervical_palpation || "Not assessed"}
- Thoracic: ${pain_findings?.thoracic_palpation || "Not assessed"}
- Lumbar: ${pain_findings?.lumbar_palpation || "Not assessed"}
- Sacroiliac: ${pain_findings?.sacroiliac || "Not assessed"}

Orthopedic Test Results: ${orthoList}

Vital Signs: Height ${vital_signs?.height || "-"}, Weight ${vital_signs?.weight || "-"} lbs, BMI ${vital_signs?.bmi || "-"}

For each plan, include:
- Frequency (visits per week)
- Duration (estimated weeks)
- Expected outcomes
- Any precautions or modifications

Format each plan on a new line, starting with "Plan X:" (e.g., "Plan 1: Conservative approach - 2x/week for 4 weeks...")`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          plans: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({ plans: res.plans || [] });
  } catch (error) {
    console.error('Treatment plan generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
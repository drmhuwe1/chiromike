import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      diagnoses,
      chief_complaint,
      pain_areas,
      accident_type,
      additional_context,
    } = await req.json();

    const dxStr = diagnoses && diagnoses.length > 0
      ? diagnoses.map(d => `${d.code} (${d.description || 'undiagnosed condition'})`).join('; ')
      : 'Not specified';
    const painStr = pain_areas && pain_areas.length > 0 ? pain_areas.join(', ') : 'Multiple areas';
    const complaintStr = chief_complaint || 'Musculoskeletal pain following personal injury';

    const prompt = `You are a chiropractic medical literature researcher. Find peer-reviewed, evidence-based medical literature supporting the necessity of chiropractic treatment for the following personal injury patient case. This documentation will be provided to a personal injury attorney to support treatment necessity.

PATIENT CASE:
- Chief Complaint: ${complaintStr}
- Mechanism of Injury: ${accident_type || 'Motor vehicle accident / personal injury'}
- Diagnoses (ICD-10): ${dxStr}
- Pain Areas: ${painStr}
- Additional Context: ${additional_context || 'Personal injury case requiring continued chiropractic care'}

INSTRUCTIONS:
Search peer-reviewed medical journals and clinical practice guidelines that establish:
1. The clinical efficacy of chiropractic manipulative therapy (CMT) for these specific injuries/diagnoses
2. Standard treatment duration and visit frequency for these conditions in personal injury cases
3. The causal link between the injury mechanism (e.g., MVA, whiplash) and the diagnosed musculoskeletal conditions
4. Functional restoration and pain reduction outcomes supported by research
5. The clinical rationale for the treatment course provided

PRIORITIZE sources that are:
- Recent articles — strongly prefer those published in the last 10 years (2016-present). Current year is 2026. When a recent article and an older article have similar relevance, prefer the more recent one. Only use older articles when they are landmark/seminal research or clinical practice guidelines still considered current.
- Peer-reviewed journals (e.g., J Manipulative Physiol Ther, Spine, Spine Journal, European Spine Journal, JCCA, Pain, BMC Musculoskelet Disord)
- Clinical practice guidelines (CCG, CCGI, American Chiropractic Association, American Pain Society)
- Systematic reviews, RCTs, cohort studies, or meta-analyses

For each article, ensure the 'year' field accurately reflects publication year. Sort the returned array by relevance_score descending, with recency used as a tiebreaker between equally relevant articles.

Return 5-8 most relevant articles in order of relevance. For each, fill out EVERY field — especially 'url', which must contain the article's direct DOI link (preferred, e.g., https://doi.org/10.xxxx/yyyy) or its full direct-access URL (PubMed, journal site, or publisher page). Do not use search-result landing pages; use the most direct link to the article itself.

The ama_citation must follow AMA Manual of Style format AND include the direct link at the end:
- With DOI:  "Smith J, Jones A, et al. Treatment of whiplash-associated disorders. J Manipulative Physiol Ther. 2019;42(3):145-153. doi:10.1016/j.jmpt.2018.10.004"
- Without DOI (include direct URL):  "Smith J, Jones A, et al. Treatment of whiplash-associated disorders. J Manipulative Physiol Ther. 2019;42(3):145-153. Available at: https://www.ncbi.nlm.nih.gov/pubmed/12345678"

Always append either "doi:..." or "Available at: <full URL>" at the end of the ama_citation — the citation must end with a clickable direct link, never with page numbers alone.

Format response as JSON. Do NOT include any explanation text outside the JSON object.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          articles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Exact article title' },
                authors: { type: 'string', description: "Author list, e.g., 'Smith J, Jones A, et al.'" },
                journal: { type: 'string', description: 'Full journal name' },
                year: { type: 'string' },
                volume_issue_pages: { type: 'string', description: "e.g., '42(3):145-153'" },
                url: { type: 'string', description: 'DOI or URL if available, otherwise empty string' },
                relevance_summary: { type: 'string', description: '1-2 sentences explaining how this article supports treatment necessity for THIS patient' },
                relevance_score: { type: 'number', description: '1-10 relevance rating' },
                ama_citation: { type: 'string', description: 'Complete AMA-formatted citation string' },
              },
            },
          },
        },
      },
    });

    return Response.json(res);
  } catch (error) {
    console.error('Error searching medical literature:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
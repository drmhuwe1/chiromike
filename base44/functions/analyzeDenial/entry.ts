import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const text = (value, fallback = 'Not available') => value || fallback;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const { claim_id } = await req.json();
    if (!claim_id) return Response.json({ error: 'claim_id is required' }, { status: 400 });

    const claims = await base44.asServiceRole.entities.Claim.filter({ id: claim_id });
    const claim = claims[0];
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    const [payments, patients, soapNotes, insurers, officeRows] = await Promise.all([
      base44.asServiceRole.entities.Payment.filter({ claim_id }),
      claim.patient_id ? base44.asServiceRole.entities.Patient.filter({ id: claim.patient_id }) : [],
      base44.asServiceRole.entities.SoapNote.filter({ patient_id: claim.patient_id }),
      claim.insurance_company ? base44.asServiceRole.entities.InsuranceCompany.filter({ name: claim.insurance_company }) : [],
      base44.asServiceRole.entities.OfficeSettings.list('-updated_date', 1),
    ]);

    const denial = payments.find((payment) => payment.payment_type === 'Denial' || payment.denial_code) || {};
    const patient = patients[0] || {};
    const soap = soapNotes
      .filter((note) => note.date_of_service === claim.date_of_service)
      .sort((a, b) => String(b.updated_date || '').localeCompare(String(a.updated_date || '')))[0] || {};
    const insurer = insurers[0] || {};
    const office = officeRows[0] || {};

    const appealAddress = [
      insurer.appeals_address_line1,
      insurer.appeals_address_line2,
      [insurer.appeals_city, insurer.appeals_state, insurer.appeals_zip].filter(Boolean).join(', '),
    ].filter(Boolean).join('\n');

    const prompt = `You are assisting a chiropractic billing office with a denied claim. Analyze only the supplied record. Never invent payer policy, clinical facts, addresses, deadlines, references, or documentation. Never recommend changing a CPT or diagnosis code merely to obtain payment. A coding change may be suggested only when the supplied documentation proves the original code was factually incorrect, and must be labeled for certified coding review. The final letter is a draft that requires provider review before submission.

<claim_record>
Patient: ${text(claim.patient_name)}
Member ID: ${text(claim.insurance_id)}
Date of birth: ${text(patient.dob || claim.insured_dob)}
Date of service: ${text(claim.date_of_service)}
Payer: ${text(claim.insurance_company)}
Plan: ${text(claim.insurance_plan)}
Claim total: ${claim.total_charge || 0}
Denial code: ${text(denial.denial_code)}
Denial reason: ${text(denial.denial_reason)}
Claim notes: ${text(claim.claim_notes)}
Diagnoses: ${(claim.diagnoses || []).map((item) => `${item.code} ${item.description || ''}`).join('; ') || 'Not available'}
Services: ${(claim.service_lines || []).map((item) => `${item.code}${item.modifier ? '-' + item.modifier : ''}, ${item.description || ''}, charge $${item.charge || 0}, dx pointers ${item.diagnosis_pointers || ''}`).join('; ') || 'Not available'}
SOAP subjective: ${text(soap.subjective)}
SOAP objective: ${text(soap.objective)}
SOAP assessment: ${text(soap.assessment)}
SOAP plan: ${text(soap.plan)}
Authorization: ${text(claim.authorization_number)}
Payer appeal filing limit: ${insurer.appeal_filing_days || 'Not available'}
</claim_record>

<office_record>
Practice: ${text(office.practice_name)}
Provider: ${text(office.rendering_provider)}
Address: ${[office.billing_address_line1, office.billing_city, office.billing_state, office.billing_zip].filter(Boolean).join(', ') || 'Not available'}
Phone: ${text(office.phone)}
Fax: ${text(office.fax)}
NPI: ${text(office.rendering_npi)}
</office_record>

Return a concise denial analysis, the strongest compliant next action, missing information, documents to attach, and a professional appeal/rebuttal letter. When facts are missing, insert [VERIFY: ...] in the letter instead of guessing. Do not cite a policy unless it exists in the supplied record.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          analysis_summary: { type: 'string' },
          recommended_action: { type: 'string' },
          missing_information: { type: 'array', items: { type: 'string' } },
          supporting_documents: { type: 'array', items: { type: 'string' } },
          appeal_letter: { type: 'string' },
        },
        required: ['analysis_summary', 'recommended_action', 'missing_information', 'supporting_documents', 'appeal_letter'],
      },
    });

    const appeal = await base44.asServiceRole.entities.DenialAppeal.create({
      claim_id,
      patient_id: claim.patient_id,
      patient_name: claim.patient_name,
      payer_name: claim.insurance_company,
      denial_code: denial.denial_code,
      denial_reason: denial.denial_reason,
      analysis_summary: result.analysis_summary,
      recommended_action: result.recommended_action,
      missing_information: result.missing_information || [],
      supporting_documents: result.supporting_documents || [],
      appeal_letter: result.appeal_letter,
      delivery_address: appealAddress,
      delivery_fax: insurer.appeals_fax || '',
      status: 'Ready for Review',
    });

    await base44.asServiceRole.entities.Claim.update(claim_id, { denial_response_status: 'Drafted' });
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email || 'unknown',
      action: 'AI_DENIAL_ANALYSIS_CREATED',
      resource_type: 'DenialAppeal',
      resource_id: appeal.id,
      resource_label: `${claim.patient_name} | DOS ${claim.date_of_service} | ${denial.denial_code || 'No denial code'}`,
    });

    return Response.json({ appeal });
  } catch (error) {
    console.error('Denial analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

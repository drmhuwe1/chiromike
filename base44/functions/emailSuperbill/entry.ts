import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { claim_id } = await req.json();
    if (!claim_id) return Response.json({ error: 'claim_id required' }, { status: 400 });

    // Fetch claim
    const claims = await base44.asServiceRole.entities.Claim.filter({ id: claim_id });
    const claim = claims[0];
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    // Fetch patient
    const patients = await base44.asServiceRole.entities.Patient.filter({ id: claim.patient_id });
    const patient = patients[0];
    if (!patient?.email) return Response.json({ error: 'Patient has no email address on file' }, { status: 400 });

    // Fetch office settings
    const settings = await base44.asServiceRole.entities.OfficeSettings.list("-updated_date", 1);
    const office = settings[0] || {};

    const practiceName = office.practice_name || 'Chiropractic Office';
    const dos = claim.date_of_service || '';
    const total = (claim.total_charge || 0).toFixed(2);
    const patientName = claim.patient_name || `${patient.first_name} ${patient.last_name}`;

    // Build service lines HTML
    const serviceLines = (claim.service_lines || []).map(line => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 6px;font-family:monospace;font-size:13px;">${line.code || ''}</td>
        <td style="padding:8px 6px;font-size:13px;">${line.description || ''}</td>
        <td style="padding:8px 6px;font-size:13px;text-align:center;">${line.modifier || ''}</td>
        <td style="padding:8px 6px;font-size:13px;text-align:center;">${line.units || 1}</td>
        <td style="padding:8px 6px;font-size:13px;text-align:right;">$${((line.charge || 0) * (line.units || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

    // Build diagnoses HTML
    const diagnoses = (claim.diagnoses || []).map((dx, i) => `
      <tr>
        <td style="padding:4px 6px;font-size:13px;">${i + 1}.</td>
        <td style="padding:4px 6px;font-family:monospace;font-size:13px;">${dx.code || ''}</td>
        <td style="padding:4px 6px;font-size:13px;">${dx.description || ''}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#1e293b;">

  <div style="text-align:center;border-bottom:2px solid #1e40af;padding-bottom:16px;margin-bottom:20px;">
    <h1 style="margin:0;font-size:22px;color:#1e40af;">${practiceName}</h1>
    ${office.billing_address_line1 ? `<p style="margin:4px 0;font-size:13px;color:#64748b;">${office.billing_address_line1}${office.billing_city ? `, ${office.billing_city}` : ''}${office.billing_state ? `, ${office.billing_state}` : ''} ${office.billing_zip || ''}</p>` : ''}
    ${office.phone ? `<p style="margin:4px 0;font-size:13px;color:#64748b;">Phone: ${office.phone}</p>` : ''}
    ${office.rendering_npi ? `<p style="margin:4px 0;font-size:13px;color:#64748b;">NPI: ${office.rendering_npi}</p>` : ''}
    ${office.ein_tax_id ? `<p style="margin:4px 0;font-size:13px;color:#64748b;">Tax ID: ${office.ein_tax_id}</p>` : ''}
  </div>

  <h2 style="text-align:center;font-size:18px;font-weight:bold;letter-spacing:1px;margin-bottom:20px;">SUPERBILL / RECEIPT</h2>

  <table style="width:100%;margin-bottom:20px;font-size:13px;">
    <tr>
      <td style="padding:4px 0;"><strong>Patient:</strong> ${patientName}</td>
      <td style="padding:4px 0;text-align:right;"><strong>Date of Service:</strong> ${dos}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;"><strong>DOB:</strong> ${patient.dob || '—'}</td>
      <td style="padding:4px 0;text-align:right;"><strong>Visit Type:</strong> ${claim.visit_type || '—'}</td>
    </tr>
    ${claim.insurance_company ? `<tr><td style="padding:4px 0;"><strong>Insurance:</strong> ${claim.insurance_company}</td><td style="padding:4px 0;text-align:right;"><strong>Member ID:</strong> ${claim.insurance_id || '—'}</td></tr>` : ''}
    ${claim.insurance_group ? `<tr><td colspan="2" style="padding:4px 0;"><strong>Group #:</strong> ${claim.insurance_group}</td></tr>` : ''}
  </table>

  ${diagnoses ? `
  <h3 style="font-size:14px;font-weight:bold;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">Diagnosis Codes (ICD-10)</h3>
  <table style="width:100%;margin-bottom:20px;">
    ${diagnoses}
  </table>` : ''}

  <h3 style="font-size:14px;font-weight:bold;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">Services Rendered</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="padding:8px 6px;text-align:left;font-size:12px;">CPT Code</th>
        <th style="padding:8px 6px;text-align:left;font-size:12px;">Description</th>
        <th style="padding:8px 6px;text-align:center;font-size:12px;">Mod</th>
        <th style="padding:8px 6px;text-align:center;font-size:12px;">Units</th>
        <th style="padding:8px 6px;text-align:right;font-size:12px;">Charge</th>
      </tr>
    </thead>
    <tbody>${serviceLines}</tbody>
  </table>

  <div style="text-align:right;margin-bottom:24px;">
    <div style="font-size:15px;"><strong>Total Charged: $${total}</strong></div>
    ${claim.amount_paid ? `<div style="font-size:13px;color:#64748b;">Amount Paid: $${(claim.amount_paid || 0).toFixed(2)}</div>` : ''}
  </div>

  ${office.rendering_provider ? `
  <div style="margin-top:30px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:12px;color:#64748b;">
    <strong>Rendering Provider:</strong> ${office.rendering_provider}
    ${office.rendering_npi ? ` &nbsp;|&nbsp; <strong>NPI:</strong> ${office.rendering_npi}` : ''}
    ${office.taxonomy_code ? ` &nbsp;|&nbsp; <strong>Taxonomy:</strong> ${office.taxonomy_code}` : ''}
  </div>` : ''}

  <p style="margin-top:20px;font-size:12px;color:#94a3b8;text-align:center;">
    Please submit this superbill to your insurance company for out-of-network reimbursement.<br>
    Keep a copy for your records.
  </p>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: patient.email,
      subject: `Superbill from ${practiceName} — ${dos}`,
      body: html,
    });

    // Update claim status
    await base44.asServiceRole.entities.Claim.update(claim_id, { status: 'Printed' });

    return Response.json({ success: true, sent_to: patient.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function buildRawEmail({ to, subject, htmlBody }) {
  const from = Deno.env.get('SUPERBILL_FROM_EMAIL') || 'Huwe Chiropractic <drmhuwe@huwechiropractic.com>';
  const replyTo = Deno.env.get('SUPERBILL_REPLY_TO') || 'drahuwe@gmail.com';
  const boundary = 'boundary_' + Math.random().toString(36).slice(2);
  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
  ].join('\r\n');
  return btoa(unescape(encodeURIComponent(mime)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { claim_id, include_hcfa } = await req.json();
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

    // Try to find insurance mailing address
    let insurerAddress = null;
    let insurerPortalUrl = null;
    let insurerPortalName = null;
    if (claim.insurance_company) {
      const insurers = await base44.asServiceRole.entities.InsuranceCompany.list("-name", 200);
      const insurer = insurers.find(i => i.name?.toLowerCase() === claim.insurance_company?.toLowerCase());
      if (insurer) {
        if (insurer.claims_address_line1) {
          insurerAddress = [
            insurer.claims_address_line1,
            insurer.claims_address_line2,
            [insurer.claims_city, insurer.claims_state, insurer.claims_zip].filter(Boolean).join(', ')
          ].filter(Boolean).join('<br>');
        }
        // Prefer provider_portal, fall back to website
        insurerPortalUrl = insurer.provider_portal || insurer.website || null;
        insurerPortalName = insurer.name || claim.insurance_company;
      }
    }

    // HTML-escape all user/clinic-supplied strings before interpolating into email body
    const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    const practiceName = esc(office.practice_name || 'Chiropractic Office');
    const dos = esc(claim.date_of_service || '');
    const total = (claim.total_charge || 0).toFixed(2);
    const patientName = esc(claim.patient_name || `${patient.first_name} ${patient.last_name}`);

    // Build service lines HTML
    const serviceLines = (claim.service_lines || []).map(line => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 6px;font-family:monospace;font-size:13px;">${esc(line.code)}</td>
        <td style="padding:8px 6px;font-size:13px;">${esc(line.description)}</td>
        <td style="padding:8px 6px;font-size:13px;text-align:center;">${esc(line.modifier)}</td>
        <td style="padding:8px 6px;font-size:13px;text-align:center;">${line.units || 1}</td>
        <td style="padding:8px 6px;font-size:13px;text-align:right;">$${((line.charge || 0) * (line.units || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

    // Build diagnoses HTML
    const diagnoses = (claim.diagnoses || []).map((dx, i) => `
      <tr>
        <td style="padding:4px 6px;font-size:13px;">${i + 1}.</td>
        <td style="padding:4px 6px;font-family:monospace;font-size:13px;">${esc(dx.code)}</td>
        <td style="padding:4px 6px;font-size:13px;">${esc(dx.description)}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#1e293b;">

  <div style="text-align:center;border-bottom:2px solid #1e40af;padding-bottom:16px;margin-bottom:20px;">
    <h1 style="margin:0;font-size:22px;color:#1e40af;">${practiceName}</h1>
    ${office.billing_address_line1 ? `<p style="margin:4px 0;font-size:13px;color:#64748b;">${esc(office.billing_address_line1)}${office.billing_city ? `, ${esc(office.billing_city)}` : ''}${office.billing_state ? `, ${esc(office.billing_state)}` : ''} ${esc(office.billing_zip)}</p>` : ''}
    ${office.phone ? `<p style="margin:4px 0;font-size:13px;color:#64748b;">Phone: ${esc(office.phone)}</p>` : ''}
    ${office.rendering_npi ? `<p style="margin:4px 0;font-size:13px;color:#64748b;">NPI: ${esc(office.rendering_npi)}</p>` : ''}
    ${office.ein_tax_id ? `<p style="margin:4px 0;font-size:13px;color:#64748b;">Tax ID: ${esc(office.ein_tax_id)}</p>` : ''}
  </div>

  <h2 style="text-align:center;font-size:18px;font-weight:bold;letter-spacing:1px;margin-bottom:20px;">SUPERBILL / RECEIPT</h2>

  <table style="width:100%;margin-bottom:20px;font-size:13px;">
    <tr>
      <td style="padding:4px 0;"><strong>Patient:</strong> ${patientName}</td>
      <td style="padding:4px 0;text-align:right;"><strong>Date of Service:</strong> ${dos}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;"><strong>DOB:</strong> ${esc(patient.dob) || '—'}</td>
      <td style="padding:4px 0;text-align:right;"><strong>Visit Type:</strong> ${esc(claim.visit_type) || '—'}</td>
    </tr>
    ${claim.insurance_company ? `<tr><td style="padding:4px 0;"><strong>Insurance:</strong> ${esc(claim.insurance_company)}</td><td style="padding:4px 0;text-align:right;"><strong>Member ID:</strong> ${esc(claim.insurance_id) || '—'}</td></tr>` : ''}
    ${claim.insurance_group ? `<tr><td colspan="2" style="padding:4px 0;"><strong>Group #:</strong> ${esc(claim.insurance_group)}</td></tr>` : ''}
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

  ${insurerAddress ? `
  <div style="margin-top:24px;border:2px dashed #cbd5e1;border-radius:8px;padding:16px;background:#f8fafc;">
    <p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;color:#1e40af;">📬 Mail Your Claim To:</p>
    <p style="margin:0;font-size:14px;line-height:1.8;">${esc(claim.insurance_company)}<br>${insurerAddress}</p>
    <p style="margin:8px 0 0 0;font-size:12px;color:#64748b;">Write your Member ID (${claim.insurance_id || '—'}) on the envelope and on the top of this superbill before mailing.</p>
  </div>` : `
  <div style="margin-top:24px;border:2px dashed #cbd5e1;border-radius:8px;padding:16px;background:#f8fafc;">
    <p style="margin:0 0 4px 0;font-size:13px;font-weight:bold;color:#1e40af;">📬 How to Submit for Reimbursement:</p>
    <p style="margin:0;font-size:12px;color:#475569;">Look on the back of your insurance card for the claims mailing address, or log in to your member portal and use the online claim submission option.</p>
  </div>`}

  <div style="margin-top:20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;">
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:bold;color:#1e40af;">📋 Step-by-Step Submission Instructions:</p>
    <ol style="margin:0;padding-left:18px;font-size:12px;color:#475569;line-height:2;">
      <li>Write your <strong>name and Member ID</strong> at the top of this superbill</li>
      <li><strong>Option A — Mail:</strong> Send this superbill to the address above with a completed member reimbursement form (available on your insurer's website)</li>
      <li><strong>Option B — Online:</strong> ${insurerPortalUrl ? `Log in to the <a href="${insurerPortalUrl}" style="color:#1e40af;font-weight:bold;">${insurerPortalName} Member Portal</a> → find "Submit a Claim" or "Member Reimbursement" → attach this superbill as a PDF` : 'Log in to your insurance member portal → find "Submit a Claim" or "Member Reimbursement" → attach this superbill as a PDF'}</li>
      <li><strong>Option C — App:</strong> Many insurers (including BCBS) have a mobile app where you can photograph and submit your superbill directly</li>
      <li>Keep a copy of everything you submit for your records</li>
    </ol>
    <p style="margin:10px 0 0 0;font-size:11px;color:#94a3b8;">Questions? Call the Member Services number on the back of your insurance card.</p>
  </div>

  <p style="margin-top:16px;font-size:11px;color:#94a3b8;text-align:center;">
    This superbill was generated by ${practiceName}. Keep a copy for your records.
  </p>

  ${include_hcfa ? `
  <!-- CMS-1500 HCFA FORM -->
  <div style="page-break-before:always;margin-top:40px;border-top:3px solid #1e40af;padding-top:20px;">
    <h2 style="text-align:center;font-size:16px;font-weight:bold;letter-spacing:1px;margin-bottom:4px;">CMS-1500 HEALTH INSURANCE CLAIM FORM</h2>
    <p style="text-align:center;font-size:11px;color:#64748b;margin-bottom:16px;">APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE (NUCC)</p>

    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <tr>
        <td style="border:1px solid #94a3b8;padding:4px 6px;width:50%;">
          <span style="font-size:9px;color:#64748b;">1. INSURANCE TYPE</span><br>
          <span style="font-size:10px;">${claim.visit_type === 'Auto' ? '☑ AUTO' : claim.visit_type?.includes('Cash') ? '☑ OTHER' : '☑ GROUP HEALTH PLAN'}</span>
        </td>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">1a. INSURED'S ID NUMBER</span><br>
          <strong>${claim.insurance_id || ''}</strong>
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">2. PATIENT'S NAME (Last, First, MI)</span><br>
          ${patientName}
        </td>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">3. PATIENT'S BIRTH DATE / SEX</span><br>
          ${patient.dob || ''} &nbsp; ${patient.sex || ''}
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">5. PATIENT'S ADDRESS</span><br>
          ${[patient.address_line1, patient.city, patient.state, patient.zip].filter(Boolean).join(', ')}
        </td>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">4. INSURED'S NAME</span><br>
          ${claim.insured_name || patientName}
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">6. PATIENT RELATIONSHIP TO INSURED</span><br>
          ${patient.relationship_to_insured || 'Self'}
        </td>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">7. INSURED'S ADDRESS / PHONE</span><br>
          ${office.billing_address_line1 || ''} &nbsp; ${office.phone || ''}
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">9. OTHER INSURED'S NAME</span><br>&nbsp;
        </td>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">11. INSURED'S POLICY/GROUP NUMBER</span><br>
          ${claim.insurance_group || ''}
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">10. IS PATIENT CONDITION RELATED TO:</span> &nbsp;
          a. Employment: ${claim.accident_type === 'Work' ? 'YES' : 'NO'} &nbsp;
          b. Auto Accident: ${claim.accident_type === 'Auto' ? 'YES' : 'NO'} &nbsp;
          c. Other: NO
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">11d. IS THERE ANOTHER HEALTH BENEFIT PLAN?</span> &nbsp; NO
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border:1px solid #94a3b8;padding:4px 6px;background:#f1f5f9;">
          <span style="font-size:9px;color:#64748b;">21. DIAGNOSIS CODES (ICD-10)</span><br>
          ${(claim.diagnoses || []).map((dx, i) => `${String.fromCharCode(65+i)}. ${dx.code} — ${dx.description}`).join(' &nbsp;|&nbsp; ')}
        </td>
      </tr>
    </table>

    <!-- Service Lines -->
    <table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px;">
      <thead>
        <tr style="background:#1e40af;color:white;">
          <th style="padding:5px 4px;text-align:left;border:1px solid #1e40af;">24A. DATE(S) OF SERVICE</th>
          <th style="padding:5px 4px;text-align:center;border:1px solid #1e40af;">B. POS</th>
          <th style="padding:5px 4px;text-align:left;border:1px solid #1e40af;">D. CPT CODE</th>
          <th style="padding:5px 4px;text-align:center;border:1px solid #1e40af;">E. MOD</th>
          <th style="padding:5px 4px;text-align:center;border:1px solid #1e40af;">F. DX PTR</th>
          <th style="padding:5px 4px;text-align:right;border:1px solid #1e40af;">G. UNITS</th>
          <th style="padding:5px 4px;text-align:right;border:1px solid #1e40af;">H. CHARGES</th>
        </tr>
      </thead>
      <tbody>
        ${(claim.service_lines || []).map(line => `
        <tr>
          <td style="padding:4px;border:1px solid #cbd5e1;">${line.date_of_service || dos}</td>
          <td style="padding:4px;border:1px solid #cbd5e1;text-align:center;">${claim.place_of_service || '11'}</td>
          <td style="padding:4px;border:1px solid #cbd5e1;font-family:monospace;font-weight:bold;">${line.code || ''}</td>
          <td style="padding:4px;border:1px solid #cbd5e1;text-align:center;">${line.modifier || ''}</td>
          <td style="padding:4px;border:1px solid #cbd5e1;text-align:center;">${line.diagnosis_pointers || ''}</td>
          <td style="padding:4px;border:1px solid #cbd5e1;text-align:right;">${line.units || 1}</td>
          <td style="padding:4px;border:1px solid #cbd5e1;text-align:right;">$${((line.charge || 0) * (line.units || 1)).toFixed(2)}</td>
        </tr>`).join('')}
        <tr style="background:#f1f5f9;font-weight:bold;">
          <td colspan="6" style="padding:5px 4px;border:1px solid #cbd5e1;text-align:right;">28. TOTAL CHARGE:</td>
          <td style="padding:5px 4px;border:1px solid #cbd5e1;text-align:right;">$${total}</td>
        </tr>
      </tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:4px;">
      <tr>
        <td style="border:1px solid #94a3b8;padding:4px 6px;width:50%;">
          <span style="font-size:9px;color:#64748b;">32. SERVICE FACILITY LOCATION</span><br>
          ${office.billing_address_line1 || ''}, ${office.billing_city || ''}, ${office.billing_state || ''} ${office.billing_zip || ''}
        </td>
        <td style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">33. BILLING PROVIDER & PHONE</span><br>
          ${office.billing_provider || office.rendering_provider || ''} &nbsp; ${office.phone || ''}<br>
          <span style="font-size:9px;color:#64748b;">NPI:</span> ${office.billing_npi || office.rendering_npi || ''} &nbsp;
          <span style="font-size:9px;color:#64748b;">Tax ID:</span> ${office.ein_tax_id || ''}
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border:1px solid #94a3b8;padding:4px 6px;">
          <span style="font-size:9px;color:#64748b;">31. SIGNATURE OF PHYSICIAN — </span>
          ${office.rendering_provider || ''} &nbsp;&nbsp; Date: ${dos}
        </td>
      </tr>
    </table>
    <p style="font-size:10px;color:#94a3b8;text-align:center;margin-top:8px;">This CMS-1500 form is provided for patient convenience. Submit to your insurer along with the superbill above.</p>
  </div>` : ''}

</body>
</html>`;

    const subject = include_hcfa
      ? `Superbill + CMS-1500 from ${practiceName} — ${dos}`
      : `Superbill from ${practiceName} — ${dos}`;

    // Send via Gmail connector from practice address
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const raw = buildRawEmail({ to: patient.email, subject, htmlBody: html });
    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    if (!gmailRes.ok) {
      const err = await gmailRes.json();
      throw new Error(err.error?.message || 'Gmail send failed');
    }

    // Update claim status
    await base44.asServiceRole.entities.Claim.update(claim_id, { status: 'Printed' });

    return Response.json({ success: true, sent_to: patient.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
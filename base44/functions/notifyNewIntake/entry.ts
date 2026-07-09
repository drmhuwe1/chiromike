import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // This function is invoked only by the platform's entity automation (server-side),
    // not from the public internet. Use service role — no user auth token is present.
    const body = await req.json();

    const patient = body.data;
    if (!patient) {
      return Response.json({ error: 'No patient data in payload' }, { status: 400 });
    }

    // Only notify for intake_form submissions
    if (patient.intake_source !== 'intake_form') {
      return Response.json({ skipped: true, reason: 'Not an intake_form submission' });
    }

    const reportEmail = Deno.env.get('REPORT_EMAIL') || Deno.env.get('SUPERBILL_REPLY_TO');
    const appUrl = Deno.env.get('APP_URL') || 'https://chiromike.org';
    const appName = Deno.env.get('APP_DISPLAY_NAME') || 'ChiroMike';

    if (!reportEmail) {
      console.warn('No REPORT_EMAIL set — skipping notification email');
      return Response.json({ skipped: true, reason: 'No report email configured' });
    }

    // HTML-escape user-supplied strings before interpolating into email body
    const esc = (str) => String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

    const patientName = esc(`${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown Patient');
    const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

    const emailBody = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff">
  <div style="background:#1d4ed8;color:#ffffff;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">🆕 New Patient Intake Received</h2>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px">
    <p style="margin-top:0;font-size:15px">A new patient has submitted their intake paperwork via the Huwe Chiropractic website.</p>
    
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#6b7280;width:140px">Patient Name</td><td style="padding:6px 0;font-weight:600">${patientName}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Date of Birth</td><td style="padding:6px 0">${esc(patient.dob) || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Phone</td><td style="padding:6px 0">${esc(patient.phone) || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0">${esc(patient.email) || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Chief Complaint</td><td style="padding:6px 0">${esc(patient.chief_complaint) || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Insurance</td><td style="padding:6px 0">${esc(patient.insurance_company) || 'Not provided'}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Submitted At</td><td style="padding:6px 0">${submittedAt} ET</td></tr>
    </table>

    <div style="margin-top:20px">
      <a href="${appUrl}/patients" 
         style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
        View Patient in ${appName} →
      </a>
    </div>

    <p style="margin-top:20px;font-size:12px;color:#9ca3af">
      This notification was sent automatically by ${appName} when a new patient completed the online intake form.
    </p>
  </div>
</div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: reportEmail,
      subject: `🆕 New Patient Intake: ${patientName} — ${submittedAt}`,
      body: emailBody,
    });

    console.log(`✓ Intake notification sent for patient: ${patientName} to ${reportEmail}`);
    return Response.json({ success: true, patient_name: patientName });

  } catch (error) {
    console.error('Intake notification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
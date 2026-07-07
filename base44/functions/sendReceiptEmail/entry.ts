import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { claim_id } = await req.json();

    if (!claim_id) {
      return Response.json({ error: 'Missing claim_id' }, { status: 400 });
    }

    // Fetch claim and patient data
    const claims = await base44.asServiceRole.entities.Claim.filter({ id: claim_id });
    const claim = claims[0];

    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    const patients = await base44.asServiceRole.entities.Patient.filter({ id: claim.patient_id });
    const patient = patients[0];

    // Always use the email on record — never trust the caller-supplied address
    const patient_email = patient?.email;
    if (!patient_email) {
      return Response.json({ error: 'No email address on file for this patient' }, { status: 400 });
    }

    const settings = await base44.asServiceRole.entities.OfficeSettings.list('-updated_date', 1);
    const office = settings[0];

    // Build receipt HTML
    const total = claim.total_charge || 0;
    const amountPaid = claim.amount_paid || 0;
    const balance = total - amountPaid;

    const receiptHtml = `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 18px; }
            .header p { margin: 4px 0; font-size: 11px; }
            .section { margin: 15px 0; padding: 10px 0; border-top: 1px solid #ccc; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
            .row.total { border-top: 2px solid #000; padding-top: 10px; font-weight: bold; font-size: 14px; }
            .row.paid { font-size: 11px; }
            .code { font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th { text-align: left; font-weight: bold; font-size: 10px; border-bottom: 1px solid #000; padding: 5px 0; }
            td { padding: 5px 0; font-size: 11px; border-bottom: 1px dotted #ccc; }
            .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #000; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${office?.practice_name || 'Huwe Chiropractic'}</h1>
            <p>${office?.billing_address_line1 || ''}</p>
            <p>${office?.billing_city || ''} ${office?.billing_state || ''} ${office?.billing_zip || ''}</p>
            <p>${office?.phone || ''}</p>
            ${office?.receipt_header ? `<p style="margin-top: 10px;">${office.receipt_header}</p>` : ''}
          </div>

          <div class="section">
            <h2 style="text-align: center; margin: 0;">RECEIPT</h2>
          </div>

          <div class="section">
            <div class="row">
              <span><strong>Patient:</strong></span>
              <span>${claim.patient_name}</span>
            </div>
            <div class="row">
              <span><strong>Date:</strong></span>
              <span>${claim.date_of_service}</span>
            </div>
            ${patient?.dob ? `<div class="row"><span><strong>DOB:</strong></span><span>${patient.dob}</span></div>` : ''}
          </div>

          ${claim.diagnoses?.length > 0 ? `
            <div class="section">
              <strong>Diagnoses:</strong>
              ${claim.diagnoses.map(dx => `<div class="row" style="margin-left: 10px;"><span class="code">${dx.code}</span><span>${dx.description}</span></div>`).join('')}
            </div>
          ` : ''}

          <div class="section">
            <strong>Services:</strong>
            <table>
              <thead>
                <tr>
                  <th style="width: 20%;">CODE</th>
                  <th style="width: 45%;">DESCRIPTION</th>
                  <th style="width: 15%; text-align: right;">QTY</th>
                  <th style="width: 20%; text-align: right;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${(claim.service_lines || []).map(line => `
                  <tr>
                    <td class="code">${line.code}</td>
                    <td>${line.description}</td>
                    <td style="text-align: right;">${line.units}</td>
                    <td style="text-align: right;">$${((line.charge || 0) * (line.units || 1)).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="row total">
              <span>TOTAL CHARGE</span>
              <span>$${total.toFixed(2)}</span>
            </div>
            <div class="row paid">
              <span>Amount Paid</span>
              <span>$${amountPaid.toFixed(2)}</span>
            </div>
            <div class="row total">
              <span>Balance Due</span>
              <span>$${balance.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Provider: ${office?.rendering_provider || ''}</p>
            ${office?.rendering_npi ? `<p>NPI: ${office.rendering_npi}</p>` : ''}
            ${office?.ein_tax_id ? `<p>Tax ID: ${office.ein_tax_id}</p>` : ''}
            ${office?.receipt_footer ? `<p style="margin-top: 10px;">${office.receipt_footer}</p>` : ''}
          </div>
        </body>
      </html>
    `;

    // Send email
    await base44.integrations.Core.SendEmail({
      to: patient_email,
      subject: `Receipt - ${claim.patient_name} - ${claim.date_of_service}`,
      body: receiptHtml,
      from_name: office?.practice_name || 'Huwe Chiropractic'
    });

    return Response.json({ 
      success: true, 
      sent_to: patient_email 
    });
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return Response.json({ error: error.message || 'Failed to send receipt' }, { status: 500 });
  }
});
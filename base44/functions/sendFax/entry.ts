import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { fax_number, patient_name, soap_note_id, claim_id, cover_note } = await req.json();

    if (!fax_number) return Response.json({ error: 'Fax number is required' }, { status: 400 });

    const username = Deno.env.get('FAXAGE_USERNAME');
    const password = Deno.env.get('FAXAGE_PASSWORD');
    const company = Deno.env.get('FAXAGE_COMPANY');

    if (!username || !password || !company) {
      return Response.json({ error: 'Faxage credentials not configured' }, { status: 500 });
    }

    // Gather all documents to compile into fax content
    const [settings] = await Promise.all([
      base44.asServiceRole.entities.OfficeSettings.list('-updated_date', 1),
    ]);
    const office = settings[0] || {};

    let soapNote = null;
    let claim = null;
    let patient = null;

    if (soap_note_id) {
      const notes = await base44.asServiceRole.entities.SoapNote.filter({ id: soap_note_id });
      soapNote = notes[0];
    }

    if (claim_id) {
      const claims = await base44.asServiceRole.entities.Claim.filter({ id: claim_id });
      claim = claims[0];
    }

    // Get patient from soap note or claim
    const patientId = soapNote?.patient_id || claim?.patient_id;
    if (patientId) {
      const patients = await base44.asServiceRole.entities.Patient.filter({ id: patientId });
      patient = patients[0];
    }

    // Build plain text fax document content
    const cleanFaxNumber = fax_number.replace(/\D/g, '');
    const now = new Date().toLocaleDateString('en-US');

    let faxContent = '';

    // Cover page
    faxContent += `FACSIMILE TRANSMISSION\n`;
    faxContent += `${'='.repeat(60)}\n`;
    faxContent += `FROM: ${office.practice_name || 'Chiropractic Office'}\n`;
    faxContent += `       ${office.billing_address_line1 || ''}\n`;
    if (office.billing_city) faxContent += `       ${office.billing_city}, ${office.billing_state} ${office.billing_zip}\n`;
    faxContent += `       Phone: ${office.phone || ''} | Fax: ${office.fax || ''}\n`;
    faxContent += `       NPI: ${office.rendering_npi || ''} | EIN: ${office.ein_tax_id || ''}\n\n`;
    faxContent += `TO FAX: ${fax_number}\n`;
    faxContent += `DATE: ${now}\n`;
    faxContent += `RE: Patient: ${patient ? patient.first_name + ' ' + patient.last_name : patient_name || 'Unknown'}\n`;
    if (patient?.dob) faxContent += `     DOB: ${patient.dob}\n`;
    if (patient?.insurance_id) faxContent += `     Member ID: ${patient.insurance_id}\n`;
    if (patient?.insurance_company) faxContent += `     Insurer: ${patient.insurance_company}\n`;
    if (patient?.accident_date) faxContent += `     Accident Date: ${patient.accident_date}\n`;
    faxContent += `\n`;
    if (cover_note) {
      faxContent += `NOTE: ${cover_note}\n\n`;
    }
    faxContent += `CONFIDENTIALITY NOTICE: This fax contains confidential protected health information (PHI) intended only for the recipient named above. If received in error, please destroy immediately and notify sender.\n`;
    faxContent += `${'='.repeat(60)}\n\n`;

    // SOAP Note section
    if (soapNote) {
      faxContent += `CHIROPRACTIC SOAP NOTE\n`;
      faxContent += `${'─'.repeat(60)}\n`;
      faxContent += `Patient: ${soapNote.patient_name}    Date of Service: ${soapNote.date_of_service}\n`;
      faxContent += `Visit Type: ${soapNote.visit_type}    Provider: ${soapNote.doctor_signature || office.rendering_provider || ''}\n`;
      if (soapNote.accident_related) {
        faxContent += `Accident Date: ${soapNote.accident_date}    Type: ${soapNote.accident_type}\n`;
      }
      if (soapNote.pain_scale_current != null) {
        faxContent += `Pain Scale: ${soapNote.pain_scale_current}/10\n`;
      }
      faxContent += `\n`;

      if (soapNote.diagnoses?.length) {
        faxContent += `DIAGNOSIS CODES:\n`;
        soapNote.diagnoses.forEach((d, i) => {
          faxContent += `  ${String.fromCharCode(65 + i)}. ${d.code} — ${d.description}\n`;
        });
        faxContent += `\n`;
      }

      faxContent += `S — SUBJECTIVE:\n${soapNote.subjective}\n\n`;
      faxContent += `O — OBJECTIVE:\n${soapNote.objective}\n\n`;
      faxContent += `A — ASSESSMENT:\n${soapNote.assessment}\n\n`;
      faxContent += `P — PLAN:\n${soapNote.plan}\n\n`;

      if (soapNote.procedures?.length) {
        faxContent += `PROCEDURES PERFORMED:\n`;
        soapNote.procedures.forEach(p => {
          faxContent += `  ${p.code} — ${p.description} (Units: ${p.units}${p.modifier ? ', Mod: ' + p.modifier : ''})\n`;
        });
        faxContent += `\n`;
      }

      faxContent += `Signed: ${soapNote.doctor_signature || office.rendering_provider || ''}    Date: ${soapNote.date_of_service}\n`;
      faxContent += `${'─'.repeat(60)}\n\n`;
    }

    // Claim / CMS-1500 section
    if (claim) {
      faxContent += `CMS-1500 / CLAIM SUMMARY\n`;
      faxContent += `${'─'.repeat(60)}\n`;
      faxContent += `Patient: ${claim.patient_name}    Date of Service: ${claim.date_of_service}\n`;
      faxContent += `Visit Type: ${claim.visit_type}    Payer: ${claim.payer_type}\n`;
      faxContent += `Insurance: ${claim.insurance_company || ''}    Member ID: ${claim.insurance_id || ''}\n`;
      faxContent += `Group #: ${claim.insurance_group || ''}    Auth #: ${claim.authorization_number || ''}\n`;
      faxContent += `Insured: ${claim.insured_name || ''}    Insured DOB: ${claim.insured_dob || ''}\n`;
      if (claim.accident_related) {
        faxContent += `Accident: YES    Date: ${claim.accident_date}    Type: ${claim.accident_type}\n`;
      }
      faxContent += `Place of Service: ${claim.place_of_service || '11'}\n\n`;

      if (claim.diagnoses?.length) {
        faxContent += `DIAGNOSES:\n`;
        claim.diagnoses.forEach((d, i) => {
          faxContent += `  ${i + 1}. ${d.code} — ${d.description}\n`;
        });
        faxContent += `\n`;
      }

      if (claim.service_lines?.length) {
        faxContent += `SERVICE LINES:\n`;
        faxContent += `  ${'Date'.padEnd(12)}${'CPT'.padEnd(10)}${'Mod'.padEnd(6)}${'Dx Ptr'.padEnd(8)}${'Charge'.padEnd(10)}Units\n`;
        faxContent += `  ${'─'.repeat(52)}\n`;
        claim.service_lines.forEach(l => {
          faxContent += `  ${(l.date_of_service || '').padEnd(12)}${(l.code || '').padEnd(10)}${(l.modifier || '').padEnd(6)}${(l.diagnosis_pointers || '').padEnd(8)}${'$' + (l.charge || 0).toFixed(2)}    ${l.units || 1}\n`;
        });
        faxContent += `\n`;
        faxContent += `  TOTAL CHARGE: $${(claim.total_charge || 0).toFixed(2)}\n`;
        if (claim.amount_paid) faxContent += `  AMOUNT PAID:  $${(claim.amount_paid || 0).toFixed(2)}\n`;
      }

      if (claim.claim_notes) {
        faxContent += `\nNOTES: ${claim.claim_notes}\n`;
      }

      faxContent += `\nRendering Provider: ${office.rendering_provider || ''}    NPI: ${office.rendering_npi || ''}\n`;
      faxContent += `Billing Provider: ${office.practice_name || ''}    NPI: ${office.billing_npi || ''}    EIN: ${office.ein_tax_id || ''}\n`;
      faxContent += `Taxonomy: ${office.taxonomy_code || ''}\n`;
      faxContent += `${'─'.repeat(60)}\n`;
    }

    faxContent += `\n--- END OF TRANSMISSION ---\n`;

    // Send via Faxage API using multipart form with text file
    const encoder = new TextEncoder();
    const fileBytes = encoder.encode(faxContent);

    const boundary = '----FaxageBoundary' + Date.now();
    const parts = [];

    const addField = (name, value) => {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
      );
    };

    addField('operation', 'sendfax');
    addField('username', username);
    addField('password', password);
    addField('company', company);
    addField('faxno', cleanFaxNumber);
    addField('faxfilename[]', 'patient_file.txt');

    const headerPart = `--${boundary}\r\nContent-Disposition: form-data; name="faxfile[]"; filename="patient_file.txt"\r\nContent-Type: text/plain\r\n\r\n`;
    const footerPart = `\r\n--${boundary}--\r\n`;

    const headerBytes = encoder.encode(headerPart);
    const footerBytes = encoder.encode(footerPart);
    const partsBytes = encoder.encode(parts.join(''));

    const body = new Uint8Array(partsBytes.length + headerBytes.length + fileBytes.length + footerBytes.length);
    body.set(partsBytes, 0);
    body.set(headerBytes, partsBytes.length);
    body.set(fileBytes, partsBytes.length + headerBytes.length);
    body.set(footerBytes, partsBytes.length + headerBytes.length + fileBytes.length);

    const faxResponse = await fetch('https://api.faxage.com/httpsfax.php', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });

    const responseText = await faxResponse.text();

    // Faxage returns "JOBID=xxxxx" on success or "ERROR=..." on failure
    if (responseText.includes('ERROR')) {
      return Response.json({ error: 'Faxage error: ' + responseText }, { status: 400 });
    }

    const jobIdMatch = responseText.match(/JOBID=(\S+)/);
    const jobId = jobIdMatch ? jobIdMatch[1] : responseText.trim();

    return Response.json({ success: true, job_id: jobId, fax_number: cleanFaxNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
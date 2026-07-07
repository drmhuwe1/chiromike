import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { fax_number, patient_name, documents, cover_note } = await req.json();

    if (!fax_number || !documents || documents.length === 0) {
      return Response.json({ error: 'Fax number and at least one document required' }, { status: 400 });
    }

    const username = Deno.env.get('FAXAGE_USERNAME');
    const password = Deno.env.get('FAXAGE_PASSWORD');
    const company = Deno.env.get('FAXAGE_COMPANY');

    if (!username || !password || !company) {
      return Response.json({ error: 'Faxage credentials not configured' }, { status: 500 });
    }

    const [settings] = await Promise.all([
      base44.asServiceRole.entities.OfficeSettings.list('-updated_date', 1),
    ]);
    const office = settings[0] || {};

    const cleanFaxNumber = fax_number.replace(/\D/g, '');
    const now = new Date().toLocaleDateString('en-US');

    let faxContent = '';

    // Build cover page
    faxContent += `FACSIMILE TRANSMISSION\n`;
    faxContent += `${'='.repeat(60)}\n`;
    faxContent += `FROM: ${office.practice_name || 'Chiropractic Office'}\n`;
    faxContent += `       ${office.billing_address_line1 || ''}\n`;
    if (office.billing_city) faxContent += `       ${office.billing_city}, ${office.billing_state} ${office.billing_zip}\n`;
    faxContent += `       Phone: ${office.phone || ''} | Fax: ${office.fax || ''}\n`;
    faxContent += `       NPI: ${office.rendering_npi || ''} | EIN: ${office.ein_tax_id || ''}\n\n`;
    faxContent += `TO FAX: ${fax_number}\n`;
    faxContent += `DATE: ${now}\n`;
    faxContent += `RE: PATIENT FILE — ${patient_name}\n`;
    faxContent += `\nDOCUMENTS ENCLOSED:\n`;

    // Fetch all requested documents
    const fetchedDocs = [];
    for (const doc of documents) {
      let docData = null;
      if (doc.type === 'soap') {
        const notes = await base44.asServiceRole.entities.SoapNote.filter({ id: doc.id });
        docData = notes[0];
      } else if (doc.type === 'exam') {
        const exams = await base44.asServiceRole.entities.NewPatientExam.filter({ id: doc.id });
        docData = exams[0];
      } else if (doc.type === 'claim') {
        const claims = await base44.asServiceRole.entities.Claim.filter({ id: doc.id });
        docData = claims[0];
      }
      if (docData) fetchedDocs.push({ type: doc.type, data: docData });
    }

    // Add document list to cover
    fetchedDocs.forEach((doc, i) => {
      if (doc.type === 'soap') {
        faxContent += `  ${i + 1}. SOAP Note — ${doc.data.date_of_service}\n`;
      } else if (doc.type === 'exam') {
        faxContent += `  ${i + 1}. New Patient Exam — ${doc.data.date_of_exam}\n`;
      } else if (doc.type === 'claim') {
        faxContent += `  ${i + 1}. CMS-1500 Claim Summary — ${doc.data.date_of_service}\n`;
      }
    });

    if (cover_note) {
      faxContent += `\nCOVER NOTE:\n${cover_note}\n`;
    }

    faxContent += `\n${'─'.repeat(60)}\n`;
    faxContent += `CONFIDENTIALITY NOTICE: This fax contains confidential protected health information (PHI) intended only for the recipient named above. If received in error, please destroy immediately and notify sender.\n`;
    faxContent += `${'='.repeat(60)}\n\n`;

    // Compile each document
    fetchedDocs.forEach((doc, idx) => {
      if (doc.type === 'soap') {
        const note = doc.data;
        faxContent += `\nDOCUMENT ${idx + 1}: SOAP NOTE\n`;
        faxContent += `${'─'.repeat(60)}\n`;
        faxContent += `Patient: ${note.patient_name}    Date: ${note.date_of_service}\n`;
        faxContent += `Visit Type: ${note.visit_type}    Provider: ${note.doctor_signature || office.rendering_provider || ''}\n`;
        if (note.accident_related) {
          faxContent += `Accident Related: YES (${note.accident_date}, ${note.accident_type})\n`;
        }
        if (note.pain_scale_current != null) {
          faxContent += `Pain Scale: ${note.pain_scale_current}/10\n`;
        }
        faxContent += `\nDIAGNOSES:\n`;
        (note.diagnoses || []).forEach((d, i) => {
          faxContent += `  ${String.fromCharCode(65 + i)}. ${d.code} — ${d.description}\n`;
        });
        faxContent += `\nS — SUBJECTIVE:\n${note.subjective}\n\n`;
        faxContent += `O — OBJECTIVE:\n${note.objective}\n\n`;
        faxContent += `A — ASSESSMENT:\n${note.assessment}\n\n`;
        faxContent += `P — PLAN:\n${note.plan}\n`;
        if (note.procedures?.length) {
          faxContent += `\nPROCEDURES:\n`;
          note.procedures.forEach(p => {
            faxContent += `  ${p.code} — ${p.description} (${p.units} units)\n`;
          });
        }
        faxContent += `\nSigned: ${note.doctor_signature || office.rendering_provider || ''} — ${note.date_of_service}\n`;
        faxContent += `${'─'.repeat(60)}\n`;
      } else if (doc.type === 'exam') {
        const exam = doc.data;
        faxContent += `\nDOCUMENT ${idx + 1}: NEW PATIENT EXAM\n`;
        faxContent += `${'─'.repeat(60)}\n`;
        faxContent += `Patient: ${exam.patient_name}    Date: ${exam.date_of_exam}\n`;
        faxContent += `Examiner: ${exam.examiner_name || ''}\n\n`;

        if (exam.vital_signs) {
          faxContent += `VITAL SIGNS:\n`;
          const vs = exam.vital_signs;
          if (vs.height) faxContent += `  Height: ${vs.height}\n`;
          if (vs.weight) faxContent += `  Weight: ${vs.weight} lbs\n`;
          if (vs.bmi) faxContent += `  BMI: ${vs.bmi}\n`;
          if (vs.bp) faxContent += `  BP: ${vs.bp}\n`;
          if (vs.hr) faxContent += `  Heart Rate: ${vs.hr} bpm\n`;
          if (vs.temp) faxContent += `  Temp: ${vs.temp}°F\n`;
          faxContent += `\n`;
        }

        if (exam.posture_gait) {
          faxContent += `POSTURE & GAIT:\n${exam.posture_gait}\n\n`;
        }

        if (exam.cervical_rom) {
          faxContent += `CERVICAL ROM:\n`;
          const crom = exam.cervical_rom;
          Object.entries(crom).forEach(([k, v]) => {
            if (v) faxContent += `  ${k}: ${v}\n`;
          });
          faxContent += `\n`;
        }

        if (exam.lumbar_rom) {
          faxContent += `LUMBAR ROM:\n`;
          const lrom = exam.lumbar_rom;
          Object.entries(lrom).forEach(([k, v]) => {
            if (v) faxContent += `  ${k}: ${v}\n`;
          });
          faxContent += `\n`;
        }

        if (exam.orthopedic_tests?.length) {
          faxContent += `ORTHOPEDIC TESTS:\n`;
          exam.orthopedic_tests.forEach(t => {
            faxContent += `  ${t.test_name}: ${t.result}${t.notes ? ' (' + t.notes + ')' : ''}\n`;
          });
          faxContent += `\n`;
        }

        if (exam.neurological_findings) {
          faxContent += `NEUROLOGICAL EXAM:\n`;
          const neuro = exam.neurological_findings;
          Object.entries(neuro).forEach(([k, v]) => {
            if (v) faxContent += `  ${k}: ${v}\n`;
          });
          faxContent += `\n`;
        }

        if (exam.palpation_findings) {
          faxContent += `PALPATION FINDINGS:\n`;
          const palp = exam.palpation_findings;
          Object.entries(palp).forEach(([k, v]) => {
            if (v) faxContent += `  ${k}: ${v}\n`;
          });
          faxContent += `\n`;
        }

        if (exam.imaging_findings) {
          faxContent += `IMAGING:\n${exam.imaging_findings}\n\n`;
        }

        if (exam.clinical_impression) {
          faxContent += `CLINICAL IMPRESSION:\n${exam.clinical_impression}\n\n`;
        }

        if (exam.treatment_plan) {
          faxContent += `TREATMENT PLAN & PROGNOSIS:\n${exam.treatment_plan}\n`;
        }

        faxContent += `\nExaminer: ${exam.examiner_name || office.rendering_provider || ''} — ${exam.date_of_exam}\n`;
        faxContent += `${'─'.repeat(60)}\n`;
      } else if (doc.type === 'claim') {
        const claim = doc.data;
        faxContent += `\nDOCUMENT ${idx + 1}: CMS-1500 CLAIM SUMMARY\n`;
        faxContent += `${'─'.repeat(60)}\n`;
        faxContent += `Patient: ${claim.patient_name}    DOS: ${claim.date_of_service}\n`;
        faxContent += `Visit Type: ${claim.visit_type}    Payer: ${claim.payer_type}\n`;
        faxContent += `Insurance: ${claim.insurance_company || ''}    ID: ${claim.insurance_id || ''}\n`;
        faxContent += `Insured: ${claim.insured_name || ''}    DOB: ${claim.insured_dob || ''}\n`;
        if (claim.accident_related) {
          faxContent += `Accident: ${claim.accident_date} (${claim.accident_type})\n`;
        }
        faxContent += `\nDIAGNOSES:\n`;
        (claim.diagnoses || []).forEach((d, i) => {
          faxContent += `  ${i + 1}. ${d.code} — ${d.description}\n`;
        });
        faxContent += `\nSERVICE LINES:\n`;
        faxContent += `  ${'Date'.padEnd(12)}${'CPT'.padEnd(10)}${'Mod'.padEnd(6)}${'Dx'.padEnd(8)}${'Charge'.padEnd(10)}Units\n`;
        faxContent += `  ${'─'.repeat(52)}\n`;
        (claim.service_lines || []).forEach(l => {
          faxContent += `  ${(l.date_of_service || '').padEnd(12)}${(l.code || '').padEnd(10)}${(l.modifier || '').padEnd(6)}${(l.diagnosis_pointers || '').padEnd(8)}${'$' + (l.charge || 0).toFixed(2)}    ${l.units || 1}\n`;
        });
        faxContent += `\n  TOTAL: $${(claim.total_charge || 0).toFixed(2)}\n`;
        if (claim.amount_paid) faxContent += `  PAID: $${claim.amount_paid.toFixed(2)}\n`;
        if (claim.claim_notes) faxContent += `\nNOTES: ${claim.claim_notes}\n`;
        faxContent += `\nBilling: ${office.practice_name} | NPI: ${office.billing_npi || ''} | EIN: ${office.ein_tax_id || ''}\n`;
        faxContent += `${'─'.repeat(60)}\n`;
      }
    });

    faxContent += `\n--- END OF TRANSMISSION ---\n`;

    // Send via Faxage
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
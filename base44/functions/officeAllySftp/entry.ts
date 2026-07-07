import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import SftpClient from 'npm:pure-js-sftp@5.0.0';

function decryptPassword(encrypted) {
  const key = Deno.env.get('OFFICEALLY_ENCRYPTION_KEY') || '';
  if (!key) throw new Error('OFFICEALLY_ENCRYPTION_KEY is not configured.');
  const decoded = atob(encrypted);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

function ediDate() { return new Date().toISOString().slice(0, 10).replace(/-/g, ''); }
function formatDate(d) { return d ? String(d).replace(/-/g, '') : ''; }
function ediTime() { return new Date().toISOString().slice(11, 16).replace(':', ''); }

function pad(val, len, char = ' ') {
  const s = String(val || '').slice(0, len);
  return s.padEnd(len, char);
}

function validateClaim(claim, patient) {
  const errors = [];
  if (!patient.last_name || !patient.first_name) errors.push('Patient first/last name required');
  if (!patient.dob) errors.push('Patient date of birth is required');
  if (!patient.address_line1) errors.push('Patient address is required');
  if (!claim.date_of_service) errors.push('Date of service is required');
  if (!claim.insurance_company) errors.push('Insurance company is required');
  if (!claim.insurance_id) errors.push('Subscriber/Member ID is required');
  if (!claim.diagnoses || claim.diagnoses.length === 0) errors.push('At least one diagnosis code is required');
  if (!claim.service_lines || claim.service_lines.length === 0) errors.push('At least one service line is required');
  (claim.service_lines || []).forEach((line, i) => {
    if (!line.code) errors.push(`Service line ${i + 1}: CPT code missing`);
    if (!line.charge || line.charge <= 0) errors.push(`Service line ${i + 1}: Charge must be > $0`);
    if (!line.diagnosis_pointers) errors.push(`Service line ${i + 1}: Diagnosis pointer required`);
  });
  return errors;
}

function build837P(claim, patient, office, oaSettings, icn) {
  const seg = [];
  const gcn = icn.slice(-4);
  const billingNpi = oaSettings?.billing_npi || office.billing_npi || office.rendering_npi || '';
  const billingName = (oaSettings?.practice_name || office.billing_provider || office.rendering_provider || 'HUWE CHIROPRACTIC').toUpperCase();
  const renderingNpi = office.rendering_npi || billingNpi;
  const ein = ((oaSettings?.ein_tax_id || office.ein_tax_id) || '').replace(/[^0-9]/g, '');
  const submitterId = oaSettings?.submitter_id || billingNpi;
  const patLast = (patient.last_name || '').toUpperCase();
  const patFirst = (patient.first_name || '').toUpperCase();
  const insuredName = (claim.insured_name || `${patient.first_name} ${patient.last_name}`).toUpperCase().split(' ');
  const insLast = insuredName.slice(0, -1).join(' ') || patLast;
  const insFirst = insuredName[insuredName.length - 1] || patFirst;

  seg.push(`ISA*00*          *00*          *ZZ*${pad(submitterId, 15)}*ZZ*OFFICEALLY     *${ediDate().slice(2)}*${ediTime()}*^*00501*${icn}*0*P*:`);
  seg.push(`GS*HC*${submitterId}*OFFICEALLY*${ediDate()}*${ediTime()}*${gcn}*X*005010X222A1`);
  seg.push(`ST*837*0001*005010X222A1`);
  seg.push(`BHT*0019*00*${icn}*${ediDate()}*${ediTime()}*CH`);
  seg.push(`NM1*41*2*${billingName}*****46*${submitterId}`);
  seg.push(`PER*IC*${office.rendering_provider?.toUpperCase() || 'BILLING CONTACT'}*TE*${(office.phone || '').replace(/\D/g, '')}`);
  seg.push(`NM1*40*2*OFFICE ALLY*****46*XX`);
  seg.push(`HL*1**20*1`);
  seg.push(`PRV*BI*PXC*${office.taxonomy_code || '111N00000X'}`);
  seg.push(`NM1*85*2*${billingName}*****XX*${billingNpi}`);
  seg.push(`N3*${oaSettings?.address_line1 || office.billing_address_line1 || ''}`);
  seg.push(`N4*${oaSettings?.city || office.billing_city || ''}*${oaSettings?.state || office.billing_state || ''}*${oaSettings?.zip || office.billing_zip || ''}`);
  seg.push(`REF*EI*${ein}`);
  seg.push(`HL*2*1*22*1`);
  seg.push(`SBR*P*${patient.relationship_to_insured === 'Self' ? '18' : '01'}*${claim.insurance_group || ''}*${claim.insurance_company || ''}*****CI`);
  seg.push(`NM1*IL*1*${insLast}*${insFirst}****MI*${claim.insurance_id || ''}`);
  seg.push(`N3*${patient.address_line1 || ''}`);
  seg.push(`N4*${patient.city || ''}*${patient.state || ''}*${patient.zip || ''}`);
  seg.push(`DMG*D8*${formatDate(patient.dob)}*${(patient.sex || 'U')[0]}`);
  seg.push(`NM1*PR*2*${(claim.insurance_company || 'INSURANCE').toUpperCase()}*****PI*${claim.insurance_id || ''}`);
  seg.push(`CLM*${claim.id?.slice(-10) || icn}*${(claim.total_charge || 0).toFixed(2)}***${claim.place_of_service || '11'}:B:1*Y*A*Y*I`);
  if (claim.accident_related && claim.accident_date) {
    const accType = claim.accident_type === 'Auto' ? 'AA' : claim.accident_type === 'Work' ? 'EM' : 'OT';
    seg.push(`DTP*${accType === 'EM' ? '431' : '050'}*D8*${formatDate(claim.accident_date)}`);
  }
  if (claim.referring_provider) {
    seg.push(`NM1*DN*1*${claim.referring_provider.toUpperCase().split(' ').join('*')}****MD*${claim.referring_npi || ''}`);
  }
  seg.push(`NM1*82*1*${(office.rendering_provider || '').toUpperCase().split(' ').reverse().join('*')}****XX*${renderingNpi}`);
  seg.push(`PRV*PE*PXC*${office.taxonomy_code || '111N00000X'}`);
  const dxCodes = (claim.diagnoses || []).map(d => d.code?.replace('.', '')).filter(Boolean);
  if (dxCodes.length > 0) seg.push(`HI*${dxCodes.map(c => `ABK:${c}`).join('*')}`);
  (claim.service_lines || []).forEach((line, idx) => {
    const lineTotal = ((line.charge || 0) * (line.units || 1)).toFixed(2);
    const lineDos = formatDate(line.date_of_service || claim.date_of_service);
    seg.push(`LX*${idx + 1}`);
    const modStr = line.modifier ? `*${line.modifier}` : '';
    seg.push(`SV1*HC:${line.code || ''}${modStr}*${lineTotal}*UN*${line.units || 1}**${line.diagnosis_pointers || '1'}`);
    seg.push(`DTP*472*D8*${lineDos}`);
  });
  seg.push(`SE*${seg.length + 1}*0001`);
  seg.push(`GE*1*${gcn}`);
  seg.push(`IEA*1*${icn}`);
  return seg.join('\n');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    // Confirm Office Ally File ID after manual upload
    if (action === 'confirm_file_id') {
      const { batch_id, office_ally_file_id } = body;
      if (!batch_id || !office_ally_file_id) {
        return Response.json({ error: 'batch_id and office_ally_file_id required' }, { status: 400 });
      }
      await base44.asServiceRole.entities.OfficeAllyBatch.update(batch_id, { office_ally_file_id });
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'Confirmed Office Ally File ID after manual upload',
        resource_type: 'OfficeAllyBatch',
        resource_id: batch_id,
        resource_label: `File ID: ${office_ally_file_id}`
      });
      return Response.json({ success: true });
    }

    // Update claim status (admin review)
    if (action === 'update_claim_status') {
      const { claim_id, new_status } = body;
      if (!claim_id || !new_status) {
        return Response.json({ error: 'claim_id and new_status required' }, { status: 400 });
      }
      const validStatuses = [
        'Draft', 'Ready to Submit', 'Exported for Office Ally',
        'Submitted to Office Ally', 'Accepted', 'Rejected', 'Paid', 'Needs Review'
      ];
      if (!validStatuses.includes(new_status)) {
        return Response.json({ error: 'Invalid status value' }, { status: 400 });
      }
      await base44.asServiceRole.entities.Claim.update(claim_id, { status: new_status });
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: `Updated claim status to: ${new_status}`,
        resource_type: 'Claim',
        resource_id: claim_id,
        resource_label: `Status: ${new_status}`
      });
      return Response.json({ success: true });
    }

    // Direct SFTP submit using pure-js-sftp (zero native dependencies)
    if (action === 'sftp_submit') {
      const { claim_ids } = body;
      if (!claim_ids || claim_ids.length === 0) {
        return Response.json({ error: 'claim_ids required' }, { status: 400 });
      }

      const [officeArr, oaArr] = await Promise.all([
        base44.asServiceRole.entities.OfficeSettings.list('-updated_date', 1),
        base44.asServiceRole.entities.OfficeAllySettings.list('-updated_date', 1),
      ]);
      const office = officeArr[0] || {};
      const oaSettings = oaArr[0];

      if (!oaSettings?.sftp_configured || !oaSettings?.sftp_password_encrypted) {
        return Response.json({ error: 'SFTP credentials not configured in Office Ally Settings.' }, { status: 400 });
      }
      if (!oaSettings.sftp_host || !oaSettings.sftp_username) {
        return Response.json({ error: 'SFTP host and username are required.' }, { status: 400 });
      }

      // Fetch + validate all claims
      const claimsData = [];
      for (const cid of claim_ids) {
        const cArr = await base44.asServiceRole.entities.Claim.filter({ id: cid });
        const claim = cArr[0];
        if (!claim) return Response.json({ error: `Claim ${cid} not found` }, { status: 404 });
        const pArr = await base44.asServiceRole.entities.Patient.filter({ id: claim.patient_id });
        const patient = pArr[0] || {};
        const errors = validateClaim(claim, patient);
        if (errors.length > 0) {
          return Response.json({ error: 'Claim validation failed', claim_id: cid, validation_errors: errors }, { status: 422 });
        }
        claimsData.push({ claim, patient });
      }

      const icn = String(Date.now()).slice(-9);
      const timestamp = new Date().toISOString();
      const filename = claimsData.length > 1
        ? `batch_${claim_ids.length}claims_${ediDate()}_${icn}.edi`
        : `OA_${claimsData[0].claim.patient_name?.replace(/\s+/g, '_')}_${claimsData[0].claim.date_of_service || ediDate()}.edi`;

      const ediContent = build837P(claimsData[0].claim, claimsData[0].patient, office, oaSettings, icn);
      const sftpPassword = decryptPassword(oaSettings.sftp_password_encrypted);
      const inboundFolder = (oaSettings.sftp_inbound_folder || '/inbound').replace(/\/$/, '');
      const remotePath = `${inboundFolder}/${filename}`;

      let uploadSuccess = false;
      let sftpResult = '';

      const sftp = new SftpClient();
      try {
        await sftp.connect({
          host: oaSettings.sftp_host,
          port: parseInt(oaSettings.sftp_port || '22', 10),
          username: oaSettings.sftp_username,
          password: sftpPassword,
        });
        const encoder = new TextEncoder();
        const fileBuffer = Buffer.from(encoder.encode(ediContent));
        await sftp.put(fileBuffer, remotePath);
        await sftp.end();
        uploadSuccess = true;
        sftpResult = `Uploaded to ${remotePath}`;
        console.log('SFTP upload success:', remotePath);
      } catch (sftpErr) {
        console.error('SFTP upload failed:', sftpErr.message);
        sftpResult = `SFTP upload failed: ${sftpErr.message}`;
        uploadSuccess = false;
        try { await sftp.end(); } catch (_) { /* ignore */ }
      }

      // Update claim statuses
      for (const { claim } of claimsData) {
        if (uploadSuccess) {
          await base44.asServiceRole.entities.Claim.update(claim.id, { status: 'Submitted to Office Ally' });
        }
      }

      const batch = await base44.asServiceRole.entities.OfficeAllyBatch.create({
        batch_filename: filename,
        claim_ids,
        claim_count: claim_ids.length,
        submission_mode: 'Direct SFTP',
        submitted_at: timestamp,
        submitted_by: user.email,
        status: uploadSuccess ? 'Submitted via SFTP' : 'Failed',
        sftp_result: sftpResult
      });

      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: uploadSuccess ? 'Submitted 837P via SFTP to Office Ally' : 'SFTP submission to Office Ally FAILED',
        resource_type: 'OfficeAllyBatch',
        resource_id: batch.id,
        resource_label: filename,
        ip_note: `Host: ${oaSettings.sftp_host} | Result: ${sftpResult}`
      });

      if (!uploadSuccess) {
        return Response.json({ error: sftpResult, batch_id: batch.id }, { status: 500 });
      }
      return Response.json({ success: true, filename, batch_id: batch.id, sftp_result: sftpResult });
    }

    // Check SFTP outbound for response files (999, 277, 835)
    if (action === 'check_reports') {
      const oaArr = await base44.asServiceRole.entities.OfficeAllySettings.list('-updated_date', 1);
      const oaSettings = oaArr[0];
      if (!oaSettings?.sftp_configured) {
        return Response.json({ error: 'SFTP not configured.' }, { status: 400 });
      }

      const sftpPassword = decryptPassword(oaSettings.sftp_password_encrypted);
      const outboundFolder = (oaSettings.sftp_outbound_folder || '/outbound').replace(/\/$/, '');
      const sftp = new SftpClient();
      const reports = [];

      try {
        await sftp.connect({
          host: oaSettings.sftp_host,
          port: parseInt(oaSettings.sftp_port || '22', 10),
          username: oaSettings.sftp_username,
          password: sftpPassword,
        });

        const fileList = await sftp.list(outboundFolder);
        const reportExts = ['.edi', '.txt', '.835', '.277', '.999', '.997'];
        const relevant = fileList.filter(f => reportExts.some(ext => f.name.toLowerCase().endsWith(ext))).slice(0, 30);

        for (const file of relevant) {
          const remotePath = `${outboundFolder}/${file.name}`;
          let content = '';
          try {
            const buf = await sftp.get(remotePath);
            content = buf.toString().slice(0, 5000);
          } catch (_) { content = '[Could not read file]'; }

          const rtype = file.name.includes('999') || file.name.includes('997') ? '999'
            : file.name.includes('277') ? '277'
            : file.name.includes('835') ? '835'
            : file.name.toLowerCase().includes('summary') ? 'Summary' : 'Other';

          const existing = await base44.asServiceRole.entities.OfficeAllyReport.filter({ filename: file.name });
          if (existing.length === 0) {
            await base44.asServiceRole.entities.OfficeAllyReport.create({
              filename: file.name,
              report_type: rtype,
              retrieved_at: new Date().toISOString(),
              content_preview: content.slice(0, 1000),
              raw_content: content
            });
          }
          reports.push({ name: file.name, type: rtype, size: file.size });
        }

        await sftp.end();
      } catch (err) {
        console.error('SFTP check_reports error:', err.message);
        try { await sftp.end(); } catch (_) { /* ignore */ }
        return Response.json({ error: `SFTP error: ${err.message}` }, { status: 500 });
      }

      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'Checked Office Ally SFTP outbound for response reports',
        resource_type: 'OfficeAllyReport',
        resource_label: `${reports.length} files found`
      });

      return Response.json({ success: true, reports });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('officeAllySftp error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
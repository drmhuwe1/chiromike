import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function pad(val, len, char = ' ') {
  const s = String(val || '').slice(0, len);
  return s.padEnd(len, char);
}
function ediDate() { return new Date().toISOString().slice(0, 10).replace(/-/g, ''); }
function ediTime() { return new Date().toISOString().slice(11, 16).replace(':', ''); }
function formatDate(d) { return d ? String(d).replace(/-/g, '') : ''; }

function validateClaim(claim, patient) {
  const errors = [];
  if (!claim.patient_name) errors.push('Patient name is missing');
  if (!patient.last_name || !patient.first_name) errors.push('Patient first/last name required');
  if (!patient.dob) errors.push('Patient date of birth is required');
  if (!patient.address_line1) errors.push('Patient address is required');
  if (!claim.date_of_service) errors.push('Date of service is required');
  if (!claim.insurance_company) errors.push('Insurance company is required');
  if (!claim.insurance_id) errors.push('Subscriber/Member ID is required');
  if (!claim.diagnoses || claim.diagnoses.length === 0) errors.push('At least one diagnosis code is required');
  if (!claim.service_lines || claim.service_lines.length === 0) errors.push('At least one service/procedure line is required');
  claim.service_lines?.forEach((line, i) => {
    if (!line.code) errors.push(`Service line ${i + 1}: CPT code is missing`);
    if (!line.charge || line.charge <= 0) errors.push(`Service line ${i + 1}: Charge must be greater than 0`);
    if (!line.diagnosis_pointers) errors.push(`Service line ${i + 1}: Diagnosis pointer is required`);
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
  if (dxCodes.length > 0) {
    seg.push(`HI*${dxCodes.map(c => `ABK:${c}`).join('*')}`);
  }
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

    const { claim_ids, mode } = await req.json(); // mode: 'single' | 'batch'
    if (!claim_ids || claim_ids.length === 0) return Response.json({ error: 'claim_ids required' }, { status: 400 });

    const [officeArr, oaArr] = await Promise.all([
      base44.asServiceRole.entities.OfficeSettings.list('-updated_date', 1),
      base44.asServiceRole.entities.OfficeAllySettings.list('-updated_date', 1),
    ]);
    const office = officeArr[0] || {};
    const oaSettings = oaArr[0] || null;

    // Fetch all claims + patients
    const claimsData = [];
    for (const cid of claim_ids) {
      const [cArr] = await Promise.all([base44.asServiceRole.entities.Claim.filter({ id: cid })]);
      const claim = cArr[0];
      if (!claim) return Response.json({ error: `Claim ${cid} not found` }, { status: 404 });
      const pArr = await base44.asServiceRole.entities.Patient.filter({ id: claim.patient_id });
      const patient = pArr[0] || {};

      // Validate
      const errors = validateClaim(claim, patient);
      if (errors.length > 0) {
        return Response.json({ error: 'Claim validation failed', claim_id: cid, patient_name: claim.patient_name, validation_errors: errors }, { status: 422 });
      }
      claimsData.push({ claim, patient });
    }

    // Build 837P — one ISA envelope per batch
    const icn = String(Date.now()).slice(-9);
    const timestamp = new Date().toISOString();
    let ediContent;

    if (claimsData.length === 1) {
      ediContent = build837P(claimsData[0].claim, claimsData[0].patient, office, oaSettings, icn);
    } else {
      // Batch: multiple ST/SE loops inside one ISA/GS envelope
      const seg = [];
      const gcn = icn.slice(-4);
      const billingNpi = oaSettings?.billing_npi || office.billing_npi || office.rendering_npi || '';
      const submitterId = oaSettings?.submitter_id || billingNpi;
      const billingName = (oaSettings?.practice_name || office.billing_provider || office.rendering_provider || 'HUWE CHIROPRACTIC').toUpperCase();

      seg.push(`ISA*00*          *00*          *ZZ*${pad(submitterId, 15)}*ZZ*OFFICEALLY     *${ediDate().slice(2)}*${ediTime()}*^*00501*${icn}*0*P*:`);
      seg.push(`GS*HC*${submitterId}*OFFICEALLY*${ediDate()}*${ediTime()}*${gcn}*X*005010X222A1`);

      let txCount = 0;
      for (let i = 0; i < claimsData.length; i++) {
        const { claim, patient } = claimsData[i];
        const txNum = String(i + 1).padStart(4, '0');
        const claimSegs = [];
        claimSegs.push(`ST*837*${txNum}*005010X222A1`);
        claimSegs.push(`BHT*0019*00*${icn}${i}*${ediDate()}*${ediTime()}*CH`);
        // ... abbreviated: reuse single-claim inner segments
        const inner = build837P(claim, patient, office, oaSettings, icn + i).split('\n');
        // Skip outer ISA/GS/GE/IEA, keep from ST onwards
        const stIdx = inner.findIndex(l => l.startsWith('ST*'));
        const seIdx = inner.findIndex(l => l.startsWith('SE*'));
        const innerSegs = inner.slice(stIdx, seIdx + 1);
        seg.push(...innerSegs);
        txCount++;
      }

      seg.push(`GE*${txCount}*${gcn}`);
      seg.push(`IEA*1*${icn}`);
      ediContent = seg.join('\n');
    }

    const firstClaim = claimsData[0].claim;
    const isBatch = claimsData.length > 1;
    const filename = isBatch
      ? `batch_${claim_ids.length}claims_${ediDate()}_${icn}.edi`
      : `OA_${firstClaim.patient_name?.replace(/\s+/g, '_')}_${firstClaim.date_of_service || ediDate()}.edi`;

    // Update claim statuses
    for (const { claim } of claimsData) {
      await base44.asServiceRole.entities.Claim.update(claim.id, { status: 'Exported for Office Ally' });
    }

    // Create batch record
    const batch = await base44.asServiceRole.entities.OfficeAllyBatch.create({
      batch_filename: filename,
      claim_ids,
      claim_count: claim_ids.length,
      submission_mode: 'Manual Upload',
      submitted_at: timestamp,
      submitted_by: user.email,
      status: 'Exported'
    });

    // Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: `Exported 837P for Office Ally${isBatch ? ' (batch)' : ''}`,
      resource_type: 'OfficeAllyBatch',
      resource_id: batch.id,
      resource_label: filename,
      ip_note: `Claims: ${claim_ids.join(', ')}`
    });

    return new Response(ediContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Batch-Id': batch.id,
        'X-Filename': filename,
      }
    });
  } catch (error) {
    console.error('officeAllyExport error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
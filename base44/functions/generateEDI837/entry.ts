import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Pad/truncate a string to a fixed length
function pad(val, len, char = ' ') {
  const s = String(val || '').slice(0, len);
  return s.padEnd(len, char);
}

function ediDate() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function ediTime() {
  return new Date().toISOString().slice(11, 16).replace(':', '');
}

function formatDate(d) {
  return d ? String(d).replace(/-/g, '') : '';
}

// Build 837P EDI string from claim + patient + office data
function build837P(claim, patient, office) {
  const seg = [];
  const dos = formatDate(claim.date_of_service);
  const icn = String(Date.now()).slice(-9); // interchange control number
  const gcn = String(Date.now()).slice(-4); // group control number

  const billingNpi = office.billing_npi || office.rendering_npi || '';
  const billingName = (office.billing_provider || office.rendering_provider || 'HUWE CHIROPRACTIC').toUpperCase();
  const renderingNpi = office.rendering_npi || billingNpi;
  const ein = (office.ein_tax_id || '').replace(/[^0-9]/g, '');
  const patLast = (patient.last_name || '').toUpperCase();
  const patFirst = (patient.first_name || '').toUpperCase();
  const insuredName = (claim.insured_name || `${patient.first_name} ${patient.last_name}`).toUpperCase().split(' ');
  const insLast = insuredName.slice(0, -1).join(' ') || patLast;
  const insFirst = insuredName[insuredName.length - 1] || patFirst;

  // ISA - Interchange Control Header
  seg.push(`ISA*00*          *00*          *ZZ*${pad(billingNpi, 15)}*ZZ*OFFICEALLY     *${ediDate().slice(2)}*${ediTime()}*^*00501*${icn}*0*P*:`);

  // GS - Functional Group Header
  seg.push(`GS*HC*${billingNpi}*OFFICEALLY*${ediDate()}*${ediTime()}*${gcn}*X*005010X222A1`);

  // ST - Transaction Set Header
  seg.push(`ST*837*0001*005010X222A1`);

  // BPR - Beginning of Hierarchical Transaction
  seg.push(`BHT*0019*00*${icn}*${ediDate()}*${ediTime()}*CH`);

  // NM1 - Submitter
  seg.push(`NM1*41*2*${billingName}*****46*${billingNpi}`);
  seg.push(`PER*IC*${office.rendering_provider?.toUpperCase() || 'BILLING CONTACT'}*TE*${(office.phone || '').replace(/\D/g, '')}`);

  // NM1 - Receiver (Office Ally)
  seg.push(`NM1*40*2*OFFICE ALLY*****46*XX`);

  // HL - Billing Provider Hierarchical Level
  seg.push(`HL*1**20*1`);
  seg.push(`PRV*BI*PXC*${office.taxonomy_code || '111N00000X'}`);
  seg.push(`NM1*85*2*${billingName}*****XX*${billingNpi}`);
  seg.push(`N3*${office.billing_address_line1 || ''}`);
  seg.push(`N4*${office.billing_city || ''}*${office.billing_state || ''}*${office.billing_zip || ''}`);
  seg.push(`REF*EI*${ein}`);

  // HL - Subscriber
  seg.push(`HL*2*1*22*1`);
  seg.push(`SBR*P*${patient.relationship_to_insured === 'Self' ? '18' : '01'}*${claim.insurance_group || ''}*${claim.insurance_company || ''}*****CI`);

  // NM1 - Insured
  seg.push(`NM1*IL*1*${insLast}*${insFirst}****MI*${claim.insurance_id || ''}`);
  seg.push(`N3*${patient.address_line1 || ''}`);
  seg.push(`N4*${patient.city || ''}*${patient.state || ''}*${patient.zip || ''}`);
  seg.push(`DMG*D8*${formatDate(patient.dob)}*${(patient.sex || 'U')[0]}`);

  // NM1 - Payer
  seg.push(`NM1*PR*2*${(claim.insurance_company || 'INSURANCE').toUpperCase()}*****PI*${claim.insurance_id || ''}`);
  seg.push(`CLM*${claim.id?.slice(-10) || icn}*${(claim.total_charge || 0).toFixed(2)}***${claim.place_of_service || '11'}:B:1*Y*A*Y*I`);

  // Accident info
  if (claim.accident_related && claim.accident_date) {
    const accType = claim.accident_type === 'Auto' ? 'AA' : claim.accident_type === 'Work' ? 'EM' : 'OT';
    seg.push(`DTP*${accType === 'EM' ? '431' : '050'}*D8*${formatDate(claim.accident_date)}`);
  }

  // Referring provider
  if (claim.referring_provider) {
    seg.push(`NM1*DN*1*${claim.referring_provider.toUpperCase().split(' ').join('*')}****MD*${claim.referring_npi || ''}`);
  }

  // Rendering provider
  seg.push(`NM1*82*1*${(office.rendering_provider || '').toUpperCase().split(' ').reverse().join('*')}****XX*${renderingNpi}`);
  seg.push(`PRV*PE*PXC*${office.taxonomy_code || '111N00000X'}`);

  // Diagnoses
  const dxCodes = (claim.diagnoses || []).map(d => d.code?.replace('.', '')).filter(Boolean);
  if (dxCodes.length > 0) {
    seg.push(`HI*${dxCodes.map((c, i) => `ABK:${c}`).join('*')}`);
  }

  // Service lines (LX loop)
  (claim.service_lines || []).forEach((line, idx) => {
    const lineTotal = ((line.charge || 0) * (line.units || 1)).toFixed(2);
    const lineDos = formatDate(line.date_of_service || claim.date_of_service);
    seg.push(`LX*${idx + 1}`);
    const modStr = line.modifier ? `*${line.modifier}` : '';
    seg.push(`SV1*HC:${line.code || ''}${modStr}*${lineTotal}*UN*${line.units || 1}**${line.diagnosis_pointers || '1'}`);
    seg.push(`DTP*472*D8*${lineDos}`);
  });

  // SE - Transaction Set Trailer
  seg.push(`SE*${seg.length + 1}*0001`);

  // GE - Functional Group Trailer
  seg.push(`GE*1*${gcn}`);

  // IEA - Interchange Control Trailer
  seg.push(`IEA*1*${icn}`);

  return seg.join('\n');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { claim_id } = await req.json();
    if (!claim_id) return Response.json({ error: 'claim_id required' }, { status: 400 });

    const [claimArr, settingsArr] = await Promise.all([
      base44.asServiceRole.entities.Claim.filter({ id: claim_id }),
      base44.asServiceRole.entities.OfficeSettings.list('-updated_date', 1),
    ]);

    const claim = claimArr[0];
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    const patientArr = await base44.asServiceRole.entities.Patient.filter({ id: claim.patient_id });
    const patient = patientArr[0] || {};
    const office = settingsArr[0] || {};

    const ediContent = build837P(claim, patient, office);
    const filename = `claim_${claim.patient_name?.replace(/\s+/g, '_')}_${claim.date_of_service || 'unknown'}.edi`;

    return new Response(ediContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
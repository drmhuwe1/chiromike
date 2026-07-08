import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function padRight(val, len) {
  const s = String(val || '').slice(0, len);
  return s.padEnd(len, ' ');
}

function zeroPad(val, len) {
  return String(val || '0').padStart(len, '0');
}

function ediDate6() {
  // YYMMDD
  return new Date().toISOString().slice(2, 10).replace(/-/g, '');
}

function ediDate8() {
  // YYYYMMDD
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function ediTime() {
  // HHMM
  return new Date().toISOString().slice(11, 16).replace(':', '');
}

function formatDate(d) {
  return d ? String(d).replace(/-/g, '') : '';
}

// Build 837P EDI string — compliant with Office Ally companion guide
function build837P(claim, patient, office) {
  const segs = [];

  // Control numbers
  const icn = zeroPad(String(Date.now()).slice(-9), 9);
  const gcn = zeroPad(String(Date.now()).slice(-4), 4);
  const txnId = zeroPad(String(Date.now()).slice(-4), 4);

  const billingNpi = (office.billing_npi || office.rendering_npi || '').replace(/\D/g, '');
  const renderingNpi = (office.rendering_npi || billingNpi).replace(/\D/g, '');
  const billingNameRaw = (office.billing_provider || office.rendering_provider || 'HUWE CHIROPRACTIC').toUpperCase();
  const ein = (office.ein_tax_id || '').replace(/[^0-9]/g, '');
  const taxonomy = office.taxonomy_code || '111N00000X';

  // Split billing provider name into last/first for NM1
  const billingNameParts = billingNameRaw.split(' ');
  const billingLast = billingNameParts[0] || billingNameRaw;
  const billingFirst = billingNameParts.slice(1).join(' ') || '';

  const patLast = (patient.last_name || '').toUpperCase();
  const patFirst = (patient.first_name || '').toUpperCase();

  // Insured name parsing (Last First format stored as "First Last")
  const insuredRaw = (claim.insured_name || `${patient.first_name} ${patient.last_name}`).toUpperCase().trim();
  const insuredParts = insuredRaw.split(' ');
  const insLast = insuredParts.length > 1 ? insuredParts.slice(1).join(' ') : insuredParts[0];
  const insFirst = insuredParts[0] || patFirst;

  const memberId = (claim.insurance_id || patient.insurance_id || '').replace(/\s/g, '');
  const groupNum = claim.insurance_group || patient.insurance_group || '';
  const insCompany = (claim.insurance_company || patient.insurance_company || 'INSURANCE').toUpperCase();

  // Office Ally requires their Payer ID in NM1*PR NM109
  // The payer ID must come from the OA payer list — stored in InsuranceCompany.edi_payer_id
  // We use it if available, otherwise fall back to the insurer name (OA will attempt lookup)
  const payerId = claim.payer_id || '';

  const isSelf = (claim.relationship_to_insured || patient.relationship_to_insured || 'Self') === 'Self';

  const push = (s) => segs.push(s + '~');

  // ISA — Interchange Control Header (fixed 106-char segment)
  // ISA03/04: security info (spaces), ISA05/06: sender qualifier+ID, ISA07/08: receiver qualifier+ID
  push(`ISA*00*          *00*          *ZZ*${padRight(billingNpi, 15)}*ZZ*${padRight('030240928', 15)}*${ediDate6()}*${ediTime()}*^*00501*${icn}*0*P*:`);

  // GS — Functional Group Header
  push(`GS*HC*${billingNpi}*030240928*${ediDate8()}*${ediTime()}*${gcn}*X*005010X222A1`);

  // ST — Transaction Set Header
  push(`ST*837*${txnId}*005010X222A1`);

  // BHT — Beginning of Hierarchical Transaction
  push(`BHT*0019*00*${icn}*${ediDate8()}*${ediTime()}*CH`);

  // Loop 1000A — Submitter (the billing provider)
  push(`NM1*41*2*${billingNameRaw}*****46*${billingNpi}`);
  push(`PER*IC*${billingNameRaw}*TE*${(office.phone || '').replace(/\D/g, '')}`);

  // Loop 1000B — Receiver (Office Ally)
  push(`NM1*40*2*OFFICE ALLY*****46*030240928`);

  // Loop 2000A — Billing Provider HL
  push(`HL*1**20*1`);
  push(`PRV*BI*PXC*${taxonomy}`);
  push(`NM1*85*2*${billingNameRaw}*****XX*${billingNpi}`);
  push(`N3*${office.billing_address_line1 || ''}`);
  push(`N4*${office.billing_city || ''}*${office.billing_state || ''}*${(office.billing_zip || '').slice(0, 5)}`);
  push(`REF*EI*${ein}`);

  // Loop 2000B — Subscriber HL
  push(`HL*2*1*22*${isSelf ? '0' : '1'}`);
  push(`SBR*P*${isSelf ? '18' : '01'}*${groupNum}*${insCompany}*****CI`);

  // Loop 2010BA — Subscriber (insured) Name
  push(`NM1*IL*1*${insLast}*${insFirst}****MI*${memberId}`);
  push(`N3*${patient.address_line1 || ''}`);
  push(`N4*${patient.city || ''}*${patient.state || ''}*${(patient.zip || '').slice(0, 5)}`);
  push(`DMG*D8*${formatDate(patient.dob)}*${(patient.sex || 'U')[0].toUpperCase()}`);

  // Loop 2010BB — Payer Name (must use OA Payer ID)
  push(`NM1*PR*2*${insCompany}*****PI*${payerId || insCompany}`);

  // Loop 2000C — Patient HL (only if patient != insured)
  if (!isSelf) {
    push(`HL*3*2*23*0`);
    push(`PAT*${claim.relationship_to_insured === 'Spouse' ? '01' : claim.relationship_to_insured === 'Child' ? '19' : '21'}`);
    push(`NM1*QC*1*${patLast}*${patFirst}****MI*${memberId}`);
    push(`N3*${patient.address_line1 || ''}`);
    push(`N4*${patient.city || ''}*${patient.state || ''}*${(patient.zip || '').slice(0, 5)}`);
    push(`DMG*D8*${formatDate(patient.dob)}*${(patient.sex || 'U')[0].toUpperCase()}`);
  }

  // Loop 2300 — Claim Information
  const claimControlNum = claim.id?.slice(-10) || icn;
  push(`CLM*${claimControlNum}*${(claim.total_charge || 0).toFixed(2)}***${claim.place_of_service || '11'}:B:1*Y*A*Y*I`);

  // Date of first visit / onset
  if (claim.date_of_first_visit) {
    push(`DTP*431*D8*${formatDate(claim.date_of_first_visit)}`);
  }

  // Accident
  if (claim.accident_related && claim.accident_date) {
    const accCode = claim.accident_type === 'Auto' ? '02' : claim.accident_type === 'Work' ? '01' : '04';
    push(`DTP*439*D8*${formatDate(claim.accident_date)}`);
    push(`CLM*${claimControlNum}*${(claim.total_charge || 0).toFixed(2)}***${claim.place_of_service || '11'}:B:1*Y*A*Y*I`);
    push(`CRC*AA*Y*${accCode}`);
  }

  // Prior auth
  if (claim.authorization_number) {
    push(`REF*G1*${claim.authorization_number}`);
  }

  // Referring provider
  if (claim.referring_provider) {
    const refParts = (claim.referring_provider || '').toUpperCase().split(' ');
    const refLast = refParts[refParts.length - 1] || '';
    const refFirst = refParts.slice(0, -1).join(' ') || '';
    push(`NM1*DN*1*${refLast}*${refFirst}****XX*${claim.referring_npi || ''}`);
  }

  // Rendering provider (Loop 2310B)
  const renderParts = (office.rendering_provider || '').toUpperCase().split(' ');
  const renderLast = renderParts[renderParts.length - 1] || '';
  const renderFirst = renderParts.slice(0, -1).join(' ') || '';
  push(`NM1*82*1*${renderLast}*${renderFirst}****XX*${renderingNpi}`);
  push(`PRV*PE*PXC*${taxonomy}`);

  // Diagnoses (HI segment) — first code ABK, subsequent ABF
  const dxCodes = (claim.diagnoses || []).map(d => (d.code || '').replace('.', '')).filter(Boolean);
  if (dxCodes.length > 0) {
    const hiElements = dxCodes.map((code, i) => `${i === 0 ? 'ABK' : 'ABF'}:${code}`).join('*');
    push(`HI*${hiElements}`);
  }

  // Service lines (LX loop)
  (claim.service_lines || []).forEach((line, idx) => {
    const lineTotal = ((line.charge || 0) * (line.units || 1)).toFixed(2);
    const lineDos = formatDate(line.date_of_service || claim.date_of_service);
    push(`LX*${idx + 1}`);
    const modPart = line.modifier ? `:::${line.modifier}` : '';
    push(`SV1*HC:${line.code || ''}${modPart}*${lineTotal}*UN*${line.units || 1}***${line.diagnosis_pointers || 'A'}`);
    push(`DTP*472*D8*${lineDos}`);
  });

  // SE — Transaction Set Trailer (count includes ST and SE)
  push(`SE*${segs.length + 1}*${txnId}`);

  // GE — Functional Group Trailer
  push(`GE*1*${gcn}`);

  // IEA — Interchange Control Trailer
  push(`IEA*1*${icn}`);

  return segs.join('\n');
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

    // Try to pull payer EDI ID from InsuranceCompany records
    let payerId = '';
    if (claim.insurance_company) {
      const insurers = await base44.asServiceRole.entities.InsuranceCompany.filter({ name: claim.insurance_company });
      if (insurers[0]?.edi_payer_id) payerId = insurers[0].edi_payer_id;
    }
    claim.payer_id = payerId;

    const ediContent = build837P(claim, patient, office);
    const filename = `claim_${(claim.patient_name || 'patient').replace(/\s+/g, '_')}_${claim.date_of_service || 'unknown'}.837`;

    return new Response(ediContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('generateEDI837 error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
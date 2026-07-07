import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // SSRF protection: only allow https from trusted Base44 storage hostnames
    let parsedUrl;
    try {
      parsedUrl = new URL(file_url);
    } catch {
      return Response.json({ error: 'Invalid file_url' }, { status: 400 });
    }
    const ALLOWED_HOSTS = ['storage.googleapis.com', 'files.base44.com', 'cdn.base44.com'];
    if (parsedUrl.protocol !== 'https:' || !ALLOWED_HOSTS.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith('.' + h))) {
      return Response.json({ error: 'file_url must be an https URL from a trusted storage host' }, { status: 400 });
    }

    console.log('Fetching file:', file_url);
    const fileResp = await fetch(file_url);
    if (!fileResp.ok) {
      return Response.json({ error: `Failed to fetch file: ${fileResp.status}` }, { status: 400 });
    }

    const arrayBuffer = await fileResp.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: false });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    console.log(`Parsed ${rows.length} rows from sheet: ${sheetName}`);
    if (rows.length > 0) {
      console.log('Sample row keys:', Object.keys(rows[0]).join(', '));
      console.log('Sample row:', JSON.stringify(rows[0]));
    }

    const parseDate = (val) => {
      if (!val) return null;
      const str = String(val).trim();
      const parts = str.split('/');
      if (parts.length === 3) {
        const [m, d, y] = parts;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return null;
    };

    const mapGender = (g) => {
      if (!g) return null;
      const lower = String(g).toLowerCase();
      if (lower === 'male') return 'Male';
      if (lower === 'female') return 'Female';
      return 'Other';
    };

    const mapAccidentType = (accType) => {
      if (!accType) return 'None';
      const upper = String(accType).toUpperCase();
      if (upper.includes('AUTO') || upper.includes('MVA')) return 'Auto';
      if (upper.includes('WORK') || upper.includes('WC')) return 'Work';
      return 'None';
    };

    const BATCH_SIZE = 50;
    let totalCreated = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const toCreate = batch.map(row => {
        const accType = row["Acc. Type"] || '';
        const isAccident = mapAccidentType(accType) !== 'None';
        const zipRaw = row["Zip"];
        const zip = zipRaw != null ? String(zipRaw).split('.')[0].trim() : null;

        return {
          first_name: row["First Name"] ? String(row["First Name"]).trim() : null,
          last_name: row["Last Name"] ? String(row["Last Name"]).trim() : null,
          dob: parseDate(row["DOB"]),
          sex: mapGender(row["Gender"]),
          phone: row["Cell Phone"] ? String(row["Cell Phone"]) : (row["Home Phone"] ? String(row["Home Phone"]) : (row["Work Phone"] ? String(row["Work Phone"]) : null)),
          email: row["E-Mail"] ? String(row["E-Mail"]).trim() : null,
          address_line1: row["Address"] ? String(row["Address"]).trim() : null,
          city: row["City"] ? String(row["City"]).trim() : null,
          state: row["State"] ? String(row["State"]).trim() : null,
          zip: zip,
          insurance_company: row["Primary INS."] ? String(row["Primary INS."]).trim() : null,
          insurance_id: row["Primary INS.#"] ? String(row["Primary INS.#"]).trim() : null,
          insurance_group: row["Primary INS. Group#"] ? String(row["Primary INS. Group#"]).trim() : null,
          is_accident_related: isAccident,
          accident_type: mapAccidentType(accType),
          active: String(row["Active"] || '').toUpperCase() === 'Y',
          intake_source: 'manual',
          notes: row["Referring Provider"] ? `Referring Provider: ${row["Referring Provider"]}` : null
        };
      }).filter(p => p.first_name && p.last_name);

      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${toCreate.length} valid patients`);

      if (toCreate.length === 0) continue;

      try {
        const created = await base44.asServiceRole.entities.Patient.bulkCreate(toCreate);
        totalCreated += created.length;
        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: created ${created.length}`);
      } catch (batchError) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, batchError.message);
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError.message}`);
      }
    }

    return Response.json({
      success: true,
      total_rows: rows.length,
      total_created: totalCreated,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('importPatients error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function parse835(raw) {
  const segments = String(raw || '').replace(/[\r\n]/g, '').split('~').map((segment) => segment.trim()).filter(Boolean);
  const transactions = [];
  let current = null;

  for (const segment of segments) {
    const parts = segment.split('*');
    const tag = parts[0];
    if (tag === 'CLP') {
      if (current) transactions.push(current);
      current = {
        patient_control_number: parts[1] || '',
        claim_status_code: parts[2] || '',
        total_charge: Number(parts[3] || 0),
        payment_amount: Number(parts[4] || 0),
        patient_responsibility: Number(parts[5] || 0),
        payer_claim_control_number: parts[7] || '',
        adjustments: [],
        service_lines: [],
      };
    } else if (tag === 'CAS' && current) {
      for (let index = 2; index < parts.length; index += 3) {
        if (!parts[index]) continue;
        current.adjustments.push({ group_code: parts[1] || '', reason_code: parts[index], amount: Number(parts[index + 1] || 0), quantity: Number(parts[index + 2] || 0) });
      }
    } else if (tag === 'SVC' && current) {
      current.service_lines.push({ procedure_code: String(parts[1] || '').split(':').pop(), charged: Number(parts[2] || 0), paid: Number(parts[3] || 0), units: Number(parts[5] || 1) });
    }
  }
  if (current) transactions.push(current);
  return transactions;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const { report_id, action = 'preview' } = await req.json();
    if (!report_id) return Response.json({ error: 'report_id is required' }, { status: 400 });
    if (!['preview', 'post'].includes(action)) return Response.json({ error: 'action must be preview or post' }, { status: 400 });

    const reports = await base44.asServiceRole.entities.OfficeAllyReport.filter({ id: report_id });
    const report = reports[0];
    if (!report || report.report_type !== '835') return Response.json({ error: '835 report not found' }, { status: 404 });

    const transactions = parse835(report.raw_content);
    const claims = await base44.asServiceRole.entities.Claim.list('-date_of_service', 5000);
    const matchTransaction = (transaction) => claims.find((claim) => claim.id === transaction.patient_control_number || String(claim.id || '').endsWith(transaction.patient_control_number));
    const preview = transactions.map((transaction) => {
      const claim = matchTransaction(transaction);
      return { ...transaction, matched_claim_id: claim?.id || null, patient_name: claim?.patient_name || null, date_of_service: claim?.date_of_service || null };
    });

    const unmatched = preview.filter((item) => !item.matched_claim_id).map((item) => item.patient_control_number);
    if (action === 'preview') {
      await base44.asServiceRole.entities.OfficeAllyReport.update(report.id, { posting_status: unmatched.length ? 'Needs Review' : 'Previewed', transactions_found: preview.length, unmatched_control_numbers: unmatched });
      return Response.json({ transactions: preview, unmatched, safe_to_post: preview.length > 0 && unmatched.length === 0 });
    }

    let posted = 0;
    let skippedDuplicates = 0;
    const errors = [];
    for (const transaction of preview) {
      if (!transaction.matched_claim_id) continue;
      const claim = claims.find((item) => item.id === transaction.matched_claim_id);
      const eraSource = `${report.filename}:${transaction.patient_control_number}:${transaction.payer_claim_control_number}`;
      const existing = await base44.asServiceRole.entities.Payment.filter({ era_source: eraSource });
      if (existing.length) { skippedDuplicates += 1; continue; }

      const denial = transaction.claim_status_code === '4';
      const firstAdjustment = transaction.adjustments[0];
      try {
        await base44.asServiceRole.entities.Payment.create({
          claim_id: claim.id,
          patient_id: claim.patient_id,
          patient_name: claim.patient_name,
          date_of_service: claim.date_of_service,
          insurance_company: claim.insurance_company,
          payment_date: new Date().toISOString().slice(0, 10),
          payment_type: denial ? 'Denial' : 'Insurance',
          payment_amount: transaction.payment_amount,
          allowed_amount: transaction.payment_amount + transaction.adjustments.reduce((sum, item) => sum + item.amount, 0),
          deductible_applied: transaction.patient_responsibility,
          denial_code: denial && firstAdjustment ? `${firstAdjustment.group_code}-${firstAdjustment.reason_code}` : '',
          denial_reason: denial ? 'Posted from Office Ally 835; review adjustment codes and remittance.' : '',
          notes: `Payer claim control: ${transaction.payer_claim_control_number}. Service lines: ${transaction.service_lines.map((line) => `${line.procedure_code} paid $${line.paid.toFixed(2)}`).join('; ')}`,
          era_source: eraSource,
        });

        const newPaid = (claim.amount_paid || 0) + transaction.payment_amount;
        const fullyResolved = newPaid + (claim.written_off_amount || 0) >= (claim.total_charge || 0) - 0.01;
        await base44.asServiceRole.entities.Claim.update(claim.id, {
          amount_paid: newPaid,
          status: denial ? 'Denied' : fullyResolved ? 'Paid' : claim.status,
          balance_status: fullyResolved ? 'Paid' : 'Open',
          follow_up_status: fullyResolved ? 'Resolved' : claim.follow_up_status,
        });
        posted += 1;
      } catch (error) {
        errors.push({ control_number: transaction.patient_control_number, error: error.message });
      }
    }

    const status = errors.length || unmatched.length ? (posted ? 'Partially Posted' : 'Needs Review') : 'Posted';
    await base44.asServiceRole.entities.OfficeAllyReport.update(report.id, {
      posting_confirmed: status === 'Posted', posting_status: status, transactions_found: preview.length, transactions_posted: posted, unmatched_control_numbers: unmatched,
      matched_claim_ids: preview.filter((item) => item.matched_claim_id).map((item) => item.matched_claim_id),
    });
    await base44.asServiceRole.entities.AuditLog.create({ user_email: user.email || 'unknown', action: 'POSTED_OFFICE_ALLY_835', resource_type: 'OfficeAllyReport', resource_id: report.id, resource_label: `${report.filename} | ${posted} posted | ${unmatched.length} unmatched | ${skippedDuplicates} duplicates skipped` });
    return Response.json({ posted, skipped_duplicates: skippedDuplicates, unmatched, errors, status });
  } catch (error) {
    console.error('835 processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

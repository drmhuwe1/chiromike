import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all claims and all payments
    const [claims, payments] = await Promise.all([
      base44.asServiceRole.entities.Claim.list('-date_of_service', 2000),
      base44.asServiceRole.entities.Payment.list('-payment_date', 5000),
    ]);

    // Build a map: claim_id -> sum of payment_amount from Payment entity
    const paymentSumByClaimId = {};
    for (const p of payments) {
      if (!p.claim_id) continue;
      paymentSumByClaimId[p.claim_id] = (paymentSumByClaimId[p.claim_id] || 0) + (p.payment_amount || 0);
    }

    const corrections = [];
    const errors = [];

    for (const claim of claims) {
      const paymentEntitySum = paymentSumByClaimId[claim.id] || 0;
      const claimAmountPaid = claim.amount_paid || 0;

      // If they differ by more than $0.01, reconcile
      if (Math.abs(paymentEntitySum - claimAmountPaid) > 0.01) {
        const newStatus = paymentEntitySum >= (claim.total_charge || 0) ? 'Paid' : claim.status;
        try {
          await base44.asServiceRole.entities.Claim.update(claim.id, {
            amount_paid: paymentEntitySum,
            status: newStatus,
          });
          corrections.push({
            claim_id: claim.id,
            patient_name: claim.patient_name,
            date_of_service: claim.date_of_service,
            old_amount_paid: claimAmountPaid,
            new_amount_paid: paymentEntitySum,
            old_status: claim.status,
            new_status: newStatus,
            difference: paymentEntitySum - claimAmountPaid,
          });
          console.log(`✓ Reconciled claim ${claim.id} (${claim.patient_name}): ${claimAmountPaid} → ${paymentEntitySum}`);
        } catch (e) {
          errors.push({ claim_id: claim.id, error: e.message });
          console.error(`✗ Failed to reconcile claim ${claim.id}:`, e.message);
        }
      }
    }

    return Response.json({
      success: true,
      claims_checked: claims.length,
      corrections_made: corrections.length,
      corrections,
      errors,
      reconciled_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reconcile AR error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
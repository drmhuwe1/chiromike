import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // This endpoint is intentionally unauthenticated — it is called from the
    // Stripe payment-success redirect page where the patient may not be logged in.
    // Security is enforced by verifying the Stripe session_id directly with Stripe.
    const stripe = new (await import('npm:stripe@17.0.0')).default(Deno.env.get('STRIPE_SECRET_KEY'));

    const { session_id, claim_id, patient_id, date_of_service } = await req.json();

    if (!session_id || !claim_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Verify the session metadata matches the supplied claim/patient IDs
    // to prevent session ID reuse across different claims (payment bypass)
    if (session.metadata?.claim_id && session.metadata.claim_id !== claim_id) {
      console.error(`Metadata mismatch: session claim_id=${session.metadata.claim_id} vs request claim_id=${claim_id}`);
      return Response.json({ error: 'Session does not match the supplied claim' }, { status: 403 });
    }
    if (session.metadata?.patient_id && session.metadata.patient_id !== patient_id) {
      console.error(`Metadata mismatch: session patient_id=${session.metadata.patient_id} vs request patient_id=${patient_id}`);
      return Response.json({ error: 'Session does not match the supplied patient' }, { status: 403 });
    }

    // Get patient and claim details
    const claims = await base44.asServiceRole.entities.Claim.filter({ id: claim_id });
    const patients = await base44.asServiceRole.entities.Patient.filter({ id: patient_id });

    if (!claims[0] || !patients[0]) {
      return Response.json({ error: 'Claim or patient not found' }, { status: 404 });
    }

    const claim = claims[0];
    const patient = patients[0];
    const amount = session.amount_total / 100; // Convert from cents

    // Create payment record
    const payment = await base44.asServiceRole.entities.Payment.create({
      claim_id,
      patient_id,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      date_of_service: date_of_service || claim.date_of_service,
      insurance_company: 'Patient Payment',
      payment_date: new Date().toISOString().split('T')[0],
      payment_type: 'Patient',
      payment_amount: amount,
      check_number: session_id,
      notes: `Stripe mobile/tablet payment - ${session.payment_intent}`,
    });

    console.log(`✓ Payment recorded: ${amount} for claim ${claim_id}, payment ID: ${payment.id}`);

    return Response.json({
      success: true,
      amount,
      transaction_id: session_id,
      payment_id: payment.id,
      message: 'Payment successfully recorded',
    });
  } catch (error) {
    console.error('Verification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
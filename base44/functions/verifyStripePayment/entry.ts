import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const stripe = await import('npm:stripe@17.0.0').then(m => new m.default(Deno.env.get('STRIPE_SECRET_KEY')));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, claim_id, patient_id, date_of_service } = await req.json();

    if (!session_id || !claim_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not completed' }, { status: 400 });
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
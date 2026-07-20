import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const stripe = await import('npm:stripe@17.0.0').then(m => new m.default(Deno.env.get('STRIPE_SECRET_KEY')));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin role required' }, { status: 403 });
    }

    const { claim_id, patient_id, patient_email, date_of_service } = await req.json();

    if (!claim_id || !patient_id || !patient_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get claim and patient details — amount is always derived server-side from the claim record
    const claims = await base44.asServiceRole.entities.Claim.filter({ id: claim_id });
    const patients = await base44.asServiceRole.entities.Patient.filter({ id: patient_id });

    if (!claims[0] || !patients[0]) {
      return Response.json({ error: 'Claim or patient not found' }, { status: 404 });
    }

    const claim = claims[0];
    const patient = patients[0];

    // Derive amount from DB — never trust client-supplied amount
    const totalCharge = Math.round((claim.total_charge || 0) * 100); // cents
    const amountPaid = Math.round((claim.amount_paid || 0) * 100);
    const unitAmount = Math.max(totalCharge - amountPaid, 0);

    if (unitAmount <= 0) {
      return Response.json({ error: 'No outstanding balance on this claim' }, { status: 400 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: patient_email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Payment for ${patient.first_name} ${patient.last_name}`,
              description: `Chiropractic visit - ${date_of_service || claim.date_of_service}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${getOrigin()}/payment-success?session_id={CHECKOUT_SESSION_ID}&claim_id=${claim_id}&patient_id=${patient_id}&dos=${date_of_service}`,
      cancel_url: `${getOrigin()}/payment-cancelled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        claim_id,
        patient_id,
        patient_email,
        date_of_service,
      },
    });

    console.log(`✓ Checkout session created: ${session.id} for claim ${claim_id}`);

    return Response.json({ checkout_url: session.url });
  } catch (error) {
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getOrigin() {
  // Use server-side env var — never trust client-supplied Host/X-Forwarded-Proto headers for redirects
  return Deno.env.get('APP_URL') || 'https://app.base44.com';
}
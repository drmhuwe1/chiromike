import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const stripe = await import('npm:stripe@17.0.0').then(m => new m.default(Deno.env.get('STRIPE_SECRET_KEY')));

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not set');
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify Stripe signature (async version for Deno)
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { claim_id, patient_id, patient_email, date_of_service } = session.metadata;

      console.log(`✓ Payment completed: session ${session.id}, claim ${claim_id}`);

      // Record payment
      const paymentAmount = session.amount_total / 100; // Convert from cents

      await base44.asServiceRole.entities.Payment.create({
        claim_id,
        patient_id,
        patient_name: session.customer_email,
        date_of_service,
        insurance_company: 'Patient Payment',
        payment_date: new Date().toISOString().split('T')[0],
        payment_type: 'Patient',
        payment_amount: paymentAmount,
        check_number: session.id,
        notes: `Stripe payment via mobile/tablet - ${session.payment_intent}`,
      });

      // Send receipt email
      try {
        await base44.integrations.Core.SendEmail({
          to: patient_email,
          subject: `Payment Confirmation - Huwe Chiropractic`,
          body: `Dear Patient,\n\nWe've received your payment of $${paymentAmount.toFixed(2)}.\n\nPayment Date: ${date_of_service}\nTransaction ID: ${session.id}\n\nThank you for your business!\n\nHuwe Chiropractic`,
        });
        console.log(`✓ Receipt emailed to ${patient_email}`);
      } catch (emailErr) {
        console.error(`Warning: Could not email receipt: ${emailErr.message}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patient_id, patient_name, patient_email, price_id, plan_name, visits_per_month } = await req.json();

    if (!price_id) {
      return Response.json({ error: 'price_id is required' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const sessionParams = {
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancelled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        patient_id: patient_id || '',
        patient_name: patient_name || '',
        plan_name: plan_name || '',
        visits_per_month: visits_per_month ? String(visits_per_month) : '',
        billing_type: 'subscription',
      },
    };

    if (patient_email) {
      sessionParams.customer_email = patient_email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`Created subscription checkout for ${patient_name}, price: ${price_id}, session: ${session.id}`);
    return Response.json({ url: session.url, session_id: session.id });

  } catch (error) {
    console.error('createSubscriptionCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
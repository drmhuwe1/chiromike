import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const stripe = await import('npm:stripe@17.0.0').then(m => new m.default(Deno.env.get('STRIPE_SECRET_KEY')));

const PLAN_NAME_MAP = {
  'price_1M45fDGRpSbA8EZgv2smNpb2': 'Maintenance Plan',
  'price_1M45fDGRpSbA8EZgJGuW8mb1': 'Wellness Plan',
  'price_1M45fDGRpSbA8EZg0jf9qbTG': 'Family Plan',
};

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

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log(`Stripe event received: ${event.type}`);

    // ── One-time payment completed ──────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { claim_id, patient_id, patient_email, date_of_service, billing_type, patient_name, plan_name } = session.metadata || {};

      console.log(`✓ Checkout completed: session ${session.id}, billing_type: ${billing_type}`);

      if (billing_type === 'subscription') {
        // Update patient membership record
        if (patient_id) {
          // Determine plan name from line items if not in metadata
          let resolvedPlan = plan_name || null;
          if (!resolvedPlan && session.subscription) {
            try {
              const sub = await stripe.subscriptions.retrieve(session.subscription);
              const priceId = sub.items?.data?.[0]?.price?.id;
              resolvedPlan = PLAN_NAME_MAP[priceId] || plan_name || 'Basic';
            } catch (e) {
              console.error('Could not retrieve subscription details:', e.message);
            }
          }

          await base44.asServiceRole.entities.Patient.update(patient_id, {
            membership_plan: resolvedPlan,
            membership_status: 'active',
            membership_stripe_subscription_id: session.subscription || '',
            membership_started_at: new Date().toISOString().split('T')[0],
            membership_cancelled_at: null,
          });
          console.log(`✓ Patient ${patient_id} membership set to active (${resolvedPlan})`);
        }

        // Send welcome email
        if (patient_email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: patient_email,
              subject: 'Welcome to Your Membership — Huwe Chiropractic',
              body: `Dear ${patient_name || 'Patient'},\n\nThank you for enrolling in the ${plan_name || 'Membership'} Plan at Huwe Chiropractic!\n\nYour membership is now active and will auto-renew monthly. You can cancel at any time by contacting our office.\n\nWe look forward to supporting your health!\n\nHuwe Chiropractic`,
            });
          } catch (emailErr) {
            console.error('Could not send membership welcome email:', emailErr.message);
          }
        }
      } else {
        // One-time payment — record as before
        const paymentAmount = (session.amount_total || 0) / 100;

        await base44.asServiceRole.entities.Payment.create({
          claim_id: claim_id || '',
          patient_id: patient_id || '',
          patient_name: session.customer_email || '',
          date_of_service: date_of_service || new Date().toISOString().split('T')[0],
          insurance_company: 'Patient Payment',
          payment_date: new Date().toISOString().split('T')[0],
          payment_type: 'Patient',
          payment_amount: paymentAmount,
          check_number: session.id,
          notes: `Stripe payment - ${session.payment_intent}`,
        });

        // CM-1: Update Claim.amount_paid so AR aging reflects Stripe payments
        if (claim_id) {
          try {
            const existingClaims = await base44.asServiceRole.entities.Claim.filter({ id: claim_id });
            if (existingClaims && existingClaims.length > 0) {
              const claim = existingClaims[0];
              const newAmountPaid = (claim.amount_paid || 0) + paymentAmount;
              const newStatus = newAmountPaid >= (claim.total_charge || 0) ? 'Paid' : claim.status;
              await base44.asServiceRole.entities.Claim.update(claim_id, {
                amount_paid: newAmountPaid,
                status: newStatus,
              });
              console.log(`✓ Claim ${claim_id} amount_paid updated to ${newAmountPaid}, status: ${newStatus}`);
            }
          } catch (claimUpdateErr) {
            console.error('Could not update Claim.amount_paid:', claimUpdateErr.message);
          }
        }

        if (patient_email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: patient_email,
              subject: 'Payment Confirmation — Huwe Chiropractic',
              body: `Dear Patient,\n\nWe've received your payment of $${paymentAmount.toFixed(2)}.\n\nPayment Date: ${date_of_service}\nTransaction ID: ${session.id}\n\nThank you!\n\nHuwe Chiropractic`,
            });
          } catch (emailErr) {
            console.error('Could not email receipt:', emailErr.message);
          }
        }
      }
    }

    // ── Subscription cancelled ──────────────────────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const priceId = subscription.items?.data?.[0]?.price?.id;
      const planName = PLAN_NAME_MAP[priceId] || 'Membership';

      console.log(`Subscription cancelled: ${subscription.id}, plan: ${planName}`);

      // Find patient by subscription ID
      const patients = await base44.asServiceRole.entities.Patient.filter({
        membership_stripe_subscription_id: subscription.id,
      });

      if (patients.length > 0) {
        const patient = patients[0];
        await base44.asServiceRole.entities.Patient.update(patient.id, {
          membership_status: 'cancelled',
          membership_cancelled_at: new Date().toISOString().split('T')[0],
        });
        console.log(`✓ Patient ${patient.id} membership marked as cancelled`);

        // Send cancellation notification email
        if (patient.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: patient.email,
              subject: 'Membership Cancellation Confirmed — Huwe Chiropractic',
              body: `Dear ${patient.first_name || 'Patient'},\n\nYour ${planName} Plan membership at Huwe Chiropractic has been cancelled as of ${new Date().toLocaleDateString()}.\n\nYou will not be charged for any future months. Your benefits remain active through the end of your current billing period.\n\nIf this was a mistake or you'd like to re-enroll, please contact our office.\n\nHuwe Chiropractic`,
            });
            console.log(`✓ Cancellation email sent to ${patient.email}`);
          } catch (emailErr) {
            console.error('Could not send cancellation email:', emailErr.message);
          }
        }
      } else {
        console.warn(`No patient found with subscription ID: ${subscription.id}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});
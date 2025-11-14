/**
 * Mollie Webhook Azure Function
 * POST /api/subscription/webhook
 * Handles Mollie webhook events for payments and subscriptions
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { MollieService } from '../../services/mollie.service';
import { SubscriptionService } from '../../services/subscription.service';

export async function subscriptionWebhook(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log('[SubscriptionWebhook] Webhook received');

        // Get the payment ID from the POST body
        const body = await request.text();
        const params = new URLSearchParams(body);
        const paymentId = params.get('id');

        if (!paymentId) {
            context.log('[SubscriptionWebhook] No payment ID in webhook');
            return createErrorResponse('Missing payment ID', 400);
        }

        context.log('[SubscriptionWebhook] Processing payment:', paymentId);

        const mollieService = new MollieService();
        const subscriptionService = new SubscriptionService();

        // Fetch payment details from Mollie
        const payment = await mollieService.getPayment(paymentId);
        context.log('[SubscriptionWebhook] Payment status:', payment.status);

        // Get payment from database
        const dbPayment = await subscriptionService.getPaymentByMollieId(paymentId);
        if (!dbPayment) {
            context.warn('[SubscriptionWebhook] Payment not found in database:', paymentId);
            // Still return 200 to Mollie to avoid retries
            return createSuccessResponse({ message: 'Payment not found' }, 200);
        }

        // Handle payment status
        if (payment.status === 'paid' && dbPayment.status !== 'paid') {
            context.log('[SubscriptionWebhook] Payment successful, updating records');

            // Update payment record
            await subscriptionService.updatePayment(dbPayment.id, {
                status: 'paid',
                betaal_datum: new Date()
            });

            // Get subscription
            const subscription = await subscriptionService.getSubscriptionByUserId(dbPayment.abonnement_id);
            if (!subscription) {
                context.error('[SubscriptionWebhook] Subscription not found');
                return createSuccessResponse({ message: 'Subscription not found' }, 200);
            }

            // If this was the first payment, create the recurring subscription
            const metadata = payment.metadata as any;
            if (metadata?.type === 'first_payment' && payment.customerId) {
                context.log('[SubscriptionWebhook] First payment - creating recurring subscription');

                // Get the mandate ID from the first payment
                const mandates = await mollieService.getMandates(payment.customerId);
                const validMandate = mandates.find(m => m.status === 'valid');

                if (validMandate) {
                    context.log('[SubscriptionWebhook] Valid mandate found:', validMandate.id);

                    // Create recurring subscription
                    const webhookUrl = `${process.env.WEBSITE_HOSTNAME || 'https://ouderschaps-api-fvgbfwachxabawgs.westeurope-01.azurewebsites.net'}/api/subscription/webhook`;

                    const mollieSubscription = await mollieService.createSubscription({
                        customerId: payment.customerId,
                        amount: {
                            value: '19.99',
                            currency: 'EUR'
                        },
                        interval: '1 month',
                        description: 'Ouderschapsdesk Basis Abonnement',
                        webhookUrl,
                        mandateId: validMandate.id,
                        metadata: {
                            subscriptionId: subscription.id.toString(),
                            userId: subscription.gebruiker_id.toString()
                        }
                    });

                    context.log('[SubscriptionWebhook] Mollie subscription created:', mollieSubscription.id);

                    // Calculate next payment date (after 7 day trial)
                    const nextPayment = new Date();
                    nextPayment.setDate(nextPayment.getDate() + 7);

                    // Update subscription with Mollie IDs
                    await subscriptionService.updateSubscription(subscription.id, {
                        mollie_subscription_id: mollieSubscription.id,
                        mollie_mandate_id: validMandate.id,
                        status: 'active',
                        volgende_betaling: nextPayment
                    });

                    // Update user's subscription status
                    await subscriptionService.updateUserSubscriptionStatus(subscription.gebruiker_id, true);

                    context.log('[SubscriptionWebhook] Subscription activated for user:', subscription.gebruiker_id);
                } else {
                    context.warn('[SubscriptionWebhook] No valid mandate found after payment');
                }
            } else if (subscription.mollie_subscription_id) {
                // This is a recurring payment
                context.log('[SubscriptionWebhook] Recurring payment processed');

                // Calculate next payment date (1 month from now)
                const nextPayment = new Date();
                nextPayment.setMonth(nextPayment.getMonth() + 1);

                await subscriptionService.updateSubscription(subscription.id, {
                    volgende_betaling: nextPayment
                });
            }

        } else if (payment.status === 'failed' && dbPayment.status !== 'failed') {
            context.log('[SubscriptionWebhook] Payment failed');

            await subscriptionService.updatePayment(dbPayment.id, {
                status: 'failed'
            });

            // Get subscription
            const subscription = await subscriptionService.getSubscriptionByUserId(dbPayment.abonnement_id);
            if (subscription) {
                // Suspend subscription on failed payment
                await subscriptionService.updateSubscription(subscription.id, {
                    status: 'suspended'
                });

                await subscriptionService.updateUserSubscriptionStatus(subscription.gebruiker_id, false);
                context.log('[SubscriptionWebhook] Subscription suspended due to failed payment');
            }

        } else if (payment.status === 'expired' || payment.status === 'canceled') {
            context.log('[SubscriptionWebhook] Payment expired or canceled');

            await subscriptionService.updatePayment(dbPayment.id, {
                status: 'failed'
            });
        }

        // Always return 200 OK to Mollie
        return createSuccessResponse({ message: 'Webhook processed' }, 200);

    } catch (error) {
        context.error('[SubscriptionWebhook] Error processing webhook:', error);
        // Still return 200 to Mollie to avoid infinite retries
        return createSuccessResponse({ message: 'Webhook error logged' }, 200);
    }
}

// Register Azure Function
app.http('subscriptionWebhook', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'subscription/webhook',
    handler: subscriptionWebhook,
});

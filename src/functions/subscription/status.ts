/**
 * Get Subscription Status Azure Function
 * GET /api/subscription/status
 * Returns current subscription status for authenticated user
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { SubscriptionService } from '../../services/subscription.service';

export async function getSubscriptionStatus(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // Authenticate user
        const userId = await requireAuthentication(request);
        context.log('[GetSubscriptionStatus] Request from user:', userId);

        const subscriptionService = new SubscriptionService();

        // Get user's subscription
        const subscription = await subscriptionService.getSubscriptionByUserId(userId);

        if (!subscription) {
            return createSuccessResponse({
                hasActiveSubscription: false,
                subscription: null,
                recentPayments: [],
                nextPaymentDate: null
            }, 200);
        }

        // Get recent payments
        const payments = await subscriptionService.getPaymentsBySubscriptionId(subscription.id);
        const recentPayments = payments.slice(0, 5); // Last 5 payments

        // Check if in trial period
        const now = new Date();
        const trialEndDate = subscription.trial_eind_datum ? new Date(subscription.trial_eind_datum) : null;
        const inTrialPeriod = trialEndDate ? now < trialEndDate : false;

        return createSuccessResponse({
            hasActiveSubscription: subscription.status === 'active',
            subscription: {
                id: subscription.id,
                planType: subscription.plan_type,
                status: subscription.status,
                startDatum: subscription.start_datum,
                eindDatum: subscription.eind_datum,
                trialEindDatum: subscription.trial_eind_datum,
                inTrialPeriod,
                maandelijksBedrag: subscription.maandelijks_bedrag,
                volgendeBetaling: subscription.volgende_betaling
            },
            recentPayments: recentPayments.map(p => ({
                id: p.id,
                bedrag: p.bedrag,
                status: p.status,
                betaalDatum: p.betaal_datum,
                aangemaaktOp: p.aangemaakt_op
            })),
            nextPaymentDate: subscription.volgende_betaling
        }, 200);

    } catch (error) {
        context.error('[GetSubscriptionStatus] Error:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij ophalen abonnement status',
            500
        );
    }
}

// Register Azure Function
app.http('getSubscriptionStatus', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'subscription/status',
    handler: getSubscriptionStatus,
});

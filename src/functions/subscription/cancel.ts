/**
 * Cancel Subscription Azure Function
 * POST /api/subscription/cancel
 * Cancels an active subscription
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { MollieService } from '../../services/mollie.service';
import { SubscriptionService } from '../../services/subscription.service';

export async function cancelSubscription(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // Authenticate user
        const userId = await requireAuthentication(request);
        context.log('[CancelSubscription] Request from user:', userId);

        const mollieService = new MollieService();
        const subscriptionService = new SubscriptionService();

        // Get user's subscription
        const subscription = await subscriptionService.getSubscriptionByUserId(userId);

        if (!subscription) {
            return createErrorResponse('Geen actief abonnement gevonden', 404);
        }

        if (subscription.status === 'canceled') {
            return createErrorResponse('Abonnement is al geannuleerd', 400);
        }

        // Cancel in Mollie if subscription ID exists
        if (subscription.mollie_subscription_id && subscription.mollie_customer_id) {
            context.log('[CancelSubscription] Canceling Mollie subscription:', subscription.mollie_subscription_id);

            await mollieService.cancelSubscription(
                subscription.mollie_customer_id,
                subscription.mollie_subscription_id
            );
        }

        // Cancel in database
        await subscriptionService.cancelSubscription(userId);

        context.log('[CancelSubscription] Subscription canceled for user:', userId);

        return createSuccessResponse({
            message: 'Abonnement succesvol geannuleerd',
            subscription: {
                id: subscription.id,
                status: 'canceled',
                eind_datum: new Date()
            }
        }, 200);

    } catch (error) {
        context.error('[CancelSubscription] Error:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij annuleren abonnement',
            500
        );
    }
}

// Register Azure Function
app.http('cancelSubscription', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'subscription/cancel',
    handler: cancelSubscription,
});

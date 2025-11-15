/**
 * Create Subscription Azure Function
 * POST /api/subscription/create
 * Creates a new subscription with Mollie and initiates first payment
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { MollieService } from '../../services/mollie.service';
import { SubscriptionService } from '../../services/subscription.service';
import { UserService } from '../../services/auth/user.service';
import { DatabaseService } from '../../services/database.service';

export async function createSubscription(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // Authenticate user
        const userId = await requireAuthentication(request);
        context.log('[CreateSubscription] Request from user:', userId);

        const mollieService = new MollieService();
        const subscriptionService = new SubscriptionService();
        const dbService = new DatabaseService();
        const userService = new UserService(dbService);

        // Check if user already has an active subscription
        const existingSubscription = await subscriptionService.getSubscriptionByUserId(userId);
        if (existingSubscription && existingSubscription.status === 'active') {
            return createErrorResponse('U heeft al een actief abonnement', 400);
        }

        // Get user details from database
        const user = await userService.getUserById(userId);
        if (!user) {
            return createErrorResponse('Gebruiker niet gevonden', 404);
        }

        // Create Mollie customer
        const customer = await mollieService.createCustomer({
            name: user.naam || user.email || 'Gebruiker',
            email: user.email || '',
            locale: 'nl_NL',
            metadata: {
                userId: userId.toString(),
                source: 'ouderschapsplan'
            }
        });

        context.log('[CreateSubscription] Mollie customer created:', customer.id);

        // Create subscription record in database (pending status)
        const subscription = await subscriptionService.createSubscription({
            gebruiker_id: userId,
            mollie_customer_id: customer.id,
            plan_type: 'basic',
            status: 'pending',
            maandelijks_bedrag: 19.99
        });

        context.log('[CreateSubscription] Subscription record created:', subscription.id);

        // Create first payment to establish mandate
        // Mollie requires a first payment before creating recurring subscriptions
        const webhookUrl = process.env.WEBHOOK_URL || 'https://ouderschaps-api-fvgbfwachxabawgs.westeurope-01.azurewebsites.net/api/subscription/webhook';
        const redirectUrl = process.env.REDIRECT_URL || 'https://app.scheidingsdesk.nl/dossiers';

        const payment = await mollieService.createFirstPayment({
            customerId: customer.id,
            amount: {
                value: '19.99',
                currency: 'EUR'
            },
            description: 'Ouderschapsplan Basis Abonnement - Eerste betaling',
            redirectUrl: `${redirectUrl}?subscriptionCreated=true`,
            webhookUrl,
            metadata: {
                userId: userId.toString(),
                subscriptionId: subscription.id.toString(),
                type: 'first_payment'
            }
        });

        context.log('[CreateSubscription] First payment created:', payment.id);

        // Create payment record in database
        await subscriptionService.createPayment({
            abonnement_id: subscription.id,
            mollie_payment_id: payment.id,
            bedrag: 19.99,
            btw_bedrag: 19.99 * 0.21, // 21% BTW
            status: 'pending'
        });

        // Return checkout URL to frontend
        return createSuccessResponse({
            checkoutUrl: payment.getCheckoutUrl(),
            subscriptionId: subscription.id,
            paymentId: payment.id,
            customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email
            }
        }, 201);

    } catch (error) {
        context.error('[CreateSubscription] Error:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij aanmaken abonnement',
            500
        );
    }
}

// Register Azure Function
app.http('createSubscription', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'subscription/create',
    handler: createSubscription,
});

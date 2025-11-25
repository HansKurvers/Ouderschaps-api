/**
 * Create Subscription Azure Function
 * POST /api/subscription/create
 * Creates a new subscription with Mollie and initiates first payment
 *
 * TRIAL ABUSE PREVENTION:
 * - Users who have already used their trial get NO 7-day free period
 * - Mollie customers are reused per user to maintain history
 * - trial_used flag is checked before granting trial period
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

        // ==== TRIAL ABUSE PREVENTION ====
        // Get trial info: check if user already used trial and get existing Mollie customer ID
        const trialInfo = await subscriptionService.getTrialInfo(userId);
        const hasUsedTrial = trialInfo.trialUsed;
        const existingMollieCustomerId = trialInfo.mollieCustomerId;

        context.log('[CreateSubscription] Trial info:', {
            userId,
            hasUsedTrial,
            existingMollieCustomerId: existingMollieCustomerId ? 'exists' : 'none'
        });

        // Get or create Mollie customer (reuse existing to maintain history)
        const { customer, isExisting } = await mollieService.getOrCreateCustomer(
            existingMollieCustomerId,
            {
                name: user.naam || user.email || 'Gebruiker',
                email: user.email || '',
                locale: 'nl_NL',
                metadata: {
                    userId: userId.toString(),
                    source: 'ouderschapsplan'
                }
            }
        );

        context.log('[CreateSubscription] Mollie customer:', {
            customerId: customer.id,
            isExisting
        });

        // Save Mollie customer ID to user if new
        if (!isExisting) {
            await subscriptionService.saveMollieCustomerIdToUser(userId, customer.id);
        }

        // Determine trial period based on usage
        // If user has used trial before: NO trial period (null)
        // If user is new: 7 day trial period
        let trialEindDatum: Date | undefined;
        let description: string;

        if (hasUsedTrial) {
            // NO trial - user already had one
            trialEindDatum = undefined; // No trial
            description = 'Ouderschapsplan Basis Abonnement - Direct actief';
            context.log('[CreateSubscription] User already used trial, no free period');
        } else {
            // Grant 7-day trial
            trialEindDatum = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            description = 'Ouderschapsplan Basis Abonnement - 7 dagen proefperiode';
            // Mark trial as used BEFORE creating subscription
            await subscriptionService.markTrialUsed(userId);
            context.log('[CreateSubscription] Granting 7-day trial until:', trialEindDatum);
        }

        // Create subscription record in database (pending status)
        const subscription = await subscriptionService.createSubscription({
            gebruiker_id: userId,
            mollie_customer_id: customer.id,
            plan_type: 'basic',
            status: 'pending',
            trial_eind_datum: trialEindDatum,
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
            description,
            redirectUrl: `${redirectUrl}?subscriptionCreated=true`,
            webhookUrl,
            metadata: {
                userId: userId.toString(),
                subscriptionId: subscription.id.toString(),
                type: 'first_payment',
                hasTrial: (!hasUsedTrial).toString()
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
            },
            // Inform frontend about trial status
            trialInfo: {
                hasTrial: !hasUsedTrial,
                trialEndDate: trialEindDatum || null,
                message: hasUsedTrial
                    ? 'Uw proefperiode is al gebruikt. Het abonnement wordt direct actief na betaling.'
                    : 'U krijgt 7 dagen gratis proefperiode.'
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

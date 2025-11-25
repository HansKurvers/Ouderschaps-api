/**
 * Create Subscription Azure Function
 * POST /api/subscription/create
 * Creates a new subscription with Mollie and initiates first payment
 *
 * FEATURES:
 * - Trial abuse prevention (users who used trial don't get another)
 * - Voucher/discount code support
 * - Gratis vouchers bypass Mollie entirely
 * - Mollie customers are reused per user to maintain history
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { MollieService } from '../../services/mollie.service';
import { SubscriptionService } from '../../services/subscription.service';
import { UserService } from '../../services/auth/user.service';
import { DatabaseService } from '../../services/database.service';
import voucherService, { Voucher, AppliedVoucher } from '../../services/voucher.service';

interface CreateSubscriptionRequest {
    voucherCode?: string;
}

const NORMALE_PRIJS = 19.99;

export async function createSubscription(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // Authenticate user
        const userId = await requireAuthentication(request);
        context.log('[CreateSubscription] Request from user:', userId);

        // Parse request body for optional voucher code
        let voucherCode: string | undefined;
        try {
            const body = await request.json() as CreateSubscriptionRequest;
            voucherCode = body?.voucherCode?.trim();
        } catch {
            // Empty body is OK
        }

        const mollieService = new MollieService();
        const subscriptionService = new SubscriptionService();
        const dbService = new DatabaseService();
        const userService = new UserService(dbService);

        // Check if user already has an active subscription
        const existingSubscription = await subscriptionService.getSubscriptionByUserId(userId);
        if (existingSubscription && existingSubscription.status === 'active') {
            return createErrorResponse('U heeft al een actief abonnement', 400);
        }

        // Handle existing subscription that needs reactivation (pending, canceled, or suspended)
        // This covers: abandoned checkout (pending), canceled subscription, or failed payment (suspended)
        if (existingSubscription && (existingSubscription.status === 'pending' || existingSubscription.status === 'canceled' || existingSubscription.status === 'suspended')) {
            context.log('[CreateSubscription] Found existing subscription to reactivate:', {
                id: existingSubscription.id,
                status: existingSubscription.status,
                mollieCustomerId: existingSubscription.mollie_customer_id
            });

            const customerId = existingSubscription.mollie_customer_id;

            if (!customerId) {
                // Edge case: pending subscription without customer ID - should not happen, but handle gracefully
                context.log('[CreateSubscription] Pending subscription has no Mollie customer, this is unexpected');
                return createErrorResponse('Er is een probleem met uw eerdere aanmelding. Neem contact op met support.', 500);
            }

            {
                // Reuse existing pending subscription
                const mollieServiceRetry = new MollieService();
                const dbServiceRetry = new DatabaseService();
                const userServiceRetry = new UserService(dbServiceRetry);

                // Get user details
                const userRetry = await userServiceRetry.getUserById(userId);
                if (!userRetry) {
                    return createErrorResponse('Gebruiker niet gevonden', 404);
                }

                // Handle voucher: use new one from request, or fall back to existing on subscription
                let effectiveVoucher: Voucher | null = null;
                let effectiveAppliedVoucher: AppliedVoucher | null = null;

                if (voucherCode) {
                    // New voucher provided - validate and use it
                    const voucherResult = await voucherService.validateVoucher(voucherCode, userId);
                    if (!voucherResult.valid) {
                        return createErrorResponse(`Ongeldige vouchercode: ${voucherResult.reden}`, 400);
                    }
                    effectiveVoucher = voucherResult.voucher!;
                    effectiveAppliedVoucher = voucherService.calculateAppliedVoucher(effectiveVoucher);
                    context.log('[CreateSubscription] Using new voucher for retry:', effectiveVoucher.code);
                } else if (existingSubscription.voucher_id) {
                    // No new voucher, but existing subscription has one - reuse it
                    const existingVoucherInfo = await voucherService.getVoucherById(existingSubscription.voucher_id);
                    if (existingVoucherInfo) {
                        effectiveVoucher = existingVoucherInfo;
                        effectiveAppliedVoucher = voucherService.calculateAppliedVoucher(existingVoucherInfo);
                        context.log('[CreateSubscription] Reusing existing voucher:', effectiveVoucher.code);
                    }
                }

                // Calculate price
                const prijs = effectiveAppliedVoucher?.nieuwe_prijs ?? existingSubscription.maandelijks_bedrag ?? NORMALE_PRIJS;
                const trialEindDatum = existingSubscription.trial_eind_datum;

                // Build description
                let description: string;
                if (effectiveVoucher?.type === 'maanden_gratis') {
                    const maanden = effectiveVoucher.waarde || 0;
                    description = `Ouderschapsplan Basis Abonnement - ${maanden} maand${maanden > 1 ? 'en' : ''} gratis`;
                } else if (trialEindDatum) {
                    description = 'Ouderschapsplan Basis Abonnement - Proefperiode';
                } else if (effectiveAppliedVoucher) {
                    description = `Ouderschapsplan Basis Abonnement - ${effectiveAppliedVoucher.korting} korting`;
                } else {
                    description = 'Ouderschapsplan Basis Abonnement';
                }

                // Create new payment for existing subscription
                const webhookUrl = process.env.WEBHOOK_URL || 'https://ouderschaps-api-fvgbfwachxabawgs.westeurope-01.azurewebsites.net/api/subscription/webhook';
                const redirectUrl = process.env.REDIRECT_URL || 'https://app.scheidingsdesk.nl/dossiers';

                const payment = await mollieServiceRetry.createFirstPayment({
                    customerId,
                    amount: { value: prijs.toFixed(2), currency: 'EUR' },
                    description,
                    redirectUrl: `${redirectUrl}?subscriptionCreated=true`,
                    webhookUrl,
                    metadata: {
                        userId: userId.toString(),
                        subscriptionId: existingSubscription.id.toString(),
                        type: 'first_payment',
                        hasTrial: (trialEindDatum !== undefined).toString(),
                        isRetry: 'true',
                        voucherCode: effectiveVoucher?.code || ''
                    }
                });

                context.log('[CreateSubscription] Retry payment created:', payment.id);

                // Create new payment record
                await subscriptionService.createPayment({
                    abonnement_id: existingSubscription.id,
                    mollie_payment_id: payment.id,
                    bedrag: prijs,
                    btw_bedrag: prijs * 0.21,
                    status: 'pending'
                });

                // Build trial message based on subscription status and voucher
                let trialMessage: string;
                const isReactivation = existingSubscription.status === 'canceled' || existingSubscription.status === 'suspended';

                if (effectiveVoucher?.type === 'maanden_gratis') {
                    const maanden = effectiveVoucher.waarde || 0;
                    trialMessage = `U krijgt ${maanden} maand${maanden > 1 ? 'en' : ''} gratis via uw vouchercode.`;
                } else if (trialEindDatum && !isReactivation) {
                    trialMessage = 'Vervolg uw eerdere aanmelding met proefperiode.';
                } else if (isReactivation) {
                    trialMessage = effectiveAppliedVoucher
                        ? `${effectiveAppliedVoucher.korting} korting toegepast. Uw abonnement wordt opnieuw geactiveerd na betaling.`
                        : 'Uw abonnement wordt opnieuw geactiveerd na betaling.';
                } else {
                    trialMessage = effectiveAppliedVoucher
                        ? `${effectiveAppliedVoucher.korting} korting toegepast. Het abonnement wordt direct actief na betaling.`
                        : 'Vervolg uw eerdere aanmelding.';
                }

                return createSuccessResponse({
                    checkoutUrl: payment.getCheckoutUrl(),
                    subscriptionId: existingSubscription.id,
                    paymentId: payment.id,
                    customer: { id: customerId },
                    isGratis: false,
                    isRetry: true,
                    isReactivation,
                    previousStatus: existingSubscription.status,
                    voucherToegepast: effectiveAppliedVoucher,
                    trialInfo: {
                        hasTrial: trialEindDatum !== undefined && !isReactivation,
                        trialEndDate: (!isReactivation && trialEindDatum) || null,
                        message: trialMessage
                    }
                }, 200);
            }
        }
        // If we reach here, either no existing subscription or it was handled above

        // Get user details from database
        const user = await userService.getUserById(userId);
        if (!user) {
            return createErrorResponse('Gebruiker niet gevonden', 404);
        }

        // ==== VOUCHER VALIDATION ====
        let validatedVoucher: Voucher | null = null;
        let appliedVoucher: AppliedVoucher | null = null;

        if (voucherCode) {
            context.log('[CreateSubscription] Validating voucher:', voucherCode);
            const voucherResult = await voucherService.validateVoucher(voucherCode, userId);

            if (!voucherResult.valid) {
                return createErrorResponse(`Ongeldige vouchercode: ${voucherResult.reden}`, 400);
            }

            validatedVoucher = voucherResult.voucher!;
            appliedVoucher = voucherService.calculateAppliedVoucher(validatedVoucher);
            context.log('[CreateSubscription] Voucher validated:', {
                code: validatedVoucher.code,
                type: validatedVoucher.type,
                isGratis: appliedVoucher.is_volledig_gratis
            });
        }

        // ==== GRATIS VOUCHER FLOW (skip Mollie entirely) ====
        if (validatedVoucher && appliedVoucher?.is_volledig_gratis) {
            context.log('[CreateSubscription] Creating FREE subscription via voucher');

            // Create subscription directly as active (no Mollie)
            const subscription = await subscriptionService.createSubscriptionWithVoucher({
                gebruiker_id: userId,
                plan_type: 'basic',
                status: 'active',
                maandelijks_bedrag: 0,
                voucher_id: validatedVoucher.id,
                voucher_code: validatedVoucher.code,
                is_gratis_via_voucher: true
            });

            // Record voucher usage
            await voucherService.applyVoucher(
                validatedVoucher.id,
                userId,
                subscription.id,
                NORMALE_PRIJS // Full discount
            );

            // Update user subscription status
            await subscriptionService.updateUserSubscriptionStatus(userId, true);

            context.log('[CreateSubscription] FREE subscription created:', subscription.id);

            return createSuccessResponse({
                subscriptionId: subscription.id,
                checkoutUrl: null,
                paymentId: null,
                customer: null,
                isGratis: true,
                voucherToegepast: appliedVoucher,
                trialInfo: {
                    hasTrial: false,
                    trialEndDate: null,
                    message: 'Uw abonnement is direct actief via de vouchercode.'
                }
            }, 201);
        }

        // ==== NORMAL FLOW (with or without discount voucher) ====

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

        // Calculate price and trial period
        let prijs = NORMALE_PRIJS;
        let trialEindDatum: Date | undefined;
        let description: string;

        // Apply voucher discount if present
        if (validatedVoucher && appliedVoucher) {
            switch (validatedVoucher.type) {
                case 'percentage':
                    prijs = appliedVoucher.nieuwe_prijs || NORMALE_PRIJS;
                    break;
                case 'vast_bedrag':
                    prijs = appliedVoucher.nieuwe_prijs || NORMALE_PRIJS;
                    break;
                case 'maanden_gratis':
                    // First payment(s) are free, handled via trial period extension
                    const gratisMaanden = validatedVoucher.waarde || 0;
                    trialEindDatum = new Date(Date.now() + gratisMaanden * 30 * 24 * 60 * 60 * 1000);
                    description = `Ouderschapsplan Basis Abonnement - ${gratisMaanden} maand${gratisMaanden > 1 ? 'en' : ''} gratis`;
                    break;
            }
        }

        // If no voucher-based trial, check normal trial eligibility
        if (!trialEindDatum) {
            if (hasUsedTrial) {
                trialEindDatum = undefined;
                description = validatedVoucher
                    ? `Ouderschapsplan Basis Abonnement - ${appliedVoucher?.korting} korting`
                    : 'Ouderschapsplan Basis Abonnement - Direct actief';
                context.log('[CreateSubscription] User already used trial, no free period');
            } else {
                trialEindDatum = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                description = 'Ouderschapsplan Basis Abonnement - 7 dagen proefperiode';
                await subscriptionService.markTrialUsed(userId);
                context.log('[CreateSubscription] Granting 7-day trial until:', trialEindDatum);
            }
        }

        // Create subscription record in database (pending status)
        const subscriptionParams: any = {
            gebruiker_id: userId,
            mollie_customer_id: customer.id,
            plan_type: 'basic',
            status: 'pending',
            trial_eind_datum: trialEindDatum,
            maandelijks_bedrag: prijs
        };

        if (validatedVoucher) {
            subscriptionParams.voucher_id = validatedVoucher.id;
            subscriptionParams.voucher_code = validatedVoucher.code;
        }

        const subscription = validatedVoucher
            ? await subscriptionService.createSubscriptionWithVoucher(subscriptionParams)
            : await subscriptionService.createSubscription(subscriptionParams);

        context.log('[CreateSubscription] Subscription record created:', subscription.id);

        // Record voucher usage if applicable
        if (validatedVoucher) {
            const kortingToegepast = NORMALE_PRIJS - prijs;
            await voucherService.applyVoucher(
                validatedVoucher.id,
                userId,
                subscription.id,
                kortingToegepast > 0 ? kortingToegepast : null
            );
        }

        // Create first payment to establish mandate
        const webhookUrl = process.env.WEBHOOK_URL || 'https://ouderschaps-api-fvgbfwachxabawgs.westeurope-01.azurewebsites.net/api/subscription/webhook';
        const redirectUrl = process.env.REDIRECT_URL || 'https://app.scheidingsdesk.nl/dossiers';

        const payment = await mollieService.createFirstPayment({
            customerId: customer.id,
            amount: {
                value: prijs.toFixed(2),
                currency: 'EUR'
            },
            description: description!,
            redirectUrl: `${redirectUrl}?subscriptionCreated=true`,
            webhookUrl,
            metadata: {
                userId: userId.toString(),
                subscriptionId: subscription.id.toString(),
                type: 'first_payment',
                hasTrial: (trialEindDatum !== undefined).toString(),
                voucherCode: validatedVoucher?.code || ''
            }
        });

        context.log('[CreateSubscription] First payment created:', payment.id);

        // Create payment record in database
        await subscriptionService.createPayment({
            abonnement_id: subscription.id,
            mollie_payment_id: payment.id,
            bedrag: prijs,
            btw_bedrag: prijs * 0.21,
            status: 'pending'
        });

        // Build trial message
        let trialMessage: string;
        if (validatedVoucher?.type === 'maanden_gratis') {
            const maanden = validatedVoucher.waarde || 0;
            trialMessage = `U krijgt ${maanden} maand${maanden > 1 ? 'en' : ''} gratis via uw vouchercode.`;
        } else if (trialEindDatum && !hasUsedTrial) {
            trialMessage = 'U krijgt 7 dagen gratis proefperiode.';
        } else {
            trialMessage = validatedVoucher
                ? `${appliedVoucher?.korting} korting toegepast. Het abonnement wordt direct actief na betaling.`
                : 'Uw proefperiode is al gebruikt. Het abonnement wordt direct actief na betaling.';
        }

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
            isGratis: false,
            voucherToegepast: appliedVoucher,
            trialInfo: {
                hasTrial: trialEindDatum !== undefined,
                trialEndDate: trialEindDatum || null,
                message: trialMessage
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

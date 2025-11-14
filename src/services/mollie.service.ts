/**
 * Mollie API Service
 * Handles all interactions with Mollie Payment API for subscriptions
 */

import createMollieClient, { type MollieClient, Customer, Subscription, Payment, Mandate } from '@mollie/api-client';

export class MollieService {
    private client: MollieClient;

    constructor() {
        const apiKey = process.env.MOLLIE_API_KEY || process.env.MOLLIE_API_KEY_LIVE;

        if (!apiKey) {
            throw new Error('Mollie API key not configured. Set MOLLIE_API_KEY in environment variables.');
        }

        this.client = createMollieClient({ apiKey });
        console.log('[MollieService] Initialized with API key:', apiKey.substring(0, 10) + '...');
    }

    /**
     * Create a new Mollie customer
     */
    async createCustomer(userData: {
        name: string;
        email: string;
        locale?: string;
        metadata?: Record<string, any>;
    }): Promise<Customer> {
        try {
            console.log('[MollieService] Creating customer:', userData.email);

            const customer = await this.client.customers.create({
                name: userData.name,
                email: userData.email,
                locale: (userData.locale || 'nl_NL') as any,
                metadata: userData.metadata || {},
            });

            console.log('[MollieService] Customer created:', customer.id);
            return customer;
        } catch (error) {
            console.error('[MollieService] Error creating customer:', error);
            throw new Error(`Failed to create Mollie customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get customer by ID
     */
    async getCustomer(customerId: string): Promise<Customer> {
        try {
            const customer = await this.client.customers.get(customerId);
            return customer;
        } catch (error) {
            console.error('[MollieService] Error fetching customer:', error);
            throw new Error(`Failed to fetch Mollie customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create a subscription for a customer
     * Note: Customer must have a valid mandate first (created via first payment)
     */
    async createSubscription(params: {
        customerId: string;
        amount: { value: string; currency: string };
        interval: string;
        description: string;
        webhookUrl: string;
        mandateId?: string;
        metadata?: Record<string, any>;
    }): Promise<Subscription> {
        try {
            console.log('[MollieService] Creating subscription for customer:', params.customerId);

            const subscription = await this.client.customerSubscriptions.create({
                customerId: params.customerId,
                amount: params.amount,
                interval: params.interval,
                description: params.description,
                webhookUrl: params.webhookUrl,
                mandateId: params.mandateId,
                metadata: params.metadata || {},
            });

            console.log('[MollieService] Subscription created:', subscription.id);
            return subscription;
        } catch (error) {
            console.error('[MollieService] Error creating subscription:', error);
            throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get subscription details
     */
    async getSubscription(customerId: string, subscriptionId: string): Promise<Subscription> {
        try {
            const subscription = await this.client.customerSubscriptions.get(subscriptionId, {
                customerId,
            });
            return subscription;
        } catch (error) {
            console.error('[MollieService] Error fetching subscription:', error);
            throw new Error(`Failed to fetch subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Cancel a subscription
     */
    async cancelSubscription(customerId: string, subscriptionId: string): Promise<Subscription> {
        try {
            console.log('[MollieService] Canceling subscription:', subscriptionId);

            const subscription = await this.client.customerSubscriptions.cancel(subscriptionId, {
                customerId,
            });

            console.log('[MollieService] Subscription canceled:', subscription.id);
            return subscription;
        } catch (error) {
            console.error('[MollieService] Error canceling subscription:', error);
            throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get payment details
     */
    async getPayment(paymentId: string): Promise<Payment> {
        try {
            const payment = await this.client.payments.get(paymentId);
            return payment;
        } catch (error) {
            console.error('[MollieService] Error fetching payment:', error);
            throw new Error(`Failed to fetch payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * List all mandates for a customer
     */
    async getMandates(customerId: string): Promise<Mandate[]> {
        try {
            const mandates = await this.client.customerMandates.page({ customerId });
            return mandates;
        } catch (error) {
            console.error('[MollieService] Error fetching mandates:', error);
            throw new Error(`Failed to fetch mandates: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get the first valid mandate for a customer
     */
    async getValidMandate(customerId: string): Promise<Mandate | null> {
        try {
            const mandates = await this.getMandates(customerId);
            const validMandate = mandates.find(m => m.status === 'valid');
            return validMandate || null;
        } catch (error) {
            console.error('[MollieService] Error getting valid mandate:', error);
            return null;
        }
    }

    /**
     * Create a first payment to establish a mandate
     * Returns the checkout URL for the customer to complete payment
     */
    async createFirstPayment(params: {
        customerId: string;
        amount: { value: string; currency: string };
        description: string;
        redirectUrl: string;
        webhookUrl: string;
        metadata?: Record<string, any>;
    }): Promise<Payment> {
        try {
            console.log('[MollieService] Creating first payment for customer:', params.customerId);

            const payment = await this.client.payments.create({
                customerId: params.customerId,
                amount: params.amount,
                description: params.description,
                redirectUrl: params.redirectUrl,
                webhookUrl: params.webhookUrl,
                sequenceType: 'first' as any, // This creates a mandate
                method: 'ideal' as any, // Use iDEAL for SEPA Direct Debit mandate (most common in NL)
                metadata: params.metadata || {},
            });

            console.log('[MollieService] First payment created:', payment.id);
            return payment;
        } catch (error) {
            console.error('[MollieService] Error creating first payment:', error);
            throw new Error(`Failed to create first payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * List subscription payments
     */
    async getSubscriptionPayments(customerId: string, subscriptionId: string): Promise<Payment[]> {
        try {
            const payments = await this.client.subscriptionPayments.page({
                customerId,
                subscriptionId,
            });
            return payments;
        } catch (error) {
            console.error('[MollieService] Error fetching subscription payments:', error);
            throw new Error(`Failed to fetch subscription payments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

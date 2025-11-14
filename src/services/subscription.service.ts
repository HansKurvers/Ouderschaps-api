/**
 * Subscription Database Service
 * Handles all database operations for subscriptions and payments
 */

import sql from 'mssql';
import { getPool } from '../config/database';

export interface Abonnement {
    id: number;
    gebruiker_id: number;
    mollie_customer_id: string | null;
    mollie_subscription_id: string | null;
    mollie_mandate_id: string | null;
    plan_type: string;
    status: 'active' | 'canceled' | 'suspended' | 'pending';
    start_datum: Date;
    eind_datum: Date | null;
    trial_eind_datum: Date | null;
    maandelijks_bedrag: number;
    volgende_betaling: Date | null;
    aangemaakt_op: Date;
    gewijzigd_op: Date;
}

export interface Betaling {
    id: number;
    abonnement_id: number;
    mollie_payment_id: string | null;
    mollie_invoice_id: string | null;
    bedrag: number;
    btw_bedrag: number;
    status: 'paid' | 'failed' | 'pending' | 'open';
    factuur_pdf_url: string | null;
    betaal_datum: Date | null;
    aangemaakt_op: Date;
}

export class SubscriptionService {
    /**
     * Create a new subscription in database
     */
    async createSubscription(params: {
        gebruiker_id: number;
        mollie_customer_id?: string;
        mollie_subscription_id?: string;
        mollie_mandate_id?: string;
        plan_type?: string;
        status?: string;
        trial_eind_datum?: Date;
        maandelijks_bedrag?: number;
    }): Promise<Abonnement> {
        const pool = await getPool();

        try {
            const startDatum = new Date();
            const trialEindDatum = params.trial_eind_datum || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

            const result = await pool.request()
                .input('gebruiker_id', sql.Int, params.gebruiker_id)
                .input('mollie_customer_id', sql.NVarChar(50), params.mollie_customer_id || null)
                .input('mollie_subscription_id', sql.NVarChar(50), params.mollie_subscription_id || null)
                .input('mollie_mandate_id', sql.NVarChar(50), params.mollie_mandate_id || null)
                .input('plan_type', sql.NVarChar(20), params.plan_type || 'basic')
                .input('status', sql.NVarChar(20), params.status || 'pending')
                .input('start_datum', sql.Date, startDatum)
                .input('trial_eind_datum', sql.Date, trialEindDatum)
                .input('maandelijks_bedrag', sql.Decimal(10, 2), params.maandelijks_bedrag || 19.99)
                .query(`
                    INSERT INTO dbo.abonnementen (
                        gebruiker_id, mollie_customer_id, mollie_subscription_id, mollie_mandate_id,
                        plan_type, status, start_datum, trial_eind_datum, maandelijks_bedrag
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @gebruiker_id, @mollie_customer_id, @mollie_subscription_id, @mollie_mandate_id,
                        @plan_type, @status, @start_datum, @trial_eind_datum, @maandelijks_bedrag
                    )
                `);

            console.log('[SubscriptionService] Subscription created for user:', params.gebruiker_id);
            return result.recordset[0] as Abonnement;
        } catch (error) {
            console.error('[SubscriptionService] Error creating subscription:', error);
            throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get subscription by user ID
     */
    async getSubscriptionByUserId(userId: number): Promise<Abonnement | null> {
        const pool = await getPool();

        try {
            const result = await pool.request()
                .input('gebruiker_id', sql.Int, userId)
                .query(`
                    SELECT TOP 1 *
                    FROM dbo.abonnementen
                    WHERE gebruiker_id = @gebruiker_id
                    ORDER BY aangemaakt_op DESC
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('[SubscriptionService] Error fetching subscription:', error);
            throw new Error(`Failed to fetch subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get subscription by Mollie subscription ID
     */
    async getSubscriptionByMollieId(mollieSubscriptionId: string): Promise<Abonnement | null> {
        const pool = await getPool();

        try {
            const result = await pool.request()
                .input('mollie_subscription_id', sql.NVarChar(50), mollieSubscriptionId)
                .query(`
                    SELECT TOP 1 *
                    FROM dbo.abonnementen
                    WHERE mollie_subscription_id = @mollie_subscription_id
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('[SubscriptionService] Error fetching subscription by Mollie ID:', error);
            throw new Error(`Failed to fetch subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update subscription status and Mollie IDs
     */
    async updateSubscription(subscriptionId: number, updates: Partial<Abonnement>): Promise<void> {
        const pool = await getPool();

        try {
            const setClauses: string[] = [];
            const request = pool.request().input('id', sql.Int, subscriptionId);

            if (updates.status !== undefined) {
                setClauses.push('status = @status');
                request.input('status', sql.NVarChar(20), updates.status);
            }
            if (updates.mollie_subscription_id !== undefined) {
                setClauses.push('mollie_subscription_id = @mollie_subscription_id');
                request.input('mollie_subscription_id', sql.NVarChar(50), updates.mollie_subscription_id);
            }
            if (updates.mollie_mandate_id !== undefined) {
                setClauses.push('mollie_mandate_id = @mollie_mandate_id');
                request.input('mollie_mandate_id', sql.NVarChar(50), updates.mollie_mandate_id);
            }
            if (updates.eind_datum !== undefined) {
                setClauses.push('eind_datum = @eind_datum');
                request.input('eind_datum', sql.Date, updates.eind_datum);
            }
            if (updates.volgende_betaling !== undefined) {
                setClauses.push('volgende_betaling = @volgende_betaling');
                request.input('volgende_betaling', sql.Date, updates.volgende_betaling);
            }

            setClauses.push('gewijzigd_op = GETDATE()');

            await request.query(`
                UPDATE dbo.abonnementen
                SET ${setClauses.join(', ')}
                WHERE id = @id
            `);

            console.log('[SubscriptionService] Subscription updated:', subscriptionId);
        } catch (error) {
            console.error('[SubscriptionService] Error updating subscription:', error);
            throw new Error(`Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update user's active subscription flag
     */
    async updateUserSubscriptionStatus(userId: number, hasActiveSubscription: boolean): Promise<void> {
        const pool = await getPool();

        try {
            await pool.request()
                .input('gebruiker_id', sql.Int, userId)
                .input('has_active_subscription', sql.Bit, hasActiveSubscription)
                .query(`
                    UPDATE dbo.gebruikers
                    SET has_active_subscription = @has_active_subscription
                    WHERE id = @gebruiker_id
                `);

            console.log('[SubscriptionService] User subscription status updated:', userId, hasActiveSubscription);
        } catch (error) {
            console.error('[SubscriptionService] Error updating user subscription status:', error);
            throw new Error(`Failed to update user status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(userId: number): Promise<void> {
        const pool = await getPool();

        try {
            await pool.request()
                .input('gebruiker_id', sql.Int, userId)
                .input('eind_datum', sql.Date, new Date())
                .query(`
                    UPDATE dbo.abonnementen
                    SET status = 'canceled', eind_datum = @eind_datum, gewijzigd_op = GETDATE()
                    WHERE gebruiker_id = @gebruiker_id AND status = 'active'
                `);

            await this.updateUserSubscriptionStatus(userId, false);

            console.log('[SubscriptionService] Subscription canceled for user:', userId);
        } catch (error) {
            console.error('[SubscriptionService] Error canceling subscription:', error);
            throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create payment record
     */
    async createPayment(params: {
        abonnement_id: number;
        mollie_payment_id?: string;
        bedrag: number;
        btw_bedrag?: number;
        status?: string;
    }): Promise<Betaling> {
        const pool = await getPool();

        try {
            const result = await pool.request()
                .input('abonnement_id', sql.Int, params.abonnement_id)
                .input('mollie_payment_id', sql.NVarChar(50), params.mollie_payment_id || null)
                .input('bedrag', sql.Decimal(10, 2), params.bedrag)
                .input('btw_bedrag', sql.Decimal(10, 2), params.btw_bedrag || 0)
                .input('status', sql.NVarChar(20), params.status || 'pending')
                .query(`
                    INSERT INTO dbo.betalingen (
                        abonnement_id, mollie_payment_id, bedrag, btw_bedrag, status
                    )
                    OUTPUT INSERTED.*
                    VALUES (
                        @abonnement_id, @mollie_payment_id, @bedrag, @btw_bedrag, @status
                    )
                `);

            console.log('[SubscriptionService] Payment created:', result.recordset[0].id);
            return result.recordset[0] as Betaling;
        } catch (error) {
            console.error('[SubscriptionService] Error creating payment:', error);
            throw new Error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update payment status
     */
    async updatePayment(paymentId: number, updates: Partial<Betaling>): Promise<void> {
        const pool = await getPool();

        try {
            const setClauses: string[] = [];
            const request = pool.request().input('id', sql.Int, paymentId);

            if (updates.status !== undefined) {
                setClauses.push('status = @status');
                request.input('status', sql.NVarChar(20), updates.status);
            }
            if (updates.betaal_datum !== undefined) {
                setClauses.push('betaal_datum = @betaal_datum');
                request.input('betaal_datum', sql.DateTime, updates.betaal_datum);
            }
            if (updates.factuur_pdf_url !== undefined) {
                setClauses.push('factuur_pdf_url = @factuur_pdf_url');
                request.input('factuur_pdf_url', sql.NVarChar(500), updates.factuur_pdf_url);
            }

            if (setClauses.length === 0) return;

            await request.query(`
                UPDATE dbo.betalingen
                SET ${setClauses.join(', ')}
                WHERE id = @id
            `);

            console.log('[SubscriptionService] Payment updated:', paymentId);
        } catch (error) {
            console.error('[SubscriptionService] Error updating payment:', error);
            throw new Error(`Failed to update payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get payments for subscription
     */
    async getPaymentsBySubscriptionId(subscriptionId: number): Promise<Betaling[]> {
        const pool = await getPool();

        try {
            const result = await pool.request()
                .input('abonnement_id', sql.Int, subscriptionId)
                .query(`
                    SELECT *
                    FROM dbo.betalingen
                    WHERE abonnement_id = @abonnement_id
                    ORDER BY aangemaakt_op DESC
                `);

            return result.recordset as Betaling[];
        } catch (error) {
            console.error('[SubscriptionService] Error fetching payments:', error);
            throw new Error(`Failed to fetch payments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get payment by Mollie payment ID
     */
    async getPaymentByMollieId(molliePaymentId: string): Promise<Betaling | null> {
        const pool = await getPool();

        try {
            const result = await pool.request()
                .input('mollie_payment_id', sql.NVarChar(50), molliePaymentId)
                .query(`
                    SELECT TOP 1 *
                    FROM dbo.betalingen
                    WHERE mollie_payment_id = @mollie_payment_id
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('[SubscriptionService] Error fetching payment by Mollie ID:', error);
            throw new Error(`Failed to fetch payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

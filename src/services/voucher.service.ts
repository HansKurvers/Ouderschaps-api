/**
 * Voucher Service
 * Handles voucher validation, application, and tracking
 */

import sql from 'mssql';
import { getPool } from '../config/database';

// Voucher types
export type VoucherType = 'gratis' | 'percentage' | 'maanden_gratis' | 'vast_bedrag';

export interface Voucher {
    id: number;
    code: string;
    naam: string;
    omschrijving: string | null;
    type: VoucherType;
    waarde: number | null;
    max_gebruik: number | null;
    max_per_gebruiker: number;
    geldig_van: Date;
    geldig_tot: Date | null;
    is_actief: boolean;
    aantal_gebruikt: number;
    aangemaakt_op: Date;
    gewijzigd_op: Date;
}

export interface VoucherGebruik {
    id: number;
    voucher_id: number;
    gebruiker_id: number;
    abonnement_id: number | null;
    korting_toegepast: number | null;
    gebruikt_op: Date;
}

export interface VoucherValidationResult {
    valid: boolean;
    code?: string;
    naam?: string;
    type?: VoucherType;
    waarde?: number | null;
    omschrijving_klant?: string;
    nieuwe_prijs?: number;
    normale_prijs?: number;
    gratis_maanden?: number;
    reden?: string;
    voucher?: Voucher;
}

export interface AppliedVoucher {
    code: string;
    type: VoucherType;
    korting?: string;
    nieuwe_prijs?: number;
    gratis_maanden?: number;
    is_volledig_gratis: boolean;
}

const NORMALE_PRIJS = 19.99;

export class VoucherService {
    /**
     * Get voucher by code
     */
    async getVoucherByCode(code: string): Promise<Voucher | null> {
        const pool = await getPool();

        try {
            const result = await pool.request()
                .input('code', sql.NVarChar(50), code.toUpperCase().trim())
                .query(`
                    SELECT *
                    FROM dbo.vouchers
                    WHERE UPPER(code) = @code
                `);

            return result.recordset[0] || null;
        } catch (error) {
            console.error('[VoucherService] Error fetching voucher:', error);
            throw new Error(`Failed to fetch voucher: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Count how many times a user has used a specific voucher
     */
    async getUserVoucherUsageCount(voucherId: number, userId: number): Promise<number> {
        const pool = await getPool();

        try {
            const result = await pool.request()
                .input('voucher_id', sql.Int, voucherId)
                .input('gebruiker_id', sql.Int, userId)
                .query(`
                    SELECT COUNT(*) as count
                    FROM dbo.voucher_gebruik
                    WHERE voucher_id = @voucher_id AND gebruiker_id = @gebruiker_id
                `);

            return result.recordset[0]?.count || 0;
        } catch (error) {
            console.error('[VoucherService] Error counting voucher usage:', error);
            throw new Error(`Failed to count voucher usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validate a voucher code for a specific user
     */
    async validateVoucher(code: string, userId: number): Promise<VoucherValidationResult> {
        try {
            // Get voucher
            const voucher = await this.getVoucherByCode(code);

            if (!voucher) {
                return { valid: false, reden: 'Code niet gevonden' };
            }

            // Check if active
            if (!voucher.is_actief) {
                return { valid: false, reden: 'Code is niet meer actief' };
            }

            // Check validity dates
            const now = new Date();
            if (voucher.geldig_van && now < new Date(voucher.geldig_van)) {
                return { valid: false, reden: 'Code is nog niet geldig' };
            }
            if (voucher.geldig_tot && now > new Date(voucher.geldig_tot)) {
                return { valid: false, reden: 'Code is verlopen' };
            }

            // Check max total usage
            if (voucher.max_gebruik !== null && voucher.aantal_gebruikt >= voucher.max_gebruik) {
                return { valid: false, reden: 'Maximum gebruik bereikt' };
            }

            // Check max usage per user
            const userUsageCount = await this.getUserVoucherUsageCount(voucher.id, userId);
            if (userUsageCount >= voucher.max_per_gebruiker) {
                return { valid: false, reden: 'U heeft deze code al gebruikt' };
            }

            // Calculate new price based on type
            let nieuwePrijs = NORMALE_PRIJS;
            let omschrijvingKlant = '';
            let gratisMaanden: number | undefined;

            switch (voucher.type) {
                case 'gratis':
                    nieuwePrijs = 0;
                    omschrijvingKlant = 'Volledige gratis toegang';
                    break;

                case 'percentage':
                    const kortingPercentage = voucher.waarde || 0;
                    nieuwePrijs = Math.round((NORMALE_PRIJS * (100 - kortingPercentage) / 100) * 100) / 100;
                    omschrijvingKlant = `${kortingPercentage}% korting op uw abonnement`;
                    break;

                case 'maanden_gratis':
                    gratisMaanden = voucher.waarde || 0;
                    omschrijvingKlant = `Eerste ${gratisMaanden} maand${gratisMaanden > 1 ? 'en' : ''} gratis`;
                    nieuwePrijs = 0; // First payment is free
                    break;

                case 'vast_bedrag':
                    const kortingBedrag = voucher.waarde || 0;
                    nieuwePrijs = Math.max(0, NORMALE_PRIJS - kortingBedrag);
                    nieuwePrijs = Math.round(nieuwePrijs * 100) / 100;
                    omschrijvingKlant = `€${kortingBedrag.toFixed(2)} korting per maand`;
                    break;
            }

            return {
                valid: true,
                code: voucher.code,
                naam: voucher.naam,
                type: voucher.type,
                waarde: voucher.waarde,
                omschrijving_klant: omschrijvingKlant,
                nieuwe_prijs: nieuwePrijs,
                normale_prijs: NORMALE_PRIJS,
                gratis_maanden: gratisMaanden,
                voucher
            };

        } catch (error) {
            console.error('[VoucherService] Error validating voucher:', error);
            return { valid: false, reden: 'Fout bij valideren van code' };
        }
    }

    /**
     * Apply voucher to a subscription
     * Records usage and increments counter
     */
    async applyVoucher(
        voucherId: number,
        userId: number,
        abonnementId: number,
        kortingToegepast: number | null
    ): Promise<VoucherGebruik> {
        const pool = await getPool();

        try {
            // Start transaction
            const transaction = pool.transaction();
            await transaction.begin();

            try {
                // Record usage
                const insertResult = await transaction.request()
                    .input('voucher_id', sql.Int, voucherId)
                    .input('gebruiker_id', sql.Int, userId)
                    .input('abonnement_id', sql.Int, abonnementId)
                    .input('korting_toegepast', sql.Decimal(10, 2), kortingToegepast)
                    .query(`
                        INSERT INTO dbo.voucher_gebruik (voucher_id, gebruiker_id, abonnement_id, korting_toegepast)
                        OUTPUT INSERTED.*
                        VALUES (@voucher_id, @gebruiker_id, @abonnement_id, @korting_toegepast)
                    `);

                // Increment usage counter on voucher
                await transaction.request()
                    .input('voucher_id', sql.Int, voucherId)
                    .query(`
                        UPDATE dbo.vouchers
                        SET aantal_gebruikt = aantal_gebruikt + 1,
                            gewijzigd_op = GETDATE()
                        WHERE id = @voucher_id
                    `);

                await transaction.commit();

                console.log('[VoucherService] Voucher applied:', { voucherId, userId, abonnementId });
                return insertResult.recordset[0] as VoucherGebruik;

            } catch (innerError) {
                await transaction.rollback();
                throw innerError;
            }

        } catch (error) {
            console.error('[VoucherService] Error applying voucher:', error);
            throw new Error(`Failed to apply voucher: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Calculate the applied voucher info for response
     */
    calculateAppliedVoucher(voucher: Voucher): AppliedVoucher {
        let korting: string | undefined;
        let nieuwePrijs: number | undefined;
        let gratisMaanden: number | undefined;
        let isVolledigGratis = false;

        switch (voucher.type) {
            case 'gratis':
                isVolledigGratis = true;
                korting = '100%';
                nieuwePrijs = 0;
                break;

            case 'percentage':
                korting = `${voucher.waarde}%`;
                nieuwePrijs = Math.round((NORMALE_PRIJS * (100 - (voucher.waarde || 0)) / 100) * 100) / 100;
                break;

            case 'maanden_gratis':
                gratisMaanden = voucher.waarde || 0;
                korting = `${gratisMaanden} maand${gratisMaanden > 1 ? 'en' : ''} gratis`;
                nieuwePrijs = 0; // First payment
                break;

            case 'vast_bedrag':
                korting = `€${(voucher.waarde || 0).toFixed(2)}`;
                nieuwePrijs = Math.max(0, NORMALE_PRIJS - (voucher.waarde || 0));
                nieuwePrijs = Math.round(nieuwePrijs * 100) / 100;
                break;
        }

        return {
            code: voucher.code,
            type: voucher.type,
            korting,
            nieuwe_prijs: nieuwePrijs,
            gratis_maanden: gratisMaanden,
            is_volledig_gratis: isVolledigGratis
        };
    }

    /**
     * Create a new voucher (admin function)
     */
    async createVoucher(params: {
        code: string;
        naam: string;
        type: VoucherType;
        waarde?: number;
        omschrijving?: string;
        max_gebruik?: number;
        max_per_gebruiker?: number;
        geldig_van?: Date;
        geldig_tot?: Date;
    }): Promise<Voucher> {
        const pool = await getPool();

        try {
            const result = await pool.request()
                .input('code', sql.NVarChar(50), params.code.toUpperCase().trim())
                .input('naam', sql.NVarChar(100), params.naam)
                .input('type', sql.NVarChar(20), params.type)
                .input('waarde', sql.Decimal(10, 2), params.waarde || null)
                .input('omschrijving', sql.NVarChar(500), params.omschrijving || null)
                .input('max_gebruik', sql.Int, params.max_gebruik || null)
                .input('max_per_gebruiker', sql.Int, params.max_per_gebruiker || 1)
                .input('geldig_van', sql.DateTime, params.geldig_van || new Date())
                .input('geldig_tot', sql.DateTime, params.geldig_tot || null)
                .query(`
                    INSERT INTO dbo.vouchers (code, naam, type, waarde, omschrijving, max_gebruik, max_per_gebruiker, geldig_van, geldig_tot)
                    OUTPUT INSERTED.*
                    VALUES (@code, @naam, @type, @waarde, @omschrijving, @max_gebruik, @max_per_gebruiker, @geldig_van, @geldig_tot)
                `);

            console.log('[VoucherService] Voucher created:', params.code);
            return result.recordset[0] as Voucher;

        } catch (error) {
            console.error('[VoucherService] Error creating voucher:', error);
            throw new Error(`Failed to create voucher: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Deactivate a voucher
     */
    async deactivateVoucher(code: string): Promise<void> {
        const pool = await getPool();

        try {
            await pool.request()
                .input('code', sql.NVarChar(50), code.toUpperCase().trim())
                .query(`
                    UPDATE dbo.vouchers
                    SET is_actief = 0, gewijzigd_op = GETDATE()
                    WHERE UPPER(code) = @code
                `);

            console.log('[VoucherService] Voucher deactivated:', code);
        } catch (error) {
            console.error('[VoucherService] Error deactivating voucher:', error);
            throw new Error(`Failed to deactivate voucher: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export default new VoucherService();

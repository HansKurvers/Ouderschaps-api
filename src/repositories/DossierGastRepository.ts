import crypto from 'crypto';
import { BaseRepository } from './base/BaseRepository';
import {
    DossierGast,
    CreateDossierGastDto
} from '../models/Dossier';
import { DbMappers } from '../utils/db-mappers';

/**
 * Repository for DossierGast entity operations
 *
 * Responsibilities:
 * - Guest invitation CRUD operations
 * - Secure token generation and validation
 * - Access logging and tracking
 * - Token expiration management
 *
 * SECURITY: Tokens are stored as SHA-256 hashes. The plain token is only
 * returned once during creation and should be sent to the guest via email.
 *
 * @example
 * ```typescript
 * const repo = new DossierGastRepository();
 *
 * // Create invitation
 * const { gast, plainToken } = await repo.createWithToken({
 *     dossierId: 123,
 *     email: 'guest@example.com',
 *     rechten: 'upload_view'
 * }, userId);
 *
 * // Send plainToken to guest via email
 *
 * // Later: Validate guest access
 * const gast = await repo.findByToken(plainToken);
 * if (gast && !gast.ingetrokken && new Date() < gast.tokenVerlooptOp) {
 *     // Grant access
 * }
 * ```
 */
export class DossierGastRepository extends BaseRepository {
    private static readonly TOKEN_LENGTH = 32; // 256 bits
    private static readonly DEFAULT_EXPIRY_DAYS = 30;

    /**
     * Generates a cryptographically secure random token
     *
     * @returns Random token as hex string
     */
    private generateToken(): string {
        return crypto.randomBytes(DossierGastRepository.TOKEN_LENGTH).toString('hex');
    }

    /**
     * Hashes a token using SHA-256
     *
     * @param token - Plain token
     * @returns SHA-256 hash of token
     */
    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Finds all guests for a dossier
     *
     * @param dossierId - The dossier ID
     * @returns Array of guests ordered by creation date
     */
    async findByDossierId(dossierId: number): Promise<DossierGast[]> {
        const query = `
            SELECT
                id,
                dossier_id,
                email,
                naam,
                token_hash,
                token_verloopt_op,
                rechten,
                uitgenodigd_door_gebruiker_id,
                uitnodiging_verzonden_op,
                eerste_toegang_op,
                laatste_toegang_op,
                ingetrokken,
                ingetrokken_op,
                aangemaakt_op
            FROM dbo.dossier_gasten
            WHERE dossier_id = @dossierId
            ORDER BY aangemaakt_op DESC
        `;

        const records = await this.queryMany(query, { dossierId });
        return records.map(DbMappers.toDossierGast);
    }

    /**
     * Finds active (non-revoked, non-expired) guests for a dossier
     *
     * @param dossierId - The dossier ID
     * @returns Array of active guests
     */
    async findActiveByDossierId(dossierId: number): Promise<DossierGast[]> {
        const query = `
            SELECT
                id,
                dossier_id,
                email,
                naam,
                token_hash,
                token_verloopt_op,
                rechten,
                uitgenodigd_door_gebruiker_id,
                uitnodiging_verzonden_op,
                eerste_toegang_op,
                laatste_toegang_op,
                ingetrokken,
                ingetrokken_op,
                aangemaakt_op
            FROM dbo.dossier_gasten
            WHERE dossier_id = @dossierId
                AND ingetrokken = 0
                AND token_verloopt_op > GETDATE()
            ORDER BY aangemaakt_op DESC
        `;

        const records = await this.queryMany(query, { dossierId });
        return records.map(DbMappers.toDossierGast);
    }

    /**
     * Finds a guest by ID
     *
     * @param gastId - The guest ID
     * @returns Guest or null if not found
     */
    async findById(gastId: number): Promise<DossierGast | null> {
        const query = `
            SELECT
                id,
                dossier_id,
                email,
                naam,
                token_hash,
                token_verloopt_op,
                rechten,
                uitgenodigd_door_gebruiker_id,
                uitnodiging_verzonden_op,
                eerste_toegang_op,
                laatste_toegang_op,
                ingetrokken,
                ingetrokken_op,
                aangemaakt_op
            FROM dbo.dossier_gasten
            WHERE id = @gastId
        `;

        const record = await this.querySingle(query, { gastId });
        return record ? DbMappers.toDossierGast(record) : null;
    }

    /**
     * Finds a guest by their access token (validates the token)
     *
     * This is the primary method for authenticating guest access.
     * Returns null if token is invalid, expired, or revoked.
     *
     * @param plainToken - The plain (unhashed) token
     * @returns Guest if token is valid, null otherwise
     */
    async findByToken(plainToken: string): Promise<DossierGast | null> {
        const tokenHash = this.hashToken(plainToken);

        const query = `
            SELECT
                id,
                dossier_id,
                email,
                naam,
                token_hash,
                token_verloopt_op,
                rechten,
                uitgenodigd_door_gebruiker_id,
                uitnodiging_verzonden_op,
                eerste_toegang_op,
                laatste_toegang_op,
                ingetrokken,
                ingetrokken_op,
                aangemaakt_op
            FROM dbo.dossier_gasten
            WHERE token_hash = @tokenHash
                AND ingetrokken = 0
                AND token_verloopt_op > GETDATE()
        `;

        const record = await this.querySingle(query, { tokenHash });
        return record ? DbMappers.toDossierGast(record) : null;
    }

    /**
     * Checks if a guest with the given email already exists for a dossier
     *
     * @param dossierId - The dossier ID
     * @param email - The email address
     * @returns True if guest already exists
     */
    async existsByEmail(dossierId: number, email: string): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossier_gasten
            WHERE dossier_id = @dossierId
                AND email = @email
        `;

        return await this.exists(query, { dossierId, email: email.toLowerCase() });
    }

    /**
     * Creates a new guest invitation with a secure token
     *
     * @param data - Guest creation data
     * @param uitnodigerUserId - User ID who is inviting the guest
     * @returns Object containing the created guest and the plain token (to be sent via email)
     */
    async createWithToken(
        data: CreateDossierGastDto,
        uitnodigerUserId: number
    ): Promise<{ gast: DossierGast; plainToken: string }> {
        const plainToken = this.generateToken();
        const tokenHash = this.hashToken(plainToken);

        // Default expiry: 30 days from now
        const expiryDate = data.tokenVerlooptOp || new Date(
            Date.now() + DossierGastRepository.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        );

        const query = `
            INSERT INTO dbo.dossier_gasten (
                dossier_id,
                email,
                naam,
                token_hash,
                token_verloopt_op,
                rechten,
                uitgenodigd_door_gebruiker_id
            )
            OUTPUT INSERTED.*
            VALUES (
                @dossierId,
                @email,
                @naam,
                @tokenHash,
                @tokenVerlooptOp,
                @rechten,
                @uitnodigerUserId
            )
        `;

        const record = await this.querySingle(query, {
            dossierId: data.dossierId,
            email: data.email.toLowerCase(),
            naam: data.naam || null,
            tokenHash,
            tokenVerlooptOp: expiryDate,
            rechten: data.rechten || 'upload_view',
            uitnodigerUserId,
        });

        if (!record) {
            throw new Error('Failed to create guest invitation');
        }

        return {
            gast: DbMappers.toDossierGast(record),
            plainToken,
        };
    }

    /**
     * Marks an invitation as sent
     *
     * @param gastId - The guest ID
     * @returns Updated guest
     */
    async markInvitationSent(gastId: number): Promise<DossierGast> {
        const query = `
            UPDATE dbo.dossier_gasten
            SET uitnodiging_verzonden_op = GETDATE()
            OUTPUT INSERTED.*
            WHERE id = @gastId
        `;

        const record = await this.querySingle(query, { gastId });
        if (!record) {
            throw new Error(`Guest with ID ${gastId} not found`);
        }

        return DbMappers.toDossierGast(record);
    }

    /**
     * Records first access for a guest
     *
     * @param gastId - The guest ID
     * @returns Updated guest
     */
    async recordFirstAccess(gastId: number): Promise<DossierGast> {
        const query = `
            UPDATE dbo.dossier_gasten
            SET
                eerste_toegang_op = CASE
                    WHEN eerste_toegang_op IS NULL THEN GETDATE()
                    ELSE eerste_toegang_op
                END,
                laatste_toegang_op = GETDATE()
            OUTPUT INSERTED.*
            WHERE id = @gastId
        `;

        const record = await this.querySingle(query, { gastId });
        if (!record) {
            throw new Error(`Guest with ID ${gastId} not found`);
        }

        return DbMappers.toDossierGast(record);
    }

    /**
     * Updates the last access timestamp for a guest
     *
     * @param gastId - The guest ID
     */
    async updateLastAccess(gastId: number): Promise<void> {
        const query = `
            UPDATE dbo.dossier_gasten
            SET laatste_toegang_op = GETDATE()
            WHERE id = @gastId
        `;

        await this.executeQuery(query, { gastId });
    }

    /**
     * Revokes a guest invitation
     *
     * @param gastId - The guest ID to revoke
     * @returns True if invitation was revoked
     */
    async revoke(gastId: number): Promise<boolean> {
        const query = `
            UPDATE dbo.dossier_gasten
            SET
                ingetrokken = 1,
                ingetrokken_op = GETDATE()
            WHERE id = @gastId
                AND ingetrokken = 0
        `;

        const result = await this.executeQuery(query, { gastId });
        return result.rowsAffected[0] > 0;
    }

    /**
     * Regenerates the token for an existing guest (extends expiry)
     *
     * @param gastId - The guest ID
     * @param newExpiryDays - Number of days until new token expires (default: 30)
     * @returns Object containing the updated guest and the new plain token
     */
    async regenerateToken(
        gastId: number,
        newExpiryDays: number = DossierGastRepository.DEFAULT_EXPIRY_DAYS
    ): Promise<{ gast: DossierGast; plainToken: string }> {
        const plainToken = this.generateToken();
        const tokenHash = this.hashToken(plainToken);
        const expiryDate = new Date(Date.now() + newExpiryDays * 24 * 60 * 60 * 1000);

        const query = `
            UPDATE dbo.dossier_gasten
            SET
                token_hash = @tokenHash,
                token_verloopt_op = @expiryDate,
                ingetrokken = 0,
                ingetrokken_op = NULL
            OUTPUT INSERTED.*
            WHERE id = @gastId
        `;

        const record = await this.querySingle(query, {
            gastId,
            tokenHash,
            expiryDate,
        });

        if (!record) {
            throw new Error(`Guest with ID ${gastId} not found`);
        }

        return {
            gast: DbMappers.toDossierGast(record),
            plainToken,
        };
    }

    /**
     * Permanently deletes a guest record
     *
     * @param gastId - The guest ID to delete
     * @returns True if guest was deleted
     */
    async delete(gastId: number): Promise<boolean> {
        const query = `
            DELETE FROM dbo.dossier_gasten
            WHERE id = @gastId
        `;

        const result = await this.executeQuery(query, { gastId });
        return result.rowsAffected[0] > 0;
    }

    /**
     * Checks if a guest belongs to a specific dossier
     *
     * @param gastId - The guest ID
     * @param dossierId - The dossier ID
     * @returns True if guest belongs to the dossier
     */
    async belongsToDossier(gastId: number, dossierId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossier_gasten
            WHERE id = @gastId
                AND dossier_id = @dossierId
        `;

        return await this.exists(query, { gastId, dossierId });
    }

    /**
     * Gets guest count for a dossier
     *
     * @param dossierId - The dossier ID
     * @param activeOnly - If true, only count active guests
     * @returns Number of guests
     */
    async getCount(dossierId: number, activeOnly: boolean = false): Promise<number> {
        let query = `
            SELECT COUNT(*) as count
            FROM dbo.dossier_gasten
            WHERE dossier_id = @dossierId
        `;

        if (activeOnly) {
            query += ` AND ingetrokken = 0 AND token_verloopt_op > GETDATE()`;
        }

        const result = await this.querySingle<{ count: number }>(query, { dossierId });
        return result?.count || 0;
    }

    /**
     * Validates if a guest has specific permissions
     *
     * @param gastId - The guest ID
     * @param permission - The permission to check ('upload', 'view')
     * @returns True if guest has the permission
     */
    async hasPermission(gastId: number, permission: 'upload' | 'view'): Promise<boolean> {
        const gast = await this.findById(gastId);
        if (!gast || gast.ingetrokken || new Date() > gast.tokenVerlooptOp) {
            return false;
        }

        switch (gast.rechten) {
            case 'upload_view':
                return true;
            case 'upload':
                return permission === 'upload';
            case 'view':
                return permission === 'view';
            default:
                return false;
        }
    }
}

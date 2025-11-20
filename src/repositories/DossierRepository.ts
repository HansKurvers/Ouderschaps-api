import sql from 'mssql';
import { BaseRepository } from './base/BaseRepository';
import { Dossier } from '../models/Dossier';
import { DbMappers } from '../utils/db-mappers';

/**
 * Repository for Dossier entity operations
 *
 * Responsibilities:
 * - Dossier CRUD operations
 * - Dossier number generation
 * - User access verification
 * - Dossier status management
 * - Cascade deletion of dossier and related data
 *
 * @example
 * ```typescript
 * const repo = new DossierRepository();
 * const dossiers = await repo.findByUserId(userId);
 * const dossier = await repo.findById(dossierId);
 * ```
 */
export class DossierRepository extends BaseRepository {
    /**
     * Finds all dossiers for a specific user
     *
     * @param userId - The user ID to filter by
     * @returns Array of dossiers ordered by last modified date
     */
    async findByUserId(userId: number): Promise<Dossier[]> {
        const query = `
            SELECT
                id,
                dossier_nummer,
                gebruiker_id,
                status,
                is_anoniem,
                aangemaakt_op,
                gewijzigd_op
            FROM dbo.dossiers
            WHERE gebruiker_id = @userId
            ORDER BY gewijzigd_op DESC
        `;

        const records = await this.queryMany(query, { userId });
        return records.map(DbMappers.toDossier);
    }

    /**
     * Finds a dossier by ID
     *
     * @param dossierId - The dossier ID
     * @returns Dossier or null if not found
     */
    async findById(dossierId: number): Promise<Dossier | null> {
        const query = `
            SELECT
                id,
                dossier_nummer,
                gebruiker_id,
                status,
                is_anoniem,
                aangemaakt_op,
                gewijzigd_op
            FROM dbo.dossiers
            WHERE id = @dossierId
        `;

        const record = await this.querySingle(query, { dossierId });
        return record ? DbMappers.toDossier(record) : null;
    }

    /**
     * Checks if a user has access to a dossier (owner OR shared user)
     *
     * This method grants access to:
     * - Users who own the dossier (gebruiker_id = userId)
     * - Users who have the dossier shared with them (via gedeelde_dossiers table)
     *
     * @param dossierId - The dossier ID
     * @param userId - The user ID to check access for
     * @returns True if user owns or has shared access to the dossier
     */
    async checkAccess(dossierId: number, userId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossiers d
            LEFT JOIN dbo.gedeelde_dossiers gd
                ON d.id = gd.dossier_id AND gd.gebruiker_id = @userId
            WHERE d.id = @dossierId
                AND (d.gebruiker_id = @userId OR gd.id IS NOT NULL)
        `;

        return await this.exists(query, { dossierId, userId });
    }

    /**
     * Checks if a user is the owner of a dossier
     *
     * This method should be used for operations that require ownership:
     * - Deleting the dossier
     * - Sharing the dossier with others
     * - Revoking shares
     * - Changing dossier status
     *
     * @param dossierId - The dossier ID
     * @param userId - The user ID to check ownership for
     * @returns True if user owns the dossier
     */
    async isOwner(dossierId: number, userId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossiers
            WHERE id = @dossierId AND gebruiker_id = @userId
        `;

        return await this.exists(query, { dossierId, userId });
    }

    /**
     * Creates a new dossier for a user
     *
     * @param userId - The user ID who owns the dossier
     * @returns The created dossier with generated dossier number
     */
    async create(userId: number): Promise<Dossier> {
        const dossierNummer = await this.generateNextDossierNumber();

        const query = `
            INSERT INTO dbo.dossiers (dossier_nummer, gebruiker_id, status)
            OUTPUT INSERTED.*
            VALUES (@dossierNummer, @userId, @status)
        `;

        const record = await this.querySingle(query, {
            dossierNummer,
            userId,
            status: false
        });

        if (!record) {
            throw new Error('Failed to create dossier');
        }

        return DbMappers.toDossier(record);
    }

    /**
     * Updates the status of a dossier
     *
     * @param dossierId - The dossier ID
     * @param status - The new status (false = active, true = completed)
     * @returns Updated dossier
     */
    async updateStatus(dossierId: number, status: boolean): Promise<Dossier> {
        const query = `
            UPDATE dbo.dossiers
            SET
                status = @status,
                gewijzigd_op = GETDATE()
            OUTPUT INSERTED.*
            WHERE id = @dossierId
        `;

        const record = await this.querySingle(query, { dossierId, status });

        if (!record) {
            throw new Error(`Dossier with ID ${dossierId} not found`);
        }

        return DbMappers.toDossier(record);
    }

    /**
     * Updates the anonymity setting of a dossier
     *
     * @param dossierId - The dossier ID
     * @param isAnoniem - Whether the dossier should be anonymous
     * @returns Updated dossier
     */
    async updateAnonymity(dossierId: number, isAnoniem: boolean): Promise<Dossier> {
        const query = `
            UPDATE dbo.dossiers
            SET
                is_anoniem = @isAnoniem,
                gewijzigd_op = GETDATE()
            OUTPUT INSERTED.*
            WHERE id = @dossierId
        `;

        const record = await this.querySingle(query, { dossierId, isAnoniem });

        if (!record) {
            throw new Error(`Dossier with ID ${dossierId} not found`);
        }

        return DbMappers.toDossier(record);
    }

    /**
     * Deletes a dossier and all related data using cascade deletion
     *
     * Order of deletion:
     * 1. Alimentatie related tables (most dependent)
     * 2. Ouderschapsplan info
     * 3. Omgang (visitation)
     * 4. Zorg (care)
     * 5. Dossier-kind relationships
     * 6. Dossier-partij relationships
     * 7. Finally, the dossier itself
     *
     * @param dossierId - The dossier ID to delete
     * @returns True if deletion was successful
     * @throws Error if deletion fails
     */
    async delete(dossierId: number): Promise<boolean> {
        const transaction = await this.beginTransaction();

        try {

            // Log related data for debugging
            await this.logRelatedData(transaction, dossierId);

            // 1. Delete alimentatie related tables first (most dependent)
            // Nullify foreign key references first
            await this.executeInTransaction(transaction, `
                UPDATE dbo.alimentaties
                SET bijdrage_kosten_kinderen = NULL
                WHERE dossier_id = @dossierId
            `, { dossierId });

            // Delete bijdragen_kosten_kinderen
            await this.executeInTransaction(transaction, `
                DELETE bkk
                FROM dbo.bijdragen_kosten_kinderen bkk
                INNER JOIN dbo.alimentaties a ON bkk.alimentatie_id = a.id
                WHERE a.dossier_id = @dossierId
            `, { dossierId });

            // Delete financiele_afspraken_kinderen
            await this.executeInTransaction(transaction, `
                DELETE fak
                FROM dbo.financiele_afspraken_kinderen fak
                INNER JOIN dbo.alimentaties a ON fak.alimentatie_id = a.id
                WHERE a.dossier_id = @dossierId
            `, { dossierId });

            // Delete alimentaties
            await this.executeInTransaction(transaction, `
                DELETE FROM dbo.alimentaties WHERE dossier_id = @dossierId
            `, { dossierId });

            // 2. Delete ouderschapsplan_info
            await this.executeInTransaction(transaction, `
                DELETE FROM dbo.ouderschapsplan_info WHERE dossier_id = @dossierId
            `, { dossierId });

            // 3. Delete omgang (visitation)
            await this.executeInTransaction(transaction, `
                DELETE FROM dbo.omgang WHERE dossier_id = @dossierId
            `, { dossierId });

            // 4. Delete zorg (care)
            await this.executeInTransaction(transaction, `
                DELETE FROM dbo.zorg WHERE dossier_id = @dossierId
            `, { dossierId });

            // 5. Delete dossier-kind relationships
            await this.executeInTransaction(transaction, `
                DELETE FROM dbo.dossiers_kinderen WHERE dossier_id = @dossierId
            `, { dossierId });

            // 6. Delete dossier-partij relationships
            await this.executeInTransaction(transaction, `
                DELETE FROM dbo.dossiers_partijen WHERE dossier_id = @dossierId
            `, { dossierId });

            // 7. Finally, delete the dossier itself
            const result = await this.executeInTransaction(transaction, `
                DELETE FROM dbo.dossiers WHERE id = @dossierId
            `, { dossierId });

            await transaction.commit();

            return result.rowsAffected[0] > 0;

        } catch (error) {
            console.error('Error deleting dossier, rolling back transaction:', error);
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Generates the next sequential dossier number
     *
     * @returns Next dossier number as string
     * @private
     */
    async generateNextDossierNumber(): Promise<string> {
        try {
            const query = `
                SELECT MAX(CAST(dossier_nummer AS INT)) as maxNumber
                FROM dbo.dossiers
                WHERE ISNUMERIC(dossier_nummer) = 1
            `;

            const result = await this.querySingle<{ maxNumber: number | null }>(query);
            const maxNumber = result?.maxNumber || 999;
            const nextNumber = maxNumber + 1;

            return nextNumber.toString();
        } catch (error) {
            console.error('Error generating dossier number:', error);
            // Fallback to timestamp-based number
            return Date.now().toString();
        }
    }

    /**
     * Logs related data counts for debugging cascade deletes
     *
     * @param transaction - Active transaction
     * @param dossierId - The dossier ID
     * @private
     */
    private async logRelatedData(transaction: sql.Transaction, dossierId: number): Promise<void> {
        try {
            const tables = [
                'dbo.alimentaties',
                'dbo.ouderschapsplan_info',
                'dbo.omgang',
                'dbo.zorg',
                'dbo.dossiers_kinderen',
                'dbo.dossiers_partijen'
            ];

            for (const table of tables) {
                await this.executeInTransaction<{ count: number }>(
                    transaction,
                    `SELECT COUNT(*) as count FROM ${table} WHERE dossier_id = @dossierId`,
                    { dossierId }
                );
            }

            // Check for bijdragen_kosten_kinderen via alimentaties
            await this.executeInTransaction<{ count: number }>(transaction, `
                SELECT COUNT(*) as count
                FROM dbo.bijdragen_kosten_kinderen bkk
                INNER JOIN dbo.alimentaties a ON bkk.alimentatie_id = a.id
                WHERE a.dossier_id = @dossierId
            `, { dossierId });

            // Check for financiele_afspraken_kinderen via alimentaties
            await this.executeInTransaction<{ count: number }>(transaction, `
                SELECT COUNT(*) as count
                FROM dbo.financiele_afspraken_kinderen fak
                INNER JOIN dbo.alimentaties a ON fak.alimentatie_id = a.id
                WHERE a.dossier_id = @dossierId
            `, { dossierId });

        } catch (error) {
            console.warn('Could not log related data:', error);
        }
    }
}

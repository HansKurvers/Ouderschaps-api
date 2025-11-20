import { BaseRepository } from './base/BaseRepository';

/**
 * GedeeldeDossierRepository - ULTRA SIMPLIFIED
 *
 * Just links dossier_id to gebruiker_id. That's it!
 */

export interface GedeeldeDossier {
    id: number;
    dossier_id: number;
    gebruiker_id: number;
    gedeeld_op: Date;
}

export class GedeeldeDossierRepository extends BaseRepository {

    /**
     * Share dossier with user
     */
    async create(dossierId: number, gebruikerId: number): Promise<GedeeldeDossier> {
        const query = `
            INSERT INTO dbo.gedeelde_dossiers (dossier_id, gebruiker_id)
            OUTPUT INSERTED.*
            VALUES (@dossierId, @gebruikerId)
        `;

        const result = await this.executeQuery<GedeeldeDossier>(query, {
            dossierId,
            gebruikerId
        });

        const record = result.recordset[0];
        if (!record) throw new Error('Failed to create share');

        return record;
    }

    /**
     * Check if user can access dossier (owner or shared)
     */
    async checkAccess(dossierId: number, gebruikerId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossiers d
            LEFT JOIN dbo.gedeelde_dossiers gd ON d.id = gd.dossier_id AND gd.gebruiker_id = @gebruikerId
            WHERE d.id = @dossierId AND (d.gebruiker_id = @gebruikerId OR gd.id IS NOT NULL)
        `;

        return await this.exists(query, { dossierId, gebruikerId });
    }

    /**
     * Check if user is owner
     */
    async isOwner(dossierId: number, gebruikerId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossiers
            WHERE id = @dossierId AND gebruiker_id = @gebruikerId
        `;

        return await this.exists(query, { dossierId, gebruikerId });
    }

    /**
     * Check if dossier already shared with user
     */
    async isAlreadyShared(dossierId: number, gebruikerId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.gedeelde_dossiers
            WHERE dossier_id = @dossierId AND gebruiker_id = @gebruikerId
        `;

        return await this.exists(query, { dossierId, gebruikerId });
    }

    /**
     * Get all dossiers shared WITH a user (for frontend: "Gedeeld met mij")
     * Returns full dossier information with owner details and isOwner flag
     */
    async findSharedWithUser(gebruikerId: number): Promise<any[]> {
        const query = `
            SELECT
                d.id,
                d.dossier_nummer,
                d.gebruiker_id,
                d.status,
                d.is_anoniem,
                d.aangemaakt_op,
                d.gewijzigd_op,
                g.naam as eigenaar_naam,
                g.email as eigenaar_email,
                gd.gedeeld_op,
                0 as is_owner
            FROM dbo.gedeelde_dossiers gd
            INNER JOIN dbo.dossiers d ON gd.dossier_id = d.id
            LEFT JOIN dbo.gebruikers g ON d.gebruiker_id = g.id
            WHERE gd.gebruiker_id = @gebruikerId
            ORDER BY gd.gedeeld_op DESC
        `;

        const records = await this.queryMany(query, { gebruikerId });

        // Transform to include isOwner as boolean
        return records.map((record: any) => ({
            ...record,
            isOwner: record.is_owner === 1
        }));
    }

    /**
     * Get all users a dossier is shared with (for owner: "Gedeeld met")
     */
    async findUsersSharedWith(dossierId: number): Promise<any[]> {
        const query = `
            SELECT
                g.id,
                g.email,
                g.naam,
                gd.gedeeld_op
            FROM dbo.gedeelde_dossiers gd
            INNER JOIN dbo.gebruikers g ON gd.gebruiker_id = g.id
            WHERE gd.dossier_id = @dossierId
            ORDER BY gd.gedeeld_op DESC
        `;

        return await this.queryMany(query, { dossierId });
    }

    /**
     * Delete a share (revoke access)
     */
    async delete(dossierId: number, gebruikerId: number): Promise<boolean> {
        const query = `
            DELETE FROM dbo.gedeelde_dossiers
            WHERE dossier_id = @dossierId AND gebruiker_id = @gebruikerId
        `;

        const result = await this.executeQuery(query, { dossierId, gebruikerId });
        return (result.rowsAffected[0] || 0) > 0;
    }
}

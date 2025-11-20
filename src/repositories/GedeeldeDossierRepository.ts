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
}

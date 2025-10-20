import { BaseRepository } from './base/BaseRepository';
import { DbMappers } from '../utils/db-mappers';
import { Persoon, Rol } from '../models/Dossier';

/**
 * PartijRepository
 *
 * Manages the dossiers_partijen junction table that links persons to dossiers
 * with a specific role (e.g., vader, moeder).
 *
 * Business Rules:
 * - A dossier can have multiple partijen (usually 2: vader & moeder)
 * - A person can be in multiple dossiers with different roles
 * - The same person CANNOT have the same role twice in the same dossier
 * - Multi-tenant: users can only see/modify partijen from their own dossiers
 * - When deleting a partij: only remove the link, NOT the person
 */

export interface PartijResult {
    id: number;
    persoon: Persoon;
    rol: Rol;
}

export class PartijRepository extends BaseRepository {

    /**
     * Get all partijen for a dossier
     *
     * @param dossierId - The dossier ID
     * @returns Array of partijen with person and rol data
     */
    async findByDossierId(dossierId: number): Promise<PartijResult[]> {
        const query = `
            SELECT
                dp.id as partij_id,
                p.id,
                p.voorletters,
                p.voornamen,
                p.roepnaam,
                p.geslacht,
                p.tussenvoegsel,
                p.achternaam,
                p.adres,
                p.postcode,
                p.plaats,
                p.geboorteplaats,
                p.geboorte_datum,
                p.nationaliteit_1,
                p.nationaliteit_2,
                p.telefoon,
                p.email,
                p.beroep,
                r.id as rol_id,
                r.naam as rol_naam
            FROM dbo.dossiers_partijen dp
            INNER JOIN dbo.personen p ON dp.persoon_id = p.id
            INNER JOIN dbo.rollen r ON dp.rol_id = r.id
            WHERE dp.dossier_id = @dossierId
            ORDER BY r.id
        `;

        const records = await this.queryMany<any>(query, { dossierId });

        return records.map(record => ({
            id: record.partij_id,
            persoon: DbMappers.toPersoon(record),
            rol: {
                id: record.rol_id,
                naam: record.rol_naam
            }
        }));
    }

    /**
     * Get single partij by ID
     *
     * @param dossierId - The dossier ID
     * @param partijId - The partij ID (dossiers_partijen.id)
     * @returns Partij with person and rol data, or null if not found
     */
    async findById(dossierId: number, partijId: number): Promise<PartijResult | null> {
        const query = `
            SELECT
                dp.id as partij_id,
                p.id,
                p.voorletters,
                p.voornamen,
                p.roepnaam,
                p.geslacht,
                p.tussenvoegsel,
                p.achternaam,
                p.adres,
                p.postcode,
                p.plaats,
                p.geboorteplaats,
                p.geboorte_datum,
                p.nationaliteit_1,
                p.nationaliteit_2,
                p.telefoon,
                p.email,
                p.beroep,
                r.id as rol_id,
                r.naam as rol_naam
            FROM dbo.dossiers_partijen dp
            INNER JOIN dbo.personen p ON dp.persoon_id = p.id
            INNER JOIN dbo.rollen r ON dp.rol_id = r.id
            WHERE dp.dossier_id = @dossierId AND dp.id = @partijId
        `;

        const record = await this.querySingle<any>(query, { dossierId, partijId });

        if (!record) {
            return null;
        }

        return {
            id: record.partij_id,
            persoon: DbMappers.toPersoon(record),
            rol: {
                id: record.rol_id,
                naam: record.rol_naam
            }
        };
    }

    /**
     * Add a person as partij to a dossier with a specific role
     *
     * @param dossierId - The dossier ID
     * @param persoonId - The person ID
     * @param rolId - The role ID
     * @returns The created partij with person and rol data
     */
    async create(dossierId: number, persoonId: number, rolId: number): Promise<PartijResult> {
        const insertQuery = `
            INSERT INTO dbo.dossiers_partijen (dossier_id, persoon_id, rol_id)
            OUTPUT INSERTED.id
            VALUES (@dossierId, @persoonId, @rolId)
        `;

        const result = await this.executeQuery<any>(insertQuery, {
            dossierId,
            persoonId,
            rolId
        });

        const insertedId = result.recordset[0]?.id;

        if (!insertedId) {
            throw new Error('Failed to create partij: No ID returned');
        }

        // Fetch the complete partij data
        const partij = await this.findById(dossierId, insertedId);

        if (!partij) {
            throw new Error(`Partij with ID ${insertedId} was created but could not be retrieved`);
        }

        return partij;
    }

    /**
     * Remove a partij from a dossier
     * Note: This only removes the link, NOT the person
     *
     * @param dossierId - The dossier ID
     * @param partijId - The partij ID (dossiers_partijen.id)
     * @returns True if deleted, false if not found
     */
    async delete(dossierId: number, partijId: number): Promise<boolean> {
        const query = `
            DELETE FROM dbo.dossiers_partijen
            WHERE id = @partijId AND dossier_id = @dossierId
        `;

        const result = await this.executeQuery(query, { partijId, dossierId });
        return (result.rowsAffected[0] || 0) > 0;
    }

    /**
     * Check if a partij exists
     * Used for validation to prevent duplicate role assignments
     *
     * @param dossierId - The dossier ID
     * @param persoonId - The person ID
     * @param rolId - The role ID
     * @returns True if this person already has this role in this dossier
     */
    async partijExists(dossierId: number, persoonId: number, rolId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossiers_partijen
            WHERE dossier_id = @dossierId
              AND persoon_id = @persoonId
              AND rol_id = @rolId
        `;

        const result = await this.querySingle<{ count: number }>(query, { dossierId, persoonId, rolId });
        return result ? result.count > 0 : false;
    }

    /**
     * Count partijen in a dossier
     *
     * @param dossierId - The dossier ID
     * @returns Number of partijen in the dossier
     */
    async count(dossierId: number): Promise<number> {
        const query = `
            SELECT COUNT(*) as total
            FROM dbo.dossiers_partijen
            WHERE dossier_id = @dossierId
        `;

        const result = await this.querySingle<{ total: number }>(query, { dossierId });
        return result?.total || 0;
    }

    /**
     * Get all dossier IDs where a person is a partij
     * Useful for validation (e.g., check if person can be deleted)
     *
     * @param persoonId - The person ID
     * @returns Array of dossier IDs
     */
    async findDossiersByPersoonId(persoonId: number): Promise<number[]> {
        const query = `
            SELECT DISTINCT dossier_id
            FROM dbo.dossiers_partijen
            WHERE persoon_id = @persoonId
            ORDER BY dossier_id
        `;

        const records = await this.queryMany<{ dossier_id: number }>(query, { persoonId });
        return records.map(r => r.dossier_id);
    }
}

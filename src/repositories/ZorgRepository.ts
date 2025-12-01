import { BaseRepository } from './base/BaseRepository';
import {
    IZorgRepository,
    CreateZorgDto,
    UpdateZorgDto
} from './interfaces/IZorgRepository';
import {
    Zorg,
    ZorgWithLookups,
    ZorgCategorie,
    ZorgSituatie
} from '../models/Dossier';
import { DbMappers } from '../utils/db-mappers';

/**
 * Repository for managing zorg (care arrangement) records
 *
 * Implements CRUD operations for zorg with lookup table relationships.
 * Each zorg record has a categorie (e.g., "Hoofdverblijf") and a situatie
 * (e.g., "50/50 verdeling") that must belong to that categorie.
 *
 * Database Schema:
 * - dbo.zorg: Main table with zorg records
 * - dbo.zorg_categorieen: Lookup table for categories
 * - dbo.zorg_situaties: Lookup table for situations (with optional categorie FK)
 *
 * Business Rules:
 * - Each zorg must have a valid categorie and situatie
 * - Situatie must belong to categorie (via zorg_categorie_id in zorg_situaties)
 * - Track creator (aangemaaktDoor) and modifier (gewijzigdDoor)
 * - Multi-tenant: users can only access zorg from their own dossiers
 */
export class ZorgRepository extends BaseRepository implements IZorgRepository {
    /**
     * Find all zorg records for a specific dossier
     * Returns zorg with joined categorie and situatie lookup data
     * Ordered by gewijzigd_op DESC (most recent first)
     */
    async findByDossierId(dossierId: number): Promise<ZorgWithLookups[]> {
        const query = `
            SELECT
                z.id,
                z.dossier_id,
                z.zorg_categorie_id,
                z.zorg_situatie_id,
                z.overeenkomst,
                z.situatie_anders,
                z.is_custom_text,
                z.aangemaakt_op,
                z.aangemaakt_door,
                z.gewijzigd_op,
                z.gewijzigd_door,
                -- Categorie fields
                zc.id as categorie_id,
                zc.naam as categorie_naam,
                -- Situatie fields
                zs.id as situatie_id,
                zs.naam as situatie_naam,
                zs.zorg_categorie_id as situatie_categorie_id
            FROM dbo.zorg z
            INNER JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
            INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
            WHERE z.dossier_id = @dossierId
            ORDER BY z.gewijzigd_op DESC, z.id DESC
        `;

        const records = await this.queryMany<any>(query, { dossierId });
        return records.map(record => this.mapZorgWithLookups(record));
    }

    /**
     * Find a specific zorg record by ID
     * Returns zorg with joined categorie and situatie lookup data
     */
    async findById(zorgId: number): Promise<ZorgWithLookups | null> {
        const query = `
            SELECT
                z.id,
                z.dossier_id,
                z.zorg_categorie_id,
                z.zorg_situatie_id,
                z.overeenkomst,
                z.situatie_anders,
                z.is_custom_text,
                z.aangemaakt_op,
                z.aangemaakt_door,
                z.gewijzigd_op,
                z.gewijzigd_door,
                -- Categorie fields
                zc.id as categorie_id,
                zc.naam as categorie_naam,
                -- Situatie fields
                zs.id as situatie_id,
                zs.naam as situatie_naam,
                zs.zorg_categorie_id as situatie_categorie_id
            FROM dbo.zorg z
            INNER JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
            INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
            WHERE z.id = @zorgId
        `;

        const record = await this.querySingle<any>(query, { zorgId });
        return record ? this.mapZorgWithLookups(record) : null;
    }

    /**
     * Find all zorg records for a specific categorie within a dossier
     * Useful for filtering zorg by type (e.g., all "Hoofdverblijf" records)
     */
    async findByCategorie(dossierId: number, categorieId: number): Promise<ZorgWithLookups[]> {
        const query = `
            SELECT
                z.id,
                z.dossier_id,
                z.zorg_categorie_id,
                z.zorg_situatie_id,
                z.overeenkomst,
                z.situatie_anders,
                z.is_custom_text,
                z.aangemaakt_op,
                z.aangemaakt_door,
                z.gewijzigd_op,
                z.gewijzigd_door,
                -- Categorie fields
                zc.id as categorie_id,
                zc.naam as categorie_naam,
                -- Situatie fields
                zs.id as situatie_id,
                zs.naam as situatie_naam,
                zs.zorg_categorie_id as situatie_categorie_id
            FROM dbo.zorg z
            INNER JOIN dbo.zorg_categorieen zc ON z.zorg_categorie_id = zc.id
            INNER JOIN dbo.zorg_situaties zs ON z.zorg_situatie_id = zs.id
            WHERE z.dossier_id = @dossierId
              AND z.zorg_categorie_id = @categorieId
            ORDER BY z.gewijzigd_op DESC, z.id DESC
        `;

        const records = await this.queryMany<any>(query, { dossierId, categorieId });
        return records.map(record => this.mapZorgWithLookups(record));
    }

    /**
     * Create a new zorg record
     * Sets aangemaakt_op and gewijzigd_op to current timestamp
     */
    async create(data: CreateZorgDto): Promise<Zorg> {
        const query = `
            INSERT INTO dbo.zorg (
                dossier_id,
                zorg_categorie_id,
                zorg_situatie_id,
                overeenkomst,
                situatie_anders,
                is_custom_text,
                aangemaakt_door
            )
            OUTPUT INSERTED.*
            VALUES (
                @dossierId,
                @zorgCategorieId,
                @zorgSituatieId,
                @overeenkomst,
                @situatieAnders,
                @isCustomText,
                @aangemaaktDoor
            )
        `;

        const params = {
            dossierId: data.dossierId,
            zorgCategorieId: data.zorgCategorieId,
            zorgSituatieId: data.zorgSituatieId,
            overeenkomst: data.overeenkomst,
            situatieAnders: data.situatieAnders || null,
            isCustomText: data.isCustomText || false,
            aangemaaktDoor: data.aangemaaktDoor
        };

        const result = await this.executeQuery<any>(query, params);

        if (!result.recordset || result.recordset.length === 0) {
            throw new Error('Failed to create zorg record');
        }

        return DbMappers.toZorg(result.recordset[0]);
    }

    /**
     * Update an existing zorg record
     * Only updates fields that are provided (partial update)
     * Sets gewijzigd_op to current timestamp
     */
    async update(zorgId: number, data: UpdateZorgDto): Promise<Zorg> {
        // Build dynamic UPDATE query based on provided fields
        const updates: string[] = [];
        const params: Record<string, any> = { zorgId };

        if (data.zorgCategorieId !== undefined) {
            updates.push('zorg_categorie_id = @zorgCategorieId');
            params.zorgCategorieId = data.zorgCategorieId;
        }

        if (data.zorgSituatieId !== undefined) {
            updates.push('zorg_situatie_id = @zorgSituatieId');
            params.zorgSituatieId = data.zorgSituatieId;
        }

        if (data.overeenkomst !== undefined) {
            updates.push('overeenkomst = @overeenkomst');
            params.overeenkomst = data.overeenkomst;
        }

        if (data.situatieAnders !== undefined) {
            updates.push('situatie_anders = @situatieAnders');
            params.situatieAnders = data.situatieAnders;
        }

        if (data.isCustomText !== undefined) {
            updates.push('is_custom_text = @isCustomText');
            params.isCustomText = data.isCustomText;
        }

        // Always update gewijzigd_op and gewijzigd_door
        updates.push('gewijzigd_op = GETDATE()');
        updates.push('gewijzigd_door = @gewijzigdDoor');
        params.gewijzigdDoor = data.gewijzigdDoor;

        if (updates.length === 2) {
            // Only gewijzigd_op and gewijzigd_door would be updated
            throw new Error('No fields provided for update');
        }

        const query = `
            UPDATE dbo.zorg
            SET ${updates.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @zorgId
        `;

        const result = await this.executeQuery<any>(query, params);

        if (!result.recordset || result.recordset.length === 0) {
            throw new Error(`Zorg with ID ${zorgId} not found`);
        }

        return DbMappers.toZorg(result.recordset[0]);
    }

    /**
     * Delete a zorg record
     * Performs hard delete from database
     */
    async delete(zorgId: number): Promise<boolean> {
        const query = `
            DELETE FROM dbo.zorg
            WHERE id = @zorgId
        `;

        const result = await this.executeQuery(query, { zorgId });
        return result.rowsAffected && result.rowsAffected[0] > 0;
    }

    /**
     * Delete all zorg records for a specific categorie within a dossier
     * Performs bulk hard delete from database
     * Useful for "reset" functionality when user wants to clear all arrangements of a specific type
     *
     * @param dossierId - The dossier ID to delete from
     * @param categorieId - The categorie ID to filter by (e.g., 6 for "Vakanties")
     * @returns Number of records deleted (0 if no records found)
     *
     * @example
     * // Delete all vacation arrangements for dossier 123
     * const deleted = await zorgRepo.deleteByCategorie(123, 6);
     * console.log(`Deleted ${deleted} vacation records`);
     */
    async deleteByCategorie(dossierId: number, categorieId: number): Promise<number> {
        const query = `
            DELETE FROM dbo.zorg
            WHERE dossier_id = @dossierId
              AND zorg_categorie_id = @categorieId
        `;

        const result = await this.executeQuery(query, { dossierId, categorieId });
        return result.rowsAffected && result.rowsAffected[0] > 0
            ? result.rowsAffected[0]
            : 0;
    }

    /**
     * Check if a zorg record exists
     */
    async zorgExists(zorgId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.zorg
            WHERE id = @zorgId
        `;

        const result = await this.querySingle<{ count: number }>(query, { zorgId });
        return result ? result.count > 0 : false;
    }

    /**
     * Count the number of zorg records in a dossier
     */
    async count(dossierId: number): Promise<number> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.zorg
            WHERE dossier_id = @dossierId
        `;

        const result = await this.querySingle<{ count: number }>(query, { dossierId });
        return result ? result.count : 0;
    }

    /**
     * Validate that a situatie belongs to a specific categorie
     * Checks if zorg_situaties.zorg_categorie_id matches the provided categorieId
     * or if zorg_categorie_id is NULL (universal situatie)
     */
    async validateSituatieForCategorie(situatieId: number, categorieId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.zorg_situaties
            WHERE id = @situatieId
              AND (zorg_categorie_id = @categorieId OR zorg_categorie_id IS NULL)
        `;

        const result = await this.querySingle<{ count: number }>(
            query,
            { situatieId, categorieId }
        );
        return result ? result.count > 0 : false;
    }

    /**
     * Get all available zorg categoriën for dropdown/select lists
     * Ordered alphabetically by naam
     */
    async getAllCategorieen(): Promise<ZorgCategorie[]> {
        const query = `
            SELECT id, naam
            FROM dbo.zorg_categorieen
            ORDER BY naam
        `;

        const records = await this.queryMany<any>(query);
        return records.map(record => DbMappers.toZorgCategorie(record));
    }

    /**
     * Get all situaties that belong to a specific categorie
     * Includes both categorie-specific situaties and universal situaties (zorg_categorie_id IS NULL)
     * Ordered alphabetically by naam
     */
    async getSituatiesForCategorie(categorieId: number): Promise<ZorgSituatie[]> {
        const query = `
            SELECT id, naam, zorg_categorie_id
            FROM dbo.zorg_situaties
            WHERE zorg_categorie_id = @categorieId
               OR zorg_categorie_id IS NULL
            ORDER BY naam
        `;

        const records = await this.queryMany<any>(query, { categorieId });
        return records.map(record => DbMappers.toZorgSituatie(record));
    }

    /**
     * Helper method to map database row to ZorgWithLookups
     * Extracts zorg data and prefixed categorie/situatie fields
     */
    private mapZorgWithLookups(record: any): ZorgWithLookups {
        return {
            zorg: DbMappers.toZorg(record),
            categorie: this.mapCategorie(record),
            situatie: this.mapSituatie(record)
        };
    }

    /**
     * Helper method to extract categorie data from prefixed columns
     */
    private mapCategorie(record: any): ZorgCategorie {
        return {
            id: record.categorie_id,
            naam: record.categorie_naam
        };
    }

    /**
     * Helper method to extract situatie data from prefixed columns
     */
    private mapSituatie(record: any): ZorgSituatie {
        return {
            id: record.situatie_id,
            naam: record.situatie_naam,
            zorgCategorieId: record.situatie_categorie_id
        };
    }
}

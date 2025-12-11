import { BaseRepository } from './base/BaseRepository';
import { ILookupRepository } from './interfaces/ILookupRepository';
import { Rol, RelatieType } from '../models/Dossier';

/**
 * Lookup Repository
 *
 * Centralizes all lookup/reference data operations.
 * All methods are read-only - NO writes, updates, or deletes.
 *
 * Key Characteristics:
 * - Pure read-only operations
 * - Simple SELECT queries
 * - No business logic
 * - No validation needed
 * - Perfect for aggressive caching (30-minute cache recommended)
 * - Minimal database load
 *
 * Lookup Tables:
 * - rollen: User roles in the system
 * - relatie_types: Types of relationships (parent, guardian, etc.)
 * - dagen: Days of the week
 * - dagdelen: Day parts (morning, afternoon, evening, etc.)
 * - week_regelingen: Week arrangement templates
 * - zorg_categorieen: Care categories
 * - zorg_situaties: Care situations
 */
export class LookupRepository extends BaseRepository implements ILookupRepository {
    /**
     * Get all roles
     * Table: dbo.rollen
     */
    async getRollen(): Promise<Rol[]> {
        const query = `
            SELECT id, naam
            FROM dbo.rollen
            ORDER BY naam
        `;
        return await this.queryMany<Rol>(query);
    }

    /**
     * Get a specific role by ID
     * Table: dbo.rollen
     */
    async getRolById(rolId: number): Promise<Rol | null> {
        const query = `
            SELECT id, naam
            FROM dbo.rollen
            WHERE id = @rolId
        `;
        return await this.querySingle<Rol>(query, { rolId });
    }

    /**
     * Get all relationship types
     * Table: dbo.relatie_types
     */
    async getRelatieTypes(): Promise<RelatieType[]> {
        const query = `
            SELECT id, naam
            FROM dbo.relatie_types
            ORDER BY naam
        `;
        return await this.queryMany<RelatieType>(query);
    }

    /**
     * Get a specific relationship type by ID
     * Table: dbo.relatie_types
     */
    async getRelatieTypeById(relatieTypeId: number): Promise<RelatieType | null> {
        const query = `
            SELECT id, naam
            FROM dbo.relatie_types
            WHERE id = @relatieTypeId
        `;
        return await this.querySingle<RelatieType>(query, { relatieTypeId });
    }

    /**
     * Get all days of the week
     * Table: dbo.dagen
     */
    async getAllDagen(): Promise<Array<{ id: number; naam: string }>> {
        const query = `
            SELECT id, naam
            FROM dbo.dagen
            ORDER BY id
        `;
        return await this.queryMany(query);
    }

    /**
     * Get a specific day by ID
     * Table: dbo.dagen
     */
    async getDagById(dagId: number): Promise<{ id: number; naam: string } | null> {
        const query = `
            SELECT id, naam
            FROM dbo.dagen
            WHERE id = @dagId
        `;
        return await this.querySingle(query, { dagId });
    }

    /**
     * Get all day parts (morning, afternoon, evening, etc.)
     * Table: dbo.dagdelen
     */
    async getAllDagdelen(): Promise<Array<{ id: number; naam: string }>> {
        const query = `
            SELECT id, naam
            FROM dbo.dagdelen
            ORDER BY id
        `;
        return await this.queryMany(query);
    }

    /**
     * Get a specific day part by ID
     * Table: dbo.dagdelen
     */
    async getDagdeelById(dagdeelId: number): Promise<{ id: number; naam: string } | null> {
        const query = `
            SELECT id, naam
            FROM dbo.dagdelen
            WHERE id = @dagdeelId
        `;
        return await this.querySingle(query, { dagdeelId });
    }

    /**
     * Get all week arrangements
     * Table: dbo.week_regelingen
     */
    async getAllWeekRegelingen(): Promise<Array<{ id: number; omschrijving: string }>> {
        const query = `
            SELECT id, omschrijving
            FROM dbo.week_regelingen
            ORDER BY id
        `;
        return await this.queryMany(query);
    }

    /**
     * Get a specific week arrangement by ID
     * Table: dbo.week_regelingen
     */
    async getWeekRegelingById(regelingId: number): Promise<{ id: number; omschrijving: string } | null> {
        const query = `
            SELECT id, omschrijving
            FROM dbo.week_regelingen
            WHERE id = @regelingId
        `;
        return await this.querySingle(query, { regelingId });
    }

    /**
     * Get all care categories
     * Table: dbo.zorg_categorieen
     */
    async getZorgCategorieen(): Promise<Array<{ id: number; naam: string }>> {
        const query = `
            SELECT id, naam
            FROM dbo.zorg_categorieen
            ORDER BY naam
        `;
        return await this.queryMany(query);
    }

    /**
     * Get a specific care category by ID
     * Table: dbo.zorg_categorieen
     */
    async getZorgCategorieById(categorieId: number): Promise<{ id: number; naam: string } | null> {
        const query = `
            SELECT id, naam
            FROM dbo.zorg_categorieen
            WHERE id = @categorieId
        `;
        return await this.querySingle(query, { categorieId });
    }

    /**
     * Get all care situations
     * Table: dbo.zorg_situaties
     */
    async getZorgSituaties(): Promise<Array<{ id: number; naam: string; zorgCategorieId?: number }>> {
        const query = `
            SELECT
                id,
                naam,
                zorg_categorie_id as zorgCategorieId
            FROM dbo.zorg_situaties
            ORDER BY naam
        `;
        return await this.queryMany(query);
    }

    /**
     * Get care situations for a specific category
     * Table: dbo.zorg_situaties
     */
    async getZorgSituatiesForCategorie(categorieId: number): Promise<Array<{ id: number; naam: string; zorgCategorieId?: number }>> {
        const query = `
            SELECT
                id,
                naam,
                zorg_categorie_id as zorgCategorieId
            FROM dbo.zorg_situaties
            WHERE zorg_categorie_id = @categorieId
            ORDER BY naam
        `;
        return await this.queryMany(query, { categorieId });
    }

    /**
     * Get a specific care situation by ID
     * Table: dbo.zorg_situaties
     */
    async getZorgSituatieById(situatieId: number): Promise<{ id: number; naam: string; zorgCategorieId?: number } | null> {
        const query = `
            SELECT
                id,
                naam,
                zorg_categorie_id as zorgCategorieId
            FROM dbo.zorg_situaties
            WHERE id = @situatieId
        `;
        return await this.querySingle(query, { situatieId });
    }

    /**
     * Get all pension providers / financial institutions
     * Table: dbo.pensioen_uitvoerders
     * Extended with categorie and geschikt_voor for filtering
     */
    async getPensioenUitvoerders(options?: {
        type?: string;
        search?: string;
        includeInactive?: boolean;
        geschiktVoor?: string;
    }): Promise<Array<{ id: number; naam: string; type: string; categorie?: string; geschiktVoor?: string }>> {
        let query = `
            SELECT id, naam, type, categorie, geschikt_voor as geschiktVoor
            FROM dbo.pensioen_uitvoerders
            WHERE 1=1
        `;

        const params: Record<string, any> = {};

        // Filter by active status (default: only active)
        if (!options?.includeInactive) {
            query += ` AND is_actief = 1`;
        }

        // Filter by type
        if (options?.type) {
            query += ` AND type = @type`;
            params.type = options.type;
        }

        // Filter by geschikt_voor (comma-separated values, check if contains)
        if (options?.geschiktVoor) {
            query += ` AND (geschikt_voor LIKE @geschiktVoor OR naam = 'Anders')`;
            params.geschiktVoor = `%${options.geschiktVoor}%`;
        }

        // Filter by search term
        if (options?.search) {
            query += ` AND naam LIKE @search`;
            params.search = `%${options.search}%`;
        }

        query += ` ORDER BY volgorde ASC, naam ASC`;

        return await this.queryMany(query, Object.keys(params).length > 0 ? params : undefined);
    }

    /**
     * Get a specific pension provider by ID
     * Table: dbo.pensioen_uitvoerders
     */
    async getPensioenUitvoerderById(uitvoerderId: number): Promise<{ id: number; naam: string; type: string } | null> {
        const query = `
            SELECT id, naam, type
            FROM dbo.pensioen_uitvoerders
            WHERE id = @uitvoerderId
        `;
        return await this.querySingle(query, { uitvoerderId });
    }
}

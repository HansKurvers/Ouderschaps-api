import { Rol, RelatieType } from '../../models/Dossier';

/**
 * Lookup Repository Interface
 *
 * Centralizes all lookup/reference data operations.
 * All lookups are read-only reference data with aggressive caching.
 *
 * Responsibilities:
 * - Provide access to all lookup tables
 * - Simple SELECT queries only
 * - No business logic
 * - Support caching at function level
 *
 * Lookup Tables Covered:
 * - Rollen (roles)
 * - RelatieTypes (relationship types)
 * - Dagen (days)
 * - Dagdelen (day parts)
 * - WeekRegelingen (week arrangements)
 * - ZorgCategorieen (care categories)
 * - ZorgSituaties (care situations)
 */
export interface ILookupRepository {
    /**
     * Get all roles
     * @returns Array of all roles
     */
    getRollen(): Promise<Rol[]>;

    /**
     * Get a specific role by ID
     * @param rolId The role ID
     * @returns The role or null if not found
     */
    getRolById(rolId: number): Promise<Rol | null>;

    /**
     * Get all relationship types
     * @returns Array of all relationship types
     */
    getRelatieTypes(): Promise<RelatieType[]>;

    /**
     * Get a specific relationship type by ID
     * @param relatieTypeId The relationship type ID
     * @returns The relationship type or null if not found
     */
    getRelatieTypeById(relatieTypeId: number): Promise<RelatieType | null>;

    /**
     * Get all days of the week
     * @returns Array of all days
     */
    getAllDagen(): Promise<Array<{ id: number; naam: string }>>;

    /**
     * Get a specific day by ID
     * @param dagId The day ID
     * @returns The day or null if not found
     */
    getDagById(dagId: number): Promise<{ id: number; naam: string } | null>;

    /**
     * Get all day parts (morning, afternoon, evening, etc.)
     * @returns Array of all day parts
     */
    getAllDagdelen(): Promise<Array<{ id: number; naam: string }>>;

    /**
     * Get a specific day part by ID
     * @param dagdeelId The day part ID
     * @returns The day part or null if not found
     */
    getDagdeelById(dagdeelId: number): Promise<{ id: number; naam: string } | null>;

    /**
     * Get all week arrangements
     * @returns Array of all week arrangements
     */
    getAllWeekRegelingen(): Promise<Array<{ id: number; omschrijving: string }>>;

    /**
     * Get a specific week arrangement by ID
     * @param regelingId The arrangement ID
     * @returns The arrangement or null if not found
     */
    getWeekRegelingById(regelingId: number): Promise<{ id: number; omschrijving: string } | null>;

    /**
     * Get all care categories
     * @returns Array of all care categories
     */
    getZorgCategorieen(): Promise<Array<{ id: number; naam: string }>>;

    /**
     * Get a specific care category by ID
     * @param categorieId The category ID
     * @returns The category or null if not found
     */
    getZorgCategorieById(categorieId: number): Promise<{ id: number; naam: string } | null>;

    /**
     * Get all care situations
     * @returns Array of all care situations
     */
    getZorgSituaties(): Promise<Array<{ id: number; naam: string; zorgCategorieId?: number }>>;

    /**
     * Get care situations for a specific category
     * @param categorieId The category ID
     * @returns Array of care situations for the category
     */
    getZorgSituatiesForCategorie(categorieId: number): Promise<Array<{ id: number; naam: string; zorgCategorieId?: number }>>;

    /**
     * Get a specific care situation by ID
     * @param situatieId The situation ID
     * @returns The situation or null if not found
     */
    getZorgSituatieById(situatieId: number): Promise<{ id: number; naam: string; zorgCategorieId?: number } | null>;
}

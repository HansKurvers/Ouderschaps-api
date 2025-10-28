import { Zorg, ZorgWithLookups, ZorgCategorie, ZorgSituatie } from '../../models/Dossier';

/**
 * Data Transfer Object for creating new zorg records
 *
 * Business Rules:
 * - dossierId must exist and user must have access
 * - zorgCategorieId must exist in zorg_categorieen table
 * - zorgSituatieId must exist in zorg_situaties table
 * - zorgSituatie must belong to the selected zorgCategorie
 * - overeenkomst is required and must be between 1-5000 characters
 * - situatieAnders is optional (max 500 characters)
 * - aangemaaktDoor tracks who created the record
 */
export interface CreateZorgDto {
    dossierId: number;
    zorgCategorieId: number;
    zorgSituatieId: number;
    overeenkomst: string;
    situatieAnders?: string;
    aangemaaktDoor: number;
}

/**
 * Data Transfer Object for updating existing zorg records
 *
 * Business Rules:
 * - At least one field besides gewijzigdDoor must be provided
 * - If zorgCategorieId is changed, zorgSituatieId must be validated
 * - gewijzigdDoor is required to track who modified the record
 */
export interface UpdateZorgDto {
    zorgCategorieId?: number;
    zorgSituatieId?: number;
    overeenkomst?: string;
    situatieAnders?: string;
    gewijzigdDoor: number;
}

/**
 * Repository interface for managing zorg (care arrangement) records
 *
 * Responsibilities:
 * - CRUD operations for zorg records
 * - Validation of categorie/situatie relationships
 * - Lookup data retrieval for dropdowns
 * - Multi-tenant data isolation via dossier ownership
 *
 * Database Tables:
 * - dbo.zorg (main table)
 * - dbo.zorg_categorieen (lookup table)
 * - dbo.zorg_situaties (lookup table with categorie FK)
 *
 * Business Rules:
 * - Each zorg must have valid categorie and situatie
 * - Situatie must belong to the selected categorie (via zorg_categorie_id)
 * - Track creator (aangemaaktDoor) and modifier (gewijzigdDoor)
 * - Multi-tenant: users can only access zorg from their own dossiers
 */
export interface IZorgRepository {
    /**
     * Find all zorg records for a specific dossier
     * Returns zorg with joined categorie and situatie lookup data
     * Ordered by gewijzigd_op DESC (most recent first)
     *
     * @param dossierId - The dossier ID to search for
     * @returns Array of ZorgWithLookups (empty array if none found)
     */
    findByDossierId(dossierId: number): Promise<ZorgWithLookups[]>;

    /**
     * Find a specific zorg record by ID
     * Returns zorg with joined categorie and situatie lookup data
     *
     * @param zorgId - The zorg ID to search for
     * @returns ZorgWithLookups if found, null otherwise
     */
    findById(zorgId: number): Promise<ZorgWithLookups | null>;

    /**
     * Find all zorg records for a specific categorie within a dossier
     * Useful for filtering zorg by type (e.g., all "Hoofdverblijf" records)
     *
     * @param dossierId - The dossier ID to search within
     * @param categorieId - The categorie ID to filter by
     * @returns Array of ZorgWithLookups (empty array if none found)
     */
    findByCategorie(dossierId: number, categorieId: number): Promise<ZorgWithLookups[]>;

    /**
     * Create a new zorg record
     * Validates that situatie belongs to categorie before creating
     * Sets aangemaakt_op and gewijzigd_op to current timestamp
     *
     * @param data - The zorg data to create
     * @returns The created Zorg record
     * @throws Error if validation fails or database error occurs
     */
    create(data: CreateZorgDto): Promise<Zorg>;

    /**
     * Update an existing zorg record
     * Only updates fields that are provided (partial update)
     * Sets gewijzigd_op to current timestamp
     *
     * @param zorgId - The ID of the zorg to update
     * @param data - The fields to update
     * @returns The updated Zorg record
     * @throws Error if zorg not found or database error occurs
     */
    update(zorgId: number, data: UpdateZorgDto): Promise<Zorg>;

    /**
     * Delete a zorg record
     * Performs hard delete from database
     *
     * @param zorgId - The ID of the zorg to delete
     * @returns true if deleted, false if not found
     * @throws Error if database error occurs
     */
    delete(zorgId: number): Promise<boolean>;

    /**
     * Delete all zorg records for a specific categorie within a dossier
     * Performs bulk hard delete from database
     * Useful for "reset" functionality when user wants to clear all arrangements of a specific type
     *
     * @param dossierId - The dossier ID to delete from
     * @param categorieId - The categorie ID to filter by
     * @returns Number of records deleted
     * @throws Error if database error occurs
     */
    deleteByCategorie(dossierId: number, categorieId: number): Promise<number>;

    /**
     * Check if a zorg record exists
     *
     * @param zorgId - The ID to check
     * @returns true if exists, false otherwise
     */
    zorgExists(zorgId: number): Promise<boolean>;

    /**
     * Count the number of zorg records in a dossier
     *
     * @param dossierId - The dossier ID to count for
     * @returns The count of zorg records
     */
    count(dossierId: number): Promise<number>;

    /**
     * Validate that a situatie belongs to a specific categorie
     * Checks if zorg_situaties.zorg_categorie_id matches the provided categorieId
     * or if zorg_categorie_id is NULL (universal situatie)
     *
     * @param situatieId - The situatie ID to validate
     * @param categorieId - The categorie ID to validate against
     * @returns true if valid, false otherwise
     */
    validateSituatieForCategorie(situatieId: number, categorieId: number): Promise<boolean>;

    /**
     * Get all available zorg categoriën for dropdown/select lists
     * Ordered alphabetically by naam
     *
     * @returns Array of all ZorgCategorie records
     */
    getAllCategorieen(): Promise<ZorgCategorie[]>;

    /**
     * Get all situaties that belong to a specific categorie
     * Includes both categorie-specific situaties and universal situaties (zorg_categorie_id IS NULL)
     * Ordered alphabetically by naam
     *
     * @param categorieId - The categorie ID to get situaties for
     * @returns Array of ZorgSituatie records
     */
    getSituatiesForCategorie(categorieId: number): Promise<ZorgSituatie[]>;
}

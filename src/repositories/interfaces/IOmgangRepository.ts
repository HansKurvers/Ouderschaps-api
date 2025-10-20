import {
    Omgang,
    OmgangWithLookups,
    OmgangSchedule,
    Dag,
    Dagdeel,
    WeekRegeling,
    CreateOmgangDto,
    UpdateOmgangDto
} from '../../models/Dossier';

/**
 * Repository interface for managing omgang (visitation/contact schedule) records
 *
 * Responsibilities:
 * - CRUD operations for omgang records
 * - Schedule building and visualization
 * - Validation of verzorger (caregiver) access
 * - Overlap detection for schedule conflicts
 * - Lookup data retrieval for dropdowns
 * - Multi-tenant data isolation via dossier ownership
 *
 * Database Tables:
 * - dbo.omgang (main table)
 * - dbo.dag (lookup table - 7 days of week)
 * - dbo.dagdeel (lookup table - 4 parts of day)
 * - dbo.week_regeling (lookup table - week patterns)
 * - dbo.personen (verzorger reference)
 *
 * Business Rules:
 * - Verzorger must be a partij in the dossier
 * - No overlapping schedules (same dag + dagdeel + week_regeling)
 * - wisselTijd format must be HH:MM (24-hour)
 * - week_regeling_anders used only for custom text
 * - Multi-tenant: users can only access omgang from their own dossiers
 */
export interface IOmgangRepository {
    /**
     * Find all omgang records for a specific dossier
     * Returns omgang with joined dag, dagdeel, verzorger, and week_regeling lookup data
     * Ordered by dag.id ASC, dagdeel.id ASC (logical day/time order)
     *
     * @param dossierId - The dossier ID to search for
     * @returns Array of OmgangWithLookups (empty array if none found)
     */
    findByDossierId(dossierId: number): Promise<OmgangWithLookups[]>;

    /**
     * Find a specific omgang record by ID
     * Returns omgang with joined dag, dagdeel, verzorger, and week_regeling lookup data
     *
     * @param omgangId - The omgang ID to search for
     * @returns OmgangWithLookups if found, null otherwise
     */
    findById(omgangId: number): Promise<OmgangWithLookups | null>;

    /**
     * Get a structured schedule view for a dossier
     * Transforms flat omgang records into nested structure: dag → dagdeel → details
     * Useful for rendering weekly schedule grid in UI
     *
     * Example output:
     * {
     *   "Maandag": {
     *     "Ochtend": { verzorger: {...}, wisselTijd: "08:00", weekRegeling: "Elke week" },
     *     "Middag": { verzorger: {...}, wisselTijd: "13:00", weekRegeling: "Elke week" }
     *   },
     *   "Dinsdag": { ... }
     * }
     *
     * @param dossierId - The dossier ID to get schedule for
     * @returns Nested schedule structure
     */
    getSchedule(dossierId: number): Promise<OmgangSchedule>;

    /**
     * Create a new omgang record
     * Sets aangemaakt_op and gewijzigd_op to current timestamp
     *
     * @param data - The omgang data to create
     * @returns The created Omgang record
     * @throws Error if validation fails or database error occurs
     */
    create(data: CreateOmgangDto): Promise<Omgang>;

    /**
     * Update an existing omgang record
     * Only updates fields that are provided (partial update)
     * Sets gewijzigd_op to current timestamp
     *
     * @param omgangId - The ID of the omgang to update
     * @param data - The fields to update
     * @returns The updated Omgang record
     * @throws Error if omgang not found or database error occurs
     */
    update(omgangId: number, data: UpdateOmgangDto): Promise<Omgang>;

    /**
     * Delete an omgang record
     * Performs hard delete from database
     *
     * @param omgangId - The ID of the omgang to delete
     * @returns true if deleted, false if not found
     * @throws Error if database error occurs
     */
    delete(omgangId: number): Promise<boolean>;

    /**
     * Check if an omgang record exists
     *
     * @param omgangId - The ID to check
     * @returns true if exists, false otherwise
     */
    omgangExists(omgangId: number): Promise<boolean>;

    /**
     * Count the number of omgang records in a dossier
     *
     * @param dossierId - The dossier ID to count for
     * @returns The count of omgang records
     */
    count(dossierId: number): Promise<number>;

    /**
     * Validate that a verzorger (person) is a partij in the dossier
     * Checks dbo.dossiers_partijen junction table
     *
     * @param dossierId - The dossier ID to check
     * @param verzorgerId - The person ID to validate
     * @returns true if person is a partij in dossier, false otherwise
     */
    validateVerzorger(dossierId: number, verzorgerId: number): Promise<boolean>;

    /**
     * Check for schedule overlap
     * Detects if another omgang exists with same dag + dagdeel + week_regeling
     * This prevents double-booking of time slots
     *
     * @param dossierId - The dossier ID to check within
     * @param dagId - The dag (day) ID
     * @param dagdeelId - The dagdeel (day part) ID
     * @param weekRegelingId - The week regeling (week pattern) ID
     * @param excludeOmgangId - Optional omgang ID to exclude from check (for updates)
     * @returns true if overlap exists, false otherwise
     */
    checkOverlap(
        dossierId: number,
        dagId: number,
        dagdeelId: number,
        weekRegelingId: number,
        excludeOmgangId?: number
    ): Promise<boolean>;

    /**
     * Get all available dagen (days of week) for dropdown/select lists
     * Returns 7 days: Maandag through Zondag
     * Ordered by id (Monday = 1, Sunday = 7)
     *
     * @returns Array of all Dag records
     */
    getAllDagen(): Promise<Dag[]>;

    /**
     * Get all available dagdelen (parts of day) for dropdown/select lists
     * Returns 4 parts: Ochtend, Middag, Avond, Nacht
     * Ordered by id
     *
     * @returns Array of all Dagdeel records
     */
    getAllDagdelen(): Promise<Dagdeel[]>;

    /**
     * Get all available week regelingen (week patterns) for dropdown/select lists
     * Examples: "Elke week", "Even weken", "Oneven weken", etc.
     * Ordered by id
     *
     * @returns Array of all WeekRegeling records
     */
    getAllWeekRegelingen(): Promise<WeekRegeling[]>;
}

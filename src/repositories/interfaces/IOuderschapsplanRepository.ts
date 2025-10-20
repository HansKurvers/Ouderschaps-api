import { CompletePlan, PlanSummary, PlanVolledigheid, PlanMetadata } from '../../models/Dossier';

/**
 * Ouderschapsplan Repository Interface
 *
 * THE MASTER ORCHESTRATOR - Brings together ALL repositories
 * to generate a complete ouderschapsplan (parenting plan).
 *
 * This repository orchestrates:
 * - DossierRepository (basic dossier info)
 * - PartijRepository (parents/parties)
 * - KindRepository (children and relationships)
 * - OmgangRepository (visitation schedules)
 * - ZorgRepository (care arrangements)
 * - AlimentatieRepository (child support)
 *
 * Responsibilities:
 * - Fetch all related data for a dossier
 * - Calculate plan completeness
 * - Generate metadata and statistics
 * - Validate business rules
 * - Provide unified data structure
 *
 * This is THE HEART of the application - where everything comes together!
 */
export interface IOuderschapsplanRepository {
    /**
     * Get complete ouderschapsplan with ALL related data
     *
     * This is the main method that orchestrates all repositories
     * to build a unified view of the complete parenting plan.
     *
     * Includes:
     * - Dossier information
     * - All parties (parents/guardians)
     * - All children with their parent relationships
     * - Complete visitation schedule and entries
     * - All care arrangements
     * - All child support agreements
     * - Completeness validation
     * - Metadata and statistics
     *
     * Performance: Uses Promise.all for parallel fetching
     *
     * @param dossierId The dossier ID
     * @returns Complete plan with all data and metadata
     * @throws Error if dossier not found
     */
    getCompletePlan(dossierId: number): Promise<CompletePlan>;

    /**
     * Get plan summary for overview/list views
     *
     * More efficient than getCompletePlan for list views.
     * Only fetches counts instead of full data.
     *
     * Includes:
     * - Basic dossier info
     * - Counts for each section
     * - Completeness percentage
     * - Last modified date
     *
     * @param dossierId The dossier ID
     * @returns Summary with counts and metadata
     * @throws Error if dossier not found
     */
    getPlanSummary(dossierId: number): Promise<PlanSummary>;

    /**
     * Validate plan completeness
     *
     * Checks if all required sections are filled according to business rules:
     * - Requires at least 2 parties (both parents)
     * - Requires at least 1 child
     * - Requires at least 1 visitation arrangement
     * - Requires at least 1 care arrangement
     * - Child support is optional
     *
     * @param dossierId The dossier ID
     * @returns Completeness validation with percentage
     */
    validatePlanCompleteness(dossierId: number): Promise<PlanVolledigheid>;

    /**
     * Check if plan is complete
     *
     * Returns true only if all required sections are filled.
     * This is a convenience method that calls validatePlanCompleteness
     * and returns only the isCompleet boolean.
     *
     * @param dossierId The dossier ID
     * @returns True if plan is complete, false otherwise
     */
    isPlanComplete(dossierId: number): Promise<boolean>;

    /**
     * Get plan metadata only
     *
     * Efficient way to get completeness and timestamps
     * without fetching all plan data.
     *
     * Includes:
     * - Completeness validation
     * - Last modified date
     * - Number of complete sections
     * - Total sections count
     *
     * @param dossierId The dossier ID
     * @returns Metadata with completeness and stats
     */
    getPlanMetadata(dossierId: number): Promise<PlanMetadata>;

    /**
     * Get last modified date from all related entities
     *
     * Checks dossier, omgang, zorg, and alimentatie tables
     * and returns the most recent gewijzigd_op timestamp.
     *
     * @param dossierId The dossier ID
     * @returns Most recent modification date
     * @throws Error if dossier not found
     */
    getLastModifiedDate(dossierId: number): Promise<Date>;
}

import { Alimentatie, AlimentatieWithPersonen } from '../../models/Dossier';

/**
 * DTO for creating new alimentatie
 */
export interface CreateAlimentatieDto {
    dossierId: number;
    betalerId: number;
    ontvangerId: number;
    bedrag: number;
    frequentie: string;
    ingangsdatum: Date;
    einddatum?: Date;
    opmerkingen?: string;
}

/**
 * DTO for updating existing alimentatie
 */
export interface UpdateAlimentatieDto {
    bedrag?: number;
    frequentie?: string;
    ingangsdatum?: Date;
    einddatum?: Date;
    opmerkingen?: string;
}

/**
 * AlimentatieRepository Interface
 *
 * Manages child support/alimony records in dossiers.
 *
 * Business Rules:
 * - Betaler and ontvanger must be different persons
 * - Both must be partijen in the dossier
 * - Bedrag must be positive (> 0)
 * - Einddatum must be after ingangsdatum (if provided)
 * - Multi-tenant: only access alimentatie from user's dossiers
 */
export interface IAlimentatieRepository {
    /**
     * Get all alimentatie records for a dossier with betaler/ontvanger data
     *
     * @param dossierId - The dossier ID
     * @returns Array of alimentatie with person details
     */
    findByDossierId(dossierId: number): Promise<AlimentatieWithPersonen[]>;

    /**
     * Get a single alimentatie record by ID with betaler/ontvanger data
     *
     * @param alimentatieId - The alimentatie ID
     * @returns Alimentatie with person details, or null if not found
     */
    findById(alimentatieId: number): Promise<AlimentatieWithPersonen | null>;

    /**
     * Create new alimentatie record
     *
     * @param data - Alimentatie data
     * @returns Created alimentatie record
     */
    create(data: CreateAlimentatieDto): Promise<Alimentatie>;

    /**
     * Update existing alimentatie record
     *
     * @param alimentatieId - The alimentatie ID
     * @param data - Updated alimentatie data
     * @returns Updated alimentatie record
     */
    update(alimentatieId: number, data: UpdateAlimentatieDto): Promise<Alimentatie>;

    /**
     * Delete alimentatie record
     *
     * @param alimentatieId - The alimentatie ID
     * @returns True if deleted, false if not found
     */
    delete(alimentatieId: number): Promise<boolean>;

    /**
     * Check if alimentatie exists
     *
     * @param alimentatieId - The alimentatie ID
     * @returns True if exists, false otherwise
     */
    alimentatieExists(alimentatieId: number): Promise<boolean>;

    /**
     * Count alimentatie records in a dossier
     *
     * @param dossierId - The dossier ID
     * @returns Number of alimentatie records
     */
    count(dossierId: number): Promise<number>;

    /**
     * Validate that betaler is a partij in the dossier
     *
     * @param dossierId - The dossier ID
     * @param betalerId - The betaler persoon ID
     * @returns True if betaler is partij in dossier
     */
    validateBetaler(dossierId: number, betalerId: number): Promise<boolean>;

    /**
     * Validate that ontvanger is a partij in the dossier
     *
     * @param dossierId - The dossier ID
     * @param ontvangerId - The ontvanger persoon ID
     * @returns True if ontvanger is partij in dossier
     */
    validateOntvanger(dossierId: number, ontvangerId: number): Promise<boolean>;
}

import { BaseRepository } from './base/BaseRepository';
import { Alimentatie, AlimentatieWithPersonen, Persoon } from '../models/Dossier';
import {
    IAlimentatieRepository,
    CreateAlimentatieDto,
    UpdateAlimentatieDto
} from './interfaces/IAlimentatieRepository';
import { DbMappers } from '../utils/db-mappers';

/**
 * AlimentatieRepository
 *
 * Manages child support/alimony records in dossiers.
 *
 * Database Structure:
 * - dbo.alimentaties: Main table storing alimentatie records
 * - betaler_id → dbo.personen: Person paying alimentatie
 * - ontvanger_id → dbo.personen: Person receiving alimentatie
 * - dossier_id → dbo.dossiers: Associated dossier
 *
 * Business Rules:
 * - Betaler and ontvanger must be different persons
 * - Both must be partijen in the dossier
 * - Bedrag must be positive (> 0)
 * - Einddatum must be after ingangsdatum (if provided)
 * - Multi-tenant: only alimentatie from user's dossiers accessible
 */
export class AlimentatieRepository extends BaseRepository implements IAlimentatieRepository {

    /**
     * Get all alimentatie records for a dossier with betaler/ontvanger details
     *
     * @param dossierId - The dossier ID
     * @returns Array of alimentatie with person details
     */
    async findByDossierId(dossierId: number): Promise<AlimentatieWithPersonen[]> {
        const query = `
            SELECT
                a.id, a.dossier_id, a.betaler_id, a.ontvanger_id,
                a.bedrag, a.frequentie, a.ingangsdatum, a.einddatum,
                a.opmerkingen, a.aangemaakt_op, a.gewijzigd_op,

                -- Betaler fields
                betaler.id as betaler_id,
                betaler.voorletters as betaler_voorletters,
                betaler.voornamen as betaler_voornamen,
                betaler.roepnaam as betaler_roepnaam,
                betaler.geslacht as betaler_geslacht,
                betaler.tussenvoegsel as betaler_tussenvoegsel,
                betaler.achternaam as betaler_achternaam,
                betaler.adres as betaler_adres,
                betaler.postcode as betaler_postcode,
                betaler.plaats as betaler_plaats,
                betaler.geboorteplaats as betaler_geboorteplaats,
                betaler.geboorte_datum as betaler_geboorte_datum,
                betaler.nationaliteit_1 as betaler_nationaliteit_1,
                betaler.nationaliteit_2 as betaler_nationaliteit_2,
                betaler.telefoon as betaler_telefoon,
                betaler.email as betaler_email,
                betaler.beroep as betaler_beroep,

                -- Ontvanger fields
                ontvanger.id as ontvanger_id,
                ontvanger.voorletters as ontvanger_voorletters,
                ontvanger.voornamen as ontvanger_voornamen,
                ontvanger.roepnaam as ontvanger_roepnaam,
                ontvanger.geslacht as ontvanger_geslacht,
                ontvanger.tussenvoegsel as ontvanger_tussenvoegsel,
                ontvanger.achternaam as ontvanger_achternaam,
                ontvanger.adres as ontvanger_adres,
                ontvanger.postcode as ontvanger_postcode,
                ontvanger.plaats as ontvanger_plaats,
                ontvanger.geboorteplaats as ontvanger_geboorteplaats,
                ontvanger.geboorte_datum as ontvanger_geboorte_datum,
                ontvanger.nationaliteit_1 as ontvanger_nationaliteit_1,
                ontvanger.nationaliteit_2 as ontvanger_nationaliteit_2,
                ontvanger.telefoon as ontvanger_telefoon,
                ontvanger.email as ontvanger_email,
                ontvanger.beroep as ontvanger_beroep
            FROM dbo.alimentaties a
            INNER JOIN dbo.personen betaler ON a.betaler_id = betaler.id
            INNER JOIN dbo.personen ontvanger ON a.ontvanger_id = ontvanger.id
            WHERE a.dossier_id = @dossierId
            ORDER BY a.ingangsdatum DESC, a.id DESC
        `;

        const records = await this.queryMany<any>(query, { dossierId });

        return records.map(record => ({
            alimentatie: DbMappers.toAlimentatie(record),
            betaler: this.mapBetaler(record),
            ontvanger: this.mapOntvanger(record)
        }));
    }

    /**
     * Get a single alimentatie record by ID with betaler/ontvanger details
     *
     * @param alimentatieId - The alimentatie ID
     * @returns Alimentatie with person details, or null if not found
     */
    async findById(alimentatieId: number): Promise<AlimentatieWithPersonen | null> {
        const query = `
            SELECT
                a.id, a.dossier_id, a.betaler_id, a.ontvanger_id,
                a.bedrag, a.frequentie, a.ingangsdatum, a.einddatum,
                a.opmerkingen, a.aangemaakt_op, a.gewijzigd_op,

                -- Betaler fields
                betaler.id as betaler_id,
                betaler.voorletters as betaler_voorletters,
                betaler.voornamen as betaler_voornamen,
                betaler.roepnaam as betaler_roepnaam,
                betaler.geslacht as betaler_geslacht,
                betaler.tussenvoegsel as betaler_tussenvoegsel,
                betaler.achternaam as betaler_achternaam,
                betaler.adres as betaler_adres,
                betaler.postcode as betaler_postcode,
                betaler.plaats as betaler_plaats,
                betaler.geboorteplaats as betaler_geboorteplaats,
                betaler.geboorte_datum as betaler_geboorte_datum,
                betaler.nationaliteit_1 as betaler_nationaliteit_1,
                betaler.nationaliteit_2 as betaler_nationaliteit_2,
                betaler.telefoon as betaler_telefoon,
                betaler.email as betaler_email,
                betaler.beroep as betaler_beroep,

                -- Ontvanger fields
                ontvanger.id as ontvanger_id,
                ontvanger.voorletters as ontvanger_voorletters,
                ontvanger.voornamen as ontvanger_voornamen,
                ontvanger.roepnaam as ontvanger_roepnaam,
                ontvanger.geslacht as ontvanger_geslacht,
                ontvanger.tussenvoegsel as ontvanger_tussenvoegsel,
                ontvanger.achternaam as ontvanger_achternaam,
                ontvanger.adres as ontvanger_adres,
                ontvanger.postcode as ontvanger_postcode,
                ontvanger.plaats as ontvanger_plaats,
                ontvanger.geboorteplaats as ontvanger_geboorteplaats,
                ontvanger.geboorte_datum as ontvanger_geboorte_datum,
                ontvanger.nationaliteit_1 as ontvanger_nationaliteit_1,
                ontvanger.nationaliteit_2 as ontvanger_nationaliteit_2,
                ontvanger.telefoon as ontvanger_telefoon,
                ontvanger.email as ontvanger_email,
                ontvanger.beroep as ontvanger_beroep
            FROM dbo.alimentaties a
            INNER JOIN dbo.personen betaler ON a.betaler_id = betaler.id
            INNER JOIN dbo.personen ontvanger ON a.ontvanger_id = ontvanger.id
            WHERE a.id = @alimentatieId
        `;

        const record = await this.querySingle<any>(query, { alimentatieId });

        if (!record) {
            return null;
        }

        return {
            alimentatie: DbMappers.toAlimentatie(record),
            betaler: this.mapBetaler(record),
            ontvanger: this.mapOntvanger(record)
        };
    }

    /**
     * Create new alimentatie record
     *
     * @param data - Alimentatie data
     * @returns Created alimentatie record
     */
    async create(data: CreateAlimentatieDto): Promise<Alimentatie> {
        const query = `
            INSERT INTO dbo.alimentaties (
                dossier_id, betaler_id, ontvanger_id, bedrag, frequentie,
                ingangsdatum, einddatum, opmerkingen
            )
            OUTPUT INSERTED.*
            VALUES (
                @dossierId, @betalerId, @ontvangerId, @bedrag, @frequentie,
                @ingangsdatum, @einddatum, @opmerkingen
            )
        `;

        const result = await this.executeQuery<any>(query, {
            dossierId: data.dossierId,
            betalerId: data.betalerId,
            ontvangerId: data.ontvangerId,
            bedrag: data.bedrag,
            frequentie: data.frequentie,
            ingangsdatum: data.ingangsdatum,
            einddatum: data.einddatum || null,
            opmerkingen: data.opmerkingen || null
        });

        const record = result.recordset[0];
        if (!record) {
            throw new Error('Failed to create alimentatie: No record returned');
        }

        return DbMappers.toAlimentatie(record);
    }

    /**
     * Update existing alimentatie record
     *
     * @param alimentatieId - The alimentatie ID
     * @param data - Updated alimentatie data
     * @returns Updated alimentatie record
     */
    async update(alimentatieId: number, data: UpdateAlimentatieDto): Promise<Alimentatie> {
        // Build dynamic UPDATE query based on provided fields
        const updates: string[] = [];
        const params: Record<string, any> = { alimentatieId };

        if (data.bedrag !== undefined) {
            updates.push('bedrag = @bedrag');
            params.bedrag = data.bedrag;
        }
        if (data.frequentie !== undefined) {
            updates.push('frequentie = @frequentie');
            params.frequentie = data.frequentie;
        }
        if (data.ingangsdatum !== undefined) {
            updates.push('ingangsdatum = @ingangsdatum');
            params.ingangsdatum = data.ingangsdatum;
        }
        if (data.einddatum !== undefined) {
            updates.push('einddatum = @einddatum');
            params.einddatum = data.einddatum;
        }
        if (data.opmerkingen !== undefined) {
            updates.push('opmerkingen = @opmerkingen');
            params.opmerkingen = data.opmerkingen;
        }

        if (updates.length === 0) {
            throw new Error('No fields to update');
        }

        // Always update gewijzigd_op
        updates.push('gewijzigd_op = GETDATE()');

        const query = `
            UPDATE dbo.alimentaties
            SET ${updates.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @alimentatieId
        `;

        const result = await this.executeQuery<any>(query, params);

        const record = result.recordset[0];
        if (!record) {
            throw new Error('Alimentatie not found or update failed');
        }

        return DbMappers.toAlimentatie(record);
    }

    /**
     * Delete alimentatie record
     *
     * @param alimentatieId - The alimentatie ID
     * @returns True if deleted, false if not found
     */
    async delete(alimentatieId: number): Promise<boolean> {
        const query = `
            DELETE FROM dbo.alimentaties
            WHERE id = @alimentatieId
        `;

        const result = await this.executeQuery(query, { alimentatieId });
        return (result.rowsAffected[0] || 0) > 0;
    }

    /**
     * Check if alimentatie exists
     *
     * @param alimentatieId - The alimentatie ID
     * @returns True if exists, false otherwise
     */
    async alimentatieExists(alimentatieId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.alimentaties
            WHERE id = @alimentatieId
        `;

        const result = await this.querySingle<{ count: number }>(query, { alimentatieId });
        return result ? result.count > 0 : false;
    }

    /**
     * Count alimentatie records in a dossier
     *
     * @param dossierId - The dossier ID
     * @returns Number of alimentatie records
     */
    async count(dossierId: number): Promise<number> {
        const query = `
            SELECT COUNT(*) as total
            FROM dbo.alimentaties
            WHERE dossier_id = @dossierId
        `;

        const result = await this.querySingle<{ total: number }>(query, { dossierId });
        return result?.total || 0;
    }

    /**
     * Validate that betaler is a partij in the dossier
     *
     * @param dossierId - The dossier ID
     * @param betalerId - The betaler persoon ID
     * @returns True if betaler is partij in dossier
     */
    async validateBetaler(dossierId: number, betalerId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossiers_partijen
            WHERE dossier_id = @dossierId AND persoon_id = @betalerId
        `;

        const result = await this.querySingle<{ count: number }>(query, { dossierId, betalerId });
        return result ? result.count > 0 : false;
    }

    /**
     * Validate that ontvanger is a partij in the dossier
     *
     * @param dossierId - The dossier ID
     * @param ontvangerId - The ontvanger persoon ID
     * @returns True if ontvanger is partij in dossier
     */
    async validateOntvanger(dossierId: number, ontvangerId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossiers_partijen
            WHERE dossier_id = @dossierId AND persoon_id = @ontvangerId
        `;

        const result = await this.querySingle<{ count: number }>(query, { dossierId, ontvangerId });
        return result ? result.count > 0 : false;
    }

    /**
     * Helper method to map betaler fields from database record
     *
     * @param record - Database record with betaler_ prefixed fields
     * @returns Persoon object for betaler
     */
    private mapBetaler(record: any): Persoon {
        return {
            id: record.betaler_id,
            voorletters: record.betaler_voorletters,
            voornamen: record.betaler_voornamen,
            roepnaam: record.betaler_roepnaam,
            geslacht: record.betaler_geslacht,
            tussenvoegsel: record.betaler_tussenvoegsel,
            achternaam: record.betaler_achternaam,
            adres: record.betaler_adres,
            postcode: record.betaler_postcode,
            plaats: record.betaler_plaats,
            geboorteplaats: record.betaler_geboorteplaats,
            geboorteDatum: record.betaler_geboorte_datum ? new Date(record.betaler_geboorte_datum) : undefined,
            nationaliteit1: record.betaler_nationaliteit_1,
            nationaliteit2: record.betaler_nationaliteit_2,
            telefoon: record.betaler_telefoon,
            email: record.betaler_email,
            beroep: record.betaler_beroep
        };
    }

    /**
     * Helper method to map ontvanger fields from database record
     *
     * @param record - Database record with ontvanger_ prefixed fields
     * @returns Persoon object for ontvanger
     */
    private mapOntvanger(record: any): Persoon {
        return {
            id: record.ontvanger_id,
            voorletters: record.ontvanger_voorletters,
            voornamen: record.ontvanger_voornamen,
            roepnaam: record.ontvanger_roepnaam,
            geslacht: record.ontvanger_geslacht,
            tussenvoegsel: record.ontvanger_tussenvoegsel,
            achternaam: record.ontvanger_achternaam,
            adres: record.ontvanger_adres,
            postcode: record.ontvanger_postcode,
            plaats: record.ontvanger_plaats,
            geboorteplaats: record.ontvanger_geboorteplaats,
            geboorteDatum: record.ontvanger_geboorte_datum ? new Date(record.ontvanger_geboorte_datum) : undefined,
            nationaliteit1: record.ontvanger_nationaliteit_1,
            nationaliteit2: record.ontvanger_nationaliteit_2,
            telefoon: record.ontvanger_telefoon,
            email: record.ontvanger_email,
            beroep: record.ontvanger_beroep
        };
    }
}

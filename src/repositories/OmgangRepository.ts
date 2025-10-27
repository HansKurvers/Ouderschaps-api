import { BaseRepository } from './base/BaseRepository';
import {
    IOmgangRepository
} from './interfaces/IOmgangRepository';
import {
    Omgang,
    OmgangWithLookups,
    OmgangSchedule,
    Dag,
    Dagdeel,
    WeekRegeling,
    Persoon,
    CreateOmgangDto,
    UpdateOmgangDto
} from '../models/Dossier';
import { DbMappers } from '../utils/db-mappers';

/**
 * Repository for managing omgang (visitation/contact schedule) records
 *
 * Implements CRUD operations for omgang with multiple lookup table relationships.
 * Each omgang record represents a time slot in a weekly schedule, specifying:
 * - Which day (Maandag-Zondag)
 * - Which part of day (Ochtend, Middag, Avond, Nacht)
 * - Which caregiver (verzorger) has the child
 * - When the exchange happens (wisselTijd)
 * - Which week pattern applies (Elke week, Even weken, etc.)
 *
 * Database Schema:
 * - dbo.omgang: Main table with omgang records
 * - dbo.dagen: Lookup table for days of week (1-7)
 * - dbo.dagdelen: Lookup table for parts of day (1-4)
 * - dbo.week_regelingen: Lookup table for week patterns
 * - dbo.personen: Referenced for verzorger
 * - dbo.dossiers_partijen: Junction table for verzorger validation
 *
 * Business Rules:
 * - Verzorger must be a partij in the dossier
 * - No overlapping schedules (same dag + dagdeel + week_regeling)
 * - Multi-tenant: users can only access omgang from their own dossiers
 */
export class OmgangRepository extends BaseRepository implements IOmgangRepository {
    /**
     * Find all omgang records for a specific dossier
     * Returns omgang with joined dag, dagdeel, verzorger, and week_regeling lookup data
     * Ordered by dag.id ASC, dagdeel.id ASC (logical day/time order)
     */
    async findByDossierId(dossierId: number): Promise<OmgangWithLookups[]> {
        const query = `
            SELECT
                o.id,
                o.dossier_id,
                o.dag_id,
                o.dagdeel_id,
                o.verzorger_id,
                o.wissel_tijd,
                o.week_regeling_id,
                o.week_regeling_anders,
                o.aangemaakt_op,
                o.gewijzigd_op,
                -- Dag fields
                d.id as dag_id,
                d.naam as dag_naam,
                -- Dagdeel fields
                dd.id as dagdeel_id,
                dd.naam as dagdeel_naam,
                -- Verzorger (Persoon) fields
                p.voorletters as verzorger_voorletters,
                p.voornamen as verzorger_voornamen,
                p.roepnaam as verzorger_roepnaam,
                p.geslacht as verzorger_geslacht,
                p.tussenvoegsel as verzorger_tussenvoegsel,
                p.achternaam as verzorger_achternaam,
                p.adres as verzorger_adres,
                p.postcode as verzorger_postcode,
                p.plaats as verzorger_plaats,
                p.geboorteplaats as verzorger_geboorteplaats,
                p.geboorte_datum as verzorger_geboorte_datum,
                p.nationaliteit_1 as verzorger_nationaliteit_1,
                p.nationaliteit_2 as verzorger_nationaliteit_2,
                p.telefoon as verzorger_telefoon,
                p.email as verzorger_email,
                p.beroep as verzorger_beroep,
                p.rol_id as verzorger_rol_id,
                -- Week Regeling fields
                wr.id as week_regeling_id,
                wr.omschrijving as week_regeling_omschrijving
            FROM dbo.omgang o
            INNER JOIN dbo.dagen d ON o.dag_id = d.id
            INNER JOIN dbo.dagdelen dd ON o.dagdeel_id = dd.id
            INNER JOIN dbo.personen p ON o.verzorger_id = p.id
            INNER JOIN dbo.week_regelingen wr ON o.week_regeling_id = wr.id
            WHERE o.dossier_id = @dossierId
            ORDER BY d.id, dd.id
        `;

        const records = await this.queryMany<any>(query, { dossierId });
        return records.map(record => this.mapOmgangWithLookups(record));
    }

    /**
     * Find a specific omgang record by ID
     * Returns omgang with joined dag, dagdeel, verzorger, and week_regeling lookup data
     */
    async findById(omgangId: number): Promise<OmgangWithLookups | null> {
        const query = `
            SELECT
                o.id,
                o.dossier_id,
                o.dag_id,
                o.dagdeel_id,
                o.verzorger_id,
                o.wissel_tijd,
                o.week_regeling_id,
                o.week_regeling_anders,
                o.aangemaakt_op,
                o.gewijzigd_op,
                -- Dag fields
                d.id as dag_id,
                d.naam as dag_naam,
                -- Dagdeel fields
                dd.id as dagdeel_id,
                dd.naam as dagdeel_naam,
                -- Verzorger (Persoon) fields
                p.voorletters as verzorger_voorletters,
                p.voornamen as verzorger_voornamen,
                p.roepnaam as verzorger_roepnaam,
                p.geslacht as verzorger_geslacht,
                p.tussenvoegsel as verzorger_tussenvoegsel,
                p.achternaam as verzorger_achternaam,
                p.adres as verzorger_adres,
                p.postcode as verzorger_postcode,
                p.plaats as verzorger_plaats,
                p.geboorteplaats as verzorger_geboorteplaats,
                p.geboorte_datum as verzorger_geboorte_datum,
                p.nationaliteit_1 as verzorger_nationaliteit_1,
                p.nationaliteit_2 as verzorger_nationaliteit_2,
                p.telefoon as verzorger_telefoon,
                p.email as verzorger_email,
                p.beroep as verzorger_beroep,
                p.rol_id as verzorger_rol_id,
                -- Week Regeling fields
                wr.id as week_regeling_id,
                wr.omschrijving as week_regeling_omschrijving
            FROM dbo.omgang o
            INNER JOIN dbo.dagen d ON o.dag_id = d.id
            INNER JOIN dbo.dagdelen dd ON o.dagdeel_id = dd.id
            INNER JOIN dbo.personen p ON o.verzorger_id = p.id
            INNER JOIN dbo.week_regelingen wr ON o.week_regeling_id = wr.id
            WHERE o.id = @omgangId
        `;

        const record = await this.querySingle<any>(query, { omgangId });
        return record ? this.mapOmgangWithLookups(record) : null;
    }

    /**
     * Get a structured schedule view for a dossier
     * Transforms flat omgang records into nested structure: dag → dagdeel → details
     */
    async getSchedule(dossierId: number): Promise<OmgangSchedule> {
        const omgangRecords = await this.findByDossierId(dossierId);

        const schedule: OmgangSchedule = {};

        for (const record of omgangRecords) {
            const dagNaam = record.dag.naam;
            const dagdeelNaam = record.dagdeel.naam;

            // Initialize dag if not exists
            if (!schedule[dagNaam]) {
                schedule[dagNaam] = {};
            }

            // Add dagdeel entry
            schedule[dagNaam][dagdeelNaam] = {
                verzorger: record.verzorger,
                wisselTijd: record.omgang.wisselTijd,
                weekRegeling: record.weekRegeling.omschrijving
            };
        }

        return schedule;
    }

    /**
     * Create a new omgang record
     * Sets aangemaakt_op and gewijzigd_op to current timestamp
     */
    async create(data: CreateOmgangDto): Promise<Omgang> {
        const query = `
            INSERT INTO dbo.omgang (
                dossier_id,
                dag_id,
                dagdeel_id,
                verzorger_id,
                wissel_tijd,
                week_regeling_id,
                week_regeling_anders
            )
            OUTPUT INSERTED.*
            VALUES (
                @dossierId,
                @dagId,
                @dagdeelId,
                @verzorgerId,
                @wisselTijd,
                @weekRegelingId,
                @weekRegelingAnders
            )
        `;

        const params = {
            dossierId: data.dossierId,
            dagId: data.dagId,
            dagdeelId: data.dagdeelId,
            verzorgerId: data.verzorgerId,
            wisselTijd: data.wisselTijd || null,
            weekRegelingId: data.weekRegelingId,
            weekRegelingAnders: data.weekRegelingAnders || null
        };

        const result = await this.executeQuery<any>(query, params);

        if (!result.recordset || result.recordset.length === 0) {
            throw new Error('Failed to create omgang record');
        }

        return DbMappers.toOmgang(result.recordset[0]);
    }

    /**
     * Update an existing omgang record
     * Only updates fields that are provided (partial update)
     * Sets gewijzigd_op to current timestamp
     */
    async update(omgangId: number, data: UpdateOmgangDto): Promise<Omgang> {
        // Build dynamic UPDATE query based on provided fields
        const updates: string[] = [];
        const params: Record<string, any> = { omgangId };

        if (data.dagId !== undefined) {
            updates.push('dag_id = @dagId');
            params.dagId = data.dagId;
        }

        if (data.dagdeelId !== undefined) {
            updates.push('dagdeel_id = @dagdeelId');
            params.dagdeelId = data.dagdeelId;
        }

        if (data.verzorgerId !== undefined) {
            updates.push('verzorger_id = @verzorgerId');
            params.verzorgerId = data.verzorgerId;
        }

        if (data.wisselTijd !== undefined) {
            updates.push('wissel_tijd = @wisselTijd');
            params.wisselTijd = data.wisselTijd;
        }

        if (data.weekRegelingId !== undefined) {
            updates.push('week_regeling_id = @weekRegelingId');
            params.weekRegelingId = data.weekRegelingId;
        }

        if (data.weekRegelingAnders !== undefined) {
            updates.push('week_regeling_anders = @weekRegelingAnders');
            params.weekRegelingAnders = data.weekRegelingAnders;
        }

        // Always update gewijzigd_op
        updates.push('gewijzigd_op = GETDATE()');

        if (updates.length === 1) {
            // Only gewijzigd_op would be updated
            throw new Error('No fields provided for update');
        }

        const query = `
            UPDATE dbo.omgang
            SET ${updates.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @omgangId
        `;

        const result = await this.executeQuery<any>(query, params);

        if (!result.recordset || result.recordset.length === 0) {
            throw new Error(`Omgang with ID ${omgangId} not found`);
        }

        return DbMappers.toOmgang(result.recordset[0]);
    }

    /**
     * Delete an omgang record
     * Performs hard delete from database
     */
    async delete(omgangId: number): Promise<boolean> {
        const query = `
            DELETE FROM dbo.omgang
            WHERE id = @omgangId
        `;

        const result = await this.executeQuery(query, { omgangId });
        return result.rowsAffected && result.rowsAffected[0] > 0;
    }

    /**
     * Check if an omgang record exists
     */
    async omgangExists(omgangId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.omgang
            WHERE id = @omgangId
        `;

        const result = await this.querySingle<{ count: number }>(query, { omgangId });
        return result ? result.count > 0 : false;
    }

    /**
     * Count the number of omgang records in a dossier
     */
    async count(dossierId: number): Promise<number> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.omgang
            WHERE dossier_id = @dossierId
        `;

        const result = await this.querySingle<{ count: number }>(query, { dossierId });
        return result ? result.count : 0;
    }

    /**
     * Validate that a verzorger (person) is a partij in the dossier
     * Checks dbo.dossiers_partijen junction table
     */
    async validateVerzorger(dossierId: number, verzorgerId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossiers_partijen
            WHERE dossier_id = @dossierId
              AND persoon_id = @verzorgerId
        `;

        const result = await this.querySingle<{ count: number }>(
            query,
            { dossierId, verzorgerId }
        );
        return result ? result.count > 0 : false;
    }

    /**
     * Check for schedule overlap
     * Detects if another omgang exists with same dag + dagdeel + week_regeling
     * This prevents double-booking of time slots
     */
    async checkOverlap(
        dossierId: number,
        dagId: number,
        dagdeelId: number,
        weekRegelingId: number,
        excludeOmgangId?: number
    ): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.omgang
            WHERE dossier_id = @dossierId
              AND dag_id = @dagId
              AND dagdeel_id = @dagdeelId
              AND week_regeling_id = @weekRegelingId
              AND (@excludeOmgangId IS NULL OR id != @excludeOmgangId)
        `;

        const params = {
            dossierId,
            dagId,
            dagdeelId,
            weekRegelingId,
            excludeOmgangId: excludeOmgangId || null
        };

        const result = await this.querySingle<{ count: number }>(query, params);
        return result ? result.count > 0 : false;
    }

    /**
     * Get all available dagen (days of week) for dropdown/select lists
     * Returns 7 days: Maandag through Zondag
     * Ordered by id (Monday = 1, Sunday = 7)
     */
    async getAllDagen(): Promise<Dag[]> {
        const query = `
            SELECT id, naam
            FROM dbo.dagen
            ORDER BY id
        `;

        const records = await this.queryMany<any>(query);
        return records.map(record => DbMappers.toDag(record));
    }

    /**
     * Get all available dagdelen (parts of day) for dropdown/select lists
     * Returns 4 parts: Ochtend, Middag, Avond, Nacht
     * Ordered by id
     */
    async getAllDagdelen(): Promise<Dagdeel[]> {
        const query = `
            SELECT id, naam
            FROM dbo.dagdelen
            ORDER BY id
        `;

        const records = await this.queryMany<any>(query);
        return records.map(record => DbMappers.toDagdeel(record));
    }

    /**
     * Get all available week regelingen (week patterns) for dropdown/select lists
     * Examples: "Elke week", "Even weken", "Oneven weken", etc.
     * Ordered by id
     */
    async getAllWeekRegelingen(): Promise<WeekRegeling[]> {
        const query = `
            SELECT id, omschrijving
            FROM dbo.week_regelingen
            ORDER BY id
        `;

        const records = await this.queryMany<any>(query);
        return records.map(record => DbMappers.toWeekRegeling(record));
    }

    /**
     * Helper method to map database row to OmgangWithLookups
     * Extracts omgang data and prefixed dag/dagdeel/verzorger/week_regeling fields
     */
    private mapOmgangWithLookups(record: any): OmgangWithLookups {
        return {
            omgang: DbMappers.toOmgang(record),
            dag: this.mapDag(record),
            dagdeel: this.mapDagdeel(record),
            verzorger: this.mapVerzorger(record),
            weekRegeling: this.mapWeekRegeling(record),
            // Add flat ID fields for frontend compatibility
            dagId: record.dag_id,
            dagdeelId: record.dagdeel_id,
            verzorgerId: record.verzorger_id,
            weekRegelingId: record.week_regeling_id
        };
    }

    /**
     * Helper method to extract dag data from prefixed columns
     */
    private mapDag(record: any): Dag {
        return {
            id: record.dag_id,
            naam: record.dag_naam
        };
    }

    /**
     * Helper method to extract dagdeel data from prefixed columns
     */
    private mapDagdeel(record: any): Dagdeel {
        return {
            id: record.dagdeel_id,
            naam: record.dagdeel_naam
        };
    }

    /**
     * Helper method to extract verzorger (persoon) data from prefixed columns
     */
    private mapVerzorger(record: any): Persoon {
        return {
            id: record.verzorger_id,
            voorletters: record.verzorger_voorletters,
            voornamen: record.verzorger_voornamen,
            roepnaam: record.verzorger_roepnaam,
            geslacht: record.verzorger_geslacht,
            tussenvoegsel: record.verzorger_tussenvoegsel,
            achternaam: record.verzorger_achternaam,
            adres: record.verzorger_adres,
            postcode: record.verzorger_postcode,
            plaats: record.verzorger_plaats,
            geboorteplaats: record.verzorger_geboorteplaats,
            geboorteDatum: record.verzorger_geboorte_datum
                ? new Date(record.verzorger_geboorte_datum)
                : undefined,
            nationaliteit1: record.verzorger_nationaliteit_1,
            nationaliteit2: record.verzorger_nationaliteit_2,
            telefoon: record.verzorger_telefoon,
            email: record.verzorger_email,
            beroep: record.verzorger_beroep,
            rolId: record.verzorger_rol_id
        };
    }

    /**
     * Helper method to extract week_regeling data from prefixed columns
     */
    private mapWeekRegeling(record: any): WeekRegeling {
        return {
            id: record.week_regeling_id,
            omschrijving: record.week_regeling_omschrijving
        };
    }
}

import { BaseRepository } from './base/BaseRepository';
import { DbMappers } from '../utils/db-mappers';
import { Persoon, RelatieType } from '../models/Dossier';

/**
 * KindRepository
 *
 * Manages children in dossiers and their relationships with parents (ouders).
 *
 * Database Structure:
 * - dossiers_kinderen: Links kinderen (children) to dossiers
 * - kinderen_ouders: Links kinderen to their ouders (parents) with a relatie_type
 * - relatie_types: Lookup table for relationship types (e.g., "Biologische vader")
 *
 * Business Rules:
 * - A kind can be in multiple dossiers
 * - A kind can have multiple ouders (typically 2: vader & moeder)
 * - Each ouder-kind relation has a type (biologisch, sociaal, etc.)
 * - When removing a kind from dossier: only remove the link, NOT the person
 * - When removing a kind: should we also remove ouder links? (TODO: clarify)
 * - Multi-tenant: users can only access kinderen from their own dossiers
 */

export interface KindWithOuders {
    id: number;  // dossier_kind_id (from dossiers_kinderen.id)
    kind: Persoon;
    ouders: Array<{
        id: number; // kinderen_ouders.id
        ouder: Persoon;
        relatieType: RelatieType;
    }>;
}

export interface OuderRelatie {
    id: number; // kinderen_ouders.id
    ouder: Persoon;
    relatieType: RelatieType;
}

export class KindRepository extends BaseRepository {

    /**
     * Get all kinderen for a dossier, including their ouders
     *
     * @param dossierId - The dossier ID
     * @returns Array of kinderen with their ouders
     */
    async findByDossierId(dossierId: number): Promise<KindWithOuders[]> {
        // First get all kinderen for this dossier
        const kinderenQuery = `
            SELECT
                dk.id as dossier_kind_id,
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
                p.beroep
            FROM dbo.dossiers_kinderen dk
            INNER JOIN dbo.personen p ON dk.kind_id = p.id
            WHERE dk.dossier_id = @dossierId
            ORDER BY p.achternaam, p.voornamen
        `;

        const kinderenRecords = await this.queryMany<any>(kinderenQuery, { dossierId });

        // For each kind, get their ouders
        const result: KindWithOuders[] = [];

        for (const kindRecord of kinderenRecords) {
            const kind = DbMappers.toPersoon(kindRecord);
            const dossierKindId = kindRecord.dossier_kind_id;

            // Get ouders for this kind
            const ouders = await this.getOudersForKind(kind.id);

            result.push({
                id: dossierKindId,
                kind,
                ouders
            });
        }

        return result;
    }

    /**
     * Get a single kind with ouders by dossier_kind_id
     *
     * @param dossierId - The dossier ID
     * @param dossierKindId - The dossier_kind ID (dossiers_kinderen.id)
     * @returns Kind with ouders, or null if not found
     */
    async findById(dossierId: number, dossierKindId: number): Promise<KindWithOuders | null> {
        const query = `
            SELECT
                dk.id as dossier_kind_id,
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
                p.beroep
            FROM dbo.dossiers_kinderen dk
            INNER JOIN dbo.personen p ON dk.kind_id = p.id
            WHERE dk.dossier_id = @dossierId AND dk.id = @dossierKindId
        `;

        const record = await this.querySingle<any>(query, { dossierId, dossierKindId });

        if (!record) {
            return null;
        }

        const kind = DbMappers.toPersoon(record);
        const ouders = await this.getOudersForKind(kind.id);

        return {
            id: record.dossier_kind_id,
            kind,
            ouders
        };
    }

    /**
     * Add a kind to a dossier
     *
     * @param dossierId - The dossier ID
     * @param kindId - The kind (persoon) ID
     * @returns The dossier_kind_id (dossiers_kinderen.id)
     */
    async addToDossier(dossierId: number, kindId: number): Promise<number> {
        const query = `
            INSERT INTO dbo.dossiers_kinderen (dossier_id, kind_id)
            OUTPUT INSERTED.id
            VALUES (@dossierId, @kindId)
        `;

        const result = await this.executeQuery<any>(query, { dossierId, kindId });
        const insertedId = result.recordset[0]?.id;

        if (!insertedId) {
            throw new Error('Failed to add kind to dossier: No ID returned');
        }

        return insertedId;
    }

    /**
     * Remove a kind from a dossier
     * Note: This only removes the link, NOT the person or ouder relationships
     *
     * @param dossierId - The dossier ID
     * @param dossierKindId - The dossier_kind ID (dossiers_kinderen.id)
     * @returns True if deleted, false if not found
     */
    async removeFromDossier(dossierId: number, dossierKindId: number): Promise<boolean> {
        const query = `
            DELETE FROM dbo.dossiers_kinderen
            WHERE id = @dossierKindId AND dossier_id = @dossierId
        `;

        const result = await this.executeQuery(query, { dossierKindId, dossierId });
        return (result.rowsAffected[0] || 0) > 0;
    }

    /**
     * Link an ouder (parent) to a kind with a specific relatie_type
     *
     * @param kindId - The kind (persoon) ID
     * @param ouderId - The ouder (persoon) ID
     * @param relatieTypeId - The relatie_type ID
     * @returns The kinderen_ouders.id
     */
    async linkOuderToKind(kindId: number, ouderId: number, relatieTypeId: number): Promise<number> {
        const query = `
            INSERT INTO dbo.kinderen_ouders (kind_id, ouder_id, relatie_type_id)
            OUTPUT INSERTED.id
            VALUES (@kindId, @ouderId, @relatieTypeId)
        `;

        const result = await this.executeQuery<any>(query, { kindId, ouderId, relatieTypeId });
        const insertedId = result.recordset[0]?.id;

        if (!insertedId) {
            throw new Error('Failed to link ouder to kind: No ID returned');
        }

        return insertedId;
    }

    /**
     * Unlink an ouder from a kind
     *
     * @param kindId - The kind (persoon) ID
     * @param ouderId - The ouder (persoon) ID
     * @returns True if deleted, false if not found
     */
    async unlinkOuderFromKind(kindId: number, ouderId: number): Promise<boolean> {
        const query = `
            DELETE FROM dbo.kinderen_ouders
            WHERE kind_id = @kindId AND ouder_id = @ouderId
        `;

        const result = await this.executeQuery(query, { kindId, ouderId });
        return (result.rowsAffected[0] || 0) > 0;
    }

    /**
     * Update the relatie_type for an ouder-kind relationship
     *
     * @param kindId - The kind (persoon) ID
     * @param ouderId - The ouder (persoon) ID
     * @param relatieTypeId - The new relatie_type ID
     * @returns True if updated, false if not found
     */
    async updateOuderRelatie(kindId: number, ouderId: number, relatieTypeId: number): Promise<boolean> {
        const query = `
            UPDATE dbo.kinderen_ouders
            SET relatie_type_id = @relatieTypeId
            WHERE kind_id = @kindId AND ouder_id = @ouderId
        `;

        const result = await this.executeQuery(query, { kindId, ouderId, relatieTypeId });
        return (result.rowsAffected[0] || 0) > 0;
    }

    /**
     * Get all ouders for a specific kind
     *
     * @param kindId - The kind (persoon) ID
     * @returns Array of ouders with their relatie_type
     */
    async getOudersForKind(kindId: number): Promise<OuderRelatie[]> {
        const query = `
            SELECT
                ko.id as kinderen_ouders_id,
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
                rt.id as relatie_type_id,
                rt.naam as relatie_type_naam
            FROM dbo.kinderen_ouders ko
            INNER JOIN dbo.personen p ON ko.ouder_id = p.id
            INNER JOIN dbo.relatie_types rt ON ko.relatie_type_id = rt.id
            WHERE ko.kind_id = @kindId
            ORDER BY rt.id
        `;

        const records = await this.queryMany<any>(query, { kindId });

        return records.map(record => ({
            id: record.kinderen_ouders_id,
            ouder: DbMappers.toPersoon(record),
            relatieType: {
                id: record.relatie_type_id,
                naam: record.relatie_type_naam
            }
        }));
    }

    /**
     * Check if a kind is in a dossier
     *
     * @param dossierId - The dossier ID
     * @param kindId - The kind (persoon) ID
     * @returns True if kind is in dossier
     */
    async isKindInDossier(dossierId: number, kindId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossiers_kinderen
            WHERE dossier_id = @dossierId AND kind_id = @kindId
        `;

        const result = await this.querySingle<{ count: number }>(query, { dossierId, kindId });
        return result ? result.count > 0 : false;
    }

    /**
     * Check if an ouder is linked to a kind
     *
     * @param kindId - The kind (persoon) ID
     * @param ouderId - The ouder (persoon) ID
     * @returns True if ouder is linked to kind
     */
    async isOuderLinkedToKind(kindId: number, ouderId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.kinderen_ouders
            WHERE kind_id = @kindId AND ouder_id = @ouderId
        `;

        const result = await this.querySingle<{ count: number }>(query, { kindId, ouderId });
        return result ? result.count > 0 : false;
    }

    /**
     * Get all dossier IDs where a kind appears
     * Useful for validation (e.g., check if kind can be deleted)
     *
     * @param kindId - The kind (persoon) ID
     * @returns Array of dossier IDs
     */
    async findDossiersByKindId(kindId: number): Promise<number[]> {
        const query = `
            SELECT DISTINCT dossier_id
            FROM dbo.dossiers_kinderen
            WHERE kind_id = @kindId
            ORDER BY dossier_id
        `;

        const records = await this.queryMany<{ dossier_id: number }>(query, { kindId });
        return records.map(r => r.dossier_id);
    }

    /**
     * Count kinderen in a dossier
     *
     * @param dossierId - The dossier ID
     * @returns Number of kinderen in the dossier
     */
    async countKinderenInDossier(dossierId: number): Promise<number> {
        const query = `
            SELECT COUNT(*) as total
            FROM dbo.dossiers_kinderen
            WHERE dossier_id = @dossierId
        `;

        const result = await this.querySingle<{ total: number }>(query, { dossierId });
        return result?.total || 0;
    }
}

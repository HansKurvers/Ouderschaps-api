import { BaseRepository } from './base/BaseRepository';
import {
    DossierDocument,
    DossierDocumentWithCategorie,
    CreateDossierDocumentDto
} from '../models/Dossier';
import { DbMappers } from '../utils/db-mappers';

/**
 * Repository for DossierDocument entity operations
 *
 * Responsibilities:
 * - Document CRUD operations with dossier-level access control
 * - Soft delete support
 * - Upload tracking (by user or guest)
 * - Retrieval with category information
 *
 * SECURITY: All methods that return documents should be used in conjunction
 * with dossier access checks. This repository does NOT verify dossier access.
 *
 * @example
 * ```typescript
 * const repo = new DossierDocumentRepository();
 *
 * // First verify dossier access
 * const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
 * if (!hasAccess) throw new Error('Access denied');
 *
 * // Then use this repository
 * const documents = await repo.findByDossierId(dossierId);
 * ```
 */
export class DossierDocumentRepository extends BaseRepository {
    /**
     * Finds all documents for a dossier (excluding soft-deleted)
     *
     * @param dossierId - The dossier ID
     * @returns Array of documents ordered by creation date
     */
    async findByDossierId(dossierId: number): Promise<DossierDocument[]> {
        const query = `
            SELECT
                id,
                dossier_id,
                categorie_id,
                blob_container,
                blob_path,
                originele_bestandsnaam,
                opgeslagen_bestandsnaam,
                bestandsgrootte,
                mime_type,
                geupload_door_gebruiker_id,
                geupload_door_gast_id,
                upload_ip,
                aangemaakt_op,
                verwijderd_op
            FROM dbo.dossier_documenten
            WHERE dossier_id = @dossierId
                AND verwijderd_op IS NULL
            ORDER BY aangemaakt_op DESC
        `;

        const records = await this.queryMany(query, { dossierId });
        return records.map(DbMappers.toDossierDocument);
    }

    /**
     * Finds all documents for a dossier with category information
     *
     * @param dossierId - The dossier ID
     * @returns Array of documents with category info
     */
    async findByDossierIdWithCategorie(dossierId: number): Promise<DossierDocumentWithCategorie[]> {
        const query = `
            SELECT
                d.id,
                d.dossier_id,
                d.categorie_id,
                d.blob_container,
                d.blob_path,
                d.originele_bestandsnaam,
                d.opgeslagen_bestandsnaam,
                d.bestandsgrootte,
                d.mime_type,
                d.geupload_door_gebruiker_id,
                d.geupload_door_gast_id,
                d.upload_ip,
                d.aangemaakt_op,
                d.verwijderd_op,
                c.id AS cat_id,
                c.naam AS cat_naam,
                c.beschrijving AS cat_beschrijving,
                c.icoon AS cat_icoon,
                c.toegestane_extensies AS cat_toegestane_extensies,
                c.max_bestandsgrootte_mb AS cat_max_bestandsgrootte_mb,
                c.volgorde AS cat_volgorde,
                c.actief AS cat_actief,
                c.aangemaakt_op AS cat_aangemaakt_op,
                COALESCE(g.naam, gast.naam, gast.email) AS uploader_naam
            FROM dbo.dossier_documenten d
            INNER JOIN dbo.document_categorieen c ON d.categorie_id = c.id
            LEFT JOIN dbo.gebruikers g ON d.geupload_door_gebruiker_id = g.id
            LEFT JOIN dbo.dossier_gasten gast ON d.geupload_door_gast_id = gast.id
            WHERE d.dossier_id = @dossierId
                AND d.verwijderd_op IS NULL
            ORDER BY c.volgorde ASC, d.aangemaakt_op DESC
        `;

        const records = await this.queryMany(query, { dossierId });
        return records.map(row => ({
            document: DbMappers.toDossierDocument({
                id: row.id,
                dossier_id: row.dossier_id,
                categorie_id: row.categorie_id,
                blob_container: row.blob_container,
                blob_path: row.blob_path,
                originele_bestandsnaam: row.originele_bestandsnaam,
                opgeslagen_bestandsnaam: row.opgeslagen_bestandsnaam,
                bestandsgrootte: row.bestandsgrootte,
                mime_type: row.mime_type,
                geupload_door_gebruiker_id: row.geupload_door_gebruiker_id,
                geupload_door_gast_id: row.geupload_door_gast_id,
                upload_ip: row.upload_ip,
                aangemaakt_op: row.aangemaakt_op,
                verwijderd_op: row.verwijderd_op,
            }),
            categorie: DbMappers.toDocumentCategorie({
                id: row.cat_id,
                naam: row.cat_naam,
                beschrijving: row.cat_beschrijving,
                icoon: row.cat_icoon,
                toegestane_extensies: row.cat_toegestane_extensies,
                max_bestandsgrootte_mb: row.cat_max_bestandsgrootte_mb,
                volgorde: row.cat_volgorde,
                actief: row.cat_actief,
                aangemaakt_op: row.cat_aangemaakt_op,
            }),
            uploaderNaam: row.uploader_naam || undefined,
            uploaderType: row.geupload_door_gebruiker_id ? 'gebruiker' : 'gast',
        }));
    }

    /**
     * Finds a document by ID
     *
     * @param documentId - The document ID
     * @returns Document or null if not found (or soft-deleted)
     */
    async findById(documentId: number): Promise<DossierDocument | null> {
        const query = `
            SELECT
                id,
                dossier_id,
                categorie_id,
                blob_container,
                blob_path,
                originele_bestandsnaam,
                opgeslagen_bestandsnaam,
                bestandsgrootte,
                mime_type,
                geupload_door_gebruiker_id,
                geupload_door_gast_id,
                upload_ip,
                aangemaakt_op,
                verwijderd_op
            FROM dbo.dossier_documenten
            WHERE id = @documentId
                AND verwijderd_op IS NULL
        `;

        const record = await this.querySingle(query, { documentId });
        return record ? DbMappers.toDossierDocument(record) : null;
    }

    /**
     * Finds a document by ID including soft-deleted (for admin purposes)
     *
     * @param documentId - The document ID
     * @returns Document or null if not found
     */
    async findByIdIncludeDeleted(documentId: number): Promise<DossierDocument | null> {
        const query = `
            SELECT
                id,
                dossier_id,
                categorie_id,
                blob_container,
                blob_path,
                originele_bestandsnaam,
                opgeslagen_bestandsnaam,
                bestandsgrootte,
                mime_type,
                geupload_door_gebruiker_id,
                geupload_door_gast_id,
                upload_ip,
                aangemaakt_op,
                verwijderd_op
            FROM dbo.dossier_documenten
            WHERE id = @documentId
        `;

        const record = await this.querySingle(query, { documentId });
        return record ? DbMappers.toDossierDocument(record) : null;
    }

    /**
     * Creates a new document record (after file is uploaded to blob storage)
     *
     * @param data - Document creation data
     * @param uploadedByUserId - User ID if uploaded by authenticated user
     * @param uploadedByGastId - Guest ID if uploaded by guest
     * @returns Created document
     */
    async create(
        data: CreateDossierDocumentDto,
        uploadedByUserId?: number,
        uploadedByGastId?: number
    ): Promise<DossierDocument> {
        if (!uploadedByUserId && !uploadedByGastId) {
            throw new Error('Either uploadedByUserId or uploadedByGastId must be provided');
        }
        if (uploadedByUserId && uploadedByGastId) {
            throw new Error('Cannot have both uploadedByUserId and uploadedByGastId');
        }

        const query = `
            INSERT INTO dbo.dossier_documenten (
                dossier_id,
                categorie_id,
                blob_container,
                blob_path,
                originele_bestandsnaam,
                opgeslagen_bestandsnaam,
                bestandsgrootte,
                mime_type,
                geupload_door_gebruiker_id,
                geupload_door_gast_id,
                upload_ip
            )
            OUTPUT INSERTED.*
            VALUES (
                @dossierId,
                @categorieId,
                @blobContainer,
                @blobPath,
                @origineleBestandsnaam,
                @opgeslagenBestandsnaam,
                @bestandsgrootte,
                @mimeType,
                @geuploadDoorGebruikerId,
                @geuploadDoorGastId,
                @uploadIp
            )
        `;

        const record = await this.querySingle(query, {
            dossierId: data.dossierId,
            categorieId: data.categorieId,
            blobContainer: data.blobContainer,
            blobPath: data.blobPath,
            origineleBestandsnaam: data.origineleBestandsnaam,
            opgeslagenBestandsnaam: data.opgeslagenBestandsnaam,
            bestandsgrootte: data.bestandsgrootte,
            mimeType: data.mimeType,
            geuploadDoorGebruikerId: uploadedByUserId || null,
            geuploadDoorGastId: uploadedByGastId || null,
            uploadIp: data.uploadIp || null,
        });

        if (!record) {
            throw new Error('Failed to create document record');
        }

        return DbMappers.toDossierDocument(record);
    }

    /**
     * Soft deletes a document
     *
     * @param documentId - The document ID to delete
     * @returns True if document was deleted
     */
    async softDelete(documentId: number): Promise<boolean> {
        const query = `
            UPDATE dbo.dossier_documenten
            SET verwijderd_op = GETDATE()
            WHERE id = @documentId
                AND verwijderd_op IS NULL
        `;

        const result = await this.executeQuery(query, { documentId });
        return result.rowsAffected[0] > 0;
    }

    /**
     * Permanently deletes a document record (use with caution)
     *
     * @param documentId - The document ID to delete
     * @returns True if document was deleted
     */
    async hardDelete(documentId: number): Promise<boolean> {
        const query = `
            DELETE FROM dbo.dossier_documenten
            WHERE id = @documentId
        `;

        const result = await this.executeQuery(query, { documentId });
        return result.rowsAffected[0] > 0;
    }

    /**
     * Gets document count by category for a dossier
     *
     * @param dossierId - The dossier ID
     * @returns Map of category ID to document count
     */
    async getCountByCategory(dossierId: number): Promise<Map<number, number>> {
        const query = `
            SELECT
                categorie_id,
                COUNT(*) as count
            FROM dbo.dossier_documenten
            WHERE dossier_id = @dossierId
                AND verwijderd_op IS NULL
            GROUP BY categorie_id
        `;

        const records = await this.queryMany<{ categorie_id: number; count: number }>(query, { dossierId });
        const countMap = new Map<number, number>();
        records.forEach(record => {
            countMap.set(record.categorie_id, record.count);
        });
        return countMap;
    }

    /**
     * Checks if a document belongs to a specific dossier
     *
     * @param documentId - The document ID
     * @param dossierId - The dossier ID
     * @returns True if document belongs to the dossier
     */
    async belongsToDossier(documentId: number, dossierId: number): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count
            FROM dbo.dossier_documenten
            WHERE id = @documentId
                AND dossier_id = @dossierId
                AND verwijderd_op IS NULL
        `;

        return await this.exists(query, { documentId, dossierId });
    }

    /**
     * Gets the total storage used by a dossier in bytes
     *
     * @param dossierId - The dossier ID
     * @returns Total size in bytes
     */
    async getTotalSizeByDossier(dossierId: number): Promise<number> {
        const query = `
            SELECT COALESCE(SUM(bestandsgrootte), 0) as total_size
            FROM dbo.dossier_documenten
            WHERE dossier_id = @dossierId
                AND verwijderd_op IS NULL
        `;

        const result = await this.querySingle<{ total_size: number }>(query, { dossierId });
        return result?.total_size || 0;
    }
}

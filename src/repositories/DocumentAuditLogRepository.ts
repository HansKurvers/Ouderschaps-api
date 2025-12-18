import { BaseRepository } from './base/BaseRepository';
import {
    DocumentAuditLog,
    CreateDocumentAuditLogDto
} from '../models/Dossier';
import { DbMappers } from '../utils/db-mappers';

/**
 * Repository for DocumentAuditLog entity operations
 *
 * Responsibilities:
 * - Security audit trail for all document operations
 * - Access logging (both successful and denied)
 * - Guest activity tracking
 * - Compliance and forensic analysis support
 *
 * IMPORTANT: This repository is append-only. Audit logs should NEVER be
 * modified or deleted to maintain integrity for security analysis.
 *
 * @example
 * ```typescript
 * const repo = new DocumentAuditLogRepository();
 *
 * // Log a document upload
 * await repo.log({
 *     dossierId: 123,
 *     documentId: 456,
 *     gebruikerId: 1,
 *     actie: 'upload',
 *     ipAdres: '192.168.1.1',
 *     details: { filename: 'document.pdf' }
 * });
 *
 * // Log an access denied attempt
 * await repo.log({
 *     dossierId: 123,
 *     actie: 'access_denied',
 *     ipAdres: '192.168.1.100',
 *     details: { reason: 'Invalid token' }
 * });
 * ```
 */
export class DocumentAuditLogRepository extends BaseRepository {
    /**
     * Logs an audit event
     *
     * @param data - Audit log entry data
     * @returns Created audit log entry
     */
    async log(data: CreateDocumentAuditLogDto): Promise<DocumentAuditLog> {
        const query = `
            INSERT INTO dbo.document_audit_log (
                dossier_id,
                document_id,
                gebruiker_id,
                gast_id,
                ip_adres,
                user_agent,
                actie,
                details
            )
            OUTPUT INSERTED.*
            VALUES (
                @dossierId,
                @documentId,
                @gebruikerId,
                @gastId,
                @ipAdres,
                @userAgent,
                @actie,
                @details
            )
        `;

        const record = await this.querySingle(query, {
            dossierId: data.dossierId || null,
            documentId: data.documentId || null,
            gebruikerId: data.gebruikerId || null,
            gastId: data.gastId || null,
            ipAdres: data.ipAdres || null,
            userAgent: data.userAgent || null,
            actie: data.actie,
            details: data.details ? JSON.stringify(data.details) : null,
        });

        if (!record) {
            throw new Error('Failed to create audit log entry');
        }

        return DbMappers.toDocumentAuditLog(record);
    }

    /**
     * Finds audit logs for a dossier
     *
     * @param dossierId - The dossier ID
     * @param limit - Maximum number of entries to return (default: 100)
     * @param offset - Number of entries to skip (default: 0)
     * @returns Array of audit log entries, newest first
     */
    async findByDossierId(
        dossierId: number,
        limit: number = 100,
        offset: number = 0
    ): Promise<DocumentAuditLog[]> {
        const query = `
            SELECT
                id,
                dossier_id,
                document_id,
                gebruiker_id,
                gast_id,
                ip_adres,
                user_agent,
                actie,
                details,
                tijdstip
            FROM dbo.document_audit_log
            WHERE dossier_id = @dossierId
            ORDER BY tijdstip DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        const records = await this.queryMany(query, { dossierId, limit, offset });
        return records.map(DbMappers.toDocumentAuditLog);
    }

    /**
     * Finds audit logs for a specific document
     *
     * @param documentId - The document ID
     * @param limit - Maximum number of entries to return (default: 50)
     * @returns Array of audit log entries, newest first
     */
    async findByDocumentId(documentId: number, limit: number = 50): Promise<DocumentAuditLog[]> {
        const query = `
            SELECT
                id,
                dossier_id,
                document_id,
                gebruiker_id,
                gast_id,
                ip_adres,
                user_agent,
                actie,
                details,
                tijdstip
            FROM dbo.document_audit_log
            WHERE document_id = @documentId
            ORDER BY tijdstip DESC
            OFFSET 0 ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        const records = await this.queryMany(query, { documentId, limit });
        return records.map(DbMappers.toDocumentAuditLog);
    }

    /**
     * Finds audit logs by action type
     *
     * @param actie - The action type
     * @param limit - Maximum number of entries to return (default: 100)
     * @returns Array of audit log entries, newest first
     */
    async findByActie(actie: DocumentAuditLog['actie'], limit: number = 100): Promise<DocumentAuditLog[]> {
        const query = `
            SELECT
                id,
                dossier_id,
                document_id,
                gebruiker_id,
                gast_id,
                ip_adres,
                user_agent,
                actie,
                details,
                tijdstip
            FROM dbo.document_audit_log
            WHERE actie = @actie
            ORDER BY tijdstip DESC
            OFFSET 0 ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        const records = await this.queryMany(query, { actie, limit });
        return records.map(DbMappers.toDocumentAuditLog);
    }

    /**
     * Finds audit logs for a specific guest
     *
     * @param gastId - The guest ID
     * @param limit - Maximum number of entries to return (default: 100)
     * @returns Array of audit log entries, newest first
     */
    async findByGastId(gastId: number, limit: number = 100): Promise<DocumentAuditLog[]> {
        const query = `
            SELECT
                id,
                dossier_id,
                document_id,
                gebruiker_id,
                gast_id,
                ip_adres,
                user_agent,
                actie,
                details,
                tijdstip
            FROM dbo.document_audit_log
            WHERE gast_id = @gastId
            ORDER BY tijdstip DESC
            OFFSET 0 ROWS
            FETCH NEXT @limit ROWS ONLY
        `;

        const records = await this.queryMany(query, { gastId, limit });
        return records.map(DbMappers.toDocumentAuditLog);
    }

    /**
     * Finds access denied attempts for a dossier
     *
     * @param dossierId - The dossier ID
     * @param sinceDays - Number of days to look back (default: 7)
     * @returns Array of access denied log entries
     */
    async findAccessDenied(dossierId: number, sinceDays: number = 7): Promise<DocumentAuditLog[]> {
        const query = `
            SELECT
                id,
                dossier_id,
                document_id,
                gebruiker_id,
                gast_id,
                ip_adres,
                user_agent,
                actie,
                details,
                tijdstip
            FROM dbo.document_audit_log
            WHERE dossier_id = @dossierId
                AND actie = 'access_denied'
                AND tijdstip > DATEADD(day, -@sinceDays, GETDATE())
            ORDER BY tijdstip DESC
        `;

        const records = await this.queryMany(query, { dossierId, sinceDays });
        return records.map(DbMappers.toDocumentAuditLog);
    }

    /**
     * Gets count of actions by type for a dossier
     *
     * @param dossierId - The dossier ID
     * @returns Map of action type to count
     */
    async getActionCounts(dossierId: number): Promise<Map<string, number>> {
        const query = `
            SELECT
                actie,
                COUNT(*) as count
            FROM dbo.document_audit_log
            WHERE dossier_id = @dossierId
            GROUP BY actie
        `;

        const records = await this.queryMany<{ actie: string; count: number }>(query, { dossierId });
        const countMap = new Map<string, number>();
        records.forEach(record => {
            countMap.set(record.actie, record.count);
        });
        return countMap;
    }

    /**
     * Gets recent activity summary for a dossier
     *
     * @param dossierId - The dossier ID
     * @param days - Number of days to summarize (default: 30)
     * @returns Summary object with activity counts
     */
    async getActivitySummary(dossierId: number, days: number = 30): Promise<{
        uploads: number;
        downloads: number;
        deletes: number;
        accessDenied: number;
        guestAccess: number;
    }> {
        const query = `
            SELECT
                actie,
                COUNT(*) as count
            FROM dbo.document_audit_log
            WHERE dossier_id = @dossierId
                AND tijdstip > DATEADD(day, -@days, GETDATE())
            GROUP BY actie
        `;

        const records = await this.queryMany<{ actie: string; count: number }>(query, { dossierId, days });

        const summary = {
            uploads: 0,
            downloads: 0,
            deletes: 0,
            accessDenied: 0,
            guestAccess: 0,
        };

        records.forEach(record => {
            switch (record.actie) {
                case 'upload':
                    summary.uploads = record.count;
                    break;
                case 'download':
                    summary.downloads = record.count;
                    break;
                case 'delete':
                    summary.deletes = record.count;
                    break;
                case 'access_denied':
                    summary.accessDenied = record.count;
                    break;
                case 'guest_access':
                    summary.guestAccess = record.count;
                    break;
            }
        });

        return summary;
    }

    // Convenience methods for common logging operations

    /**
     * Logs a document upload
     */
    async logUpload(
        dossierId: number,
        documentId: number,
        uploaderId: { gebruikerId?: number; gastId?: number },
        ipAdres?: string,
        userAgent?: string,
        details?: Record<string, any>
    ): Promise<DocumentAuditLog> {
        return this.log({
            dossierId,
            documentId,
            gebruikerId: uploaderId.gebruikerId,
            gastId: uploaderId.gastId,
            ipAdres,
            userAgent,
            actie: 'upload',
            details,
        });
    }

    /**
     * Logs a document download
     */
    async logDownload(
        dossierId: number,
        documentId: number,
        downloaderId: { gebruikerId?: number; gastId?: number },
        ipAdres?: string,
        userAgent?: string
    ): Promise<DocumentAuditLog> {
        return this.log({
            dossierId,
            documentId,
            gebruikerId: downloaderId.gebruikerId,
            gastId: downloaderId.gastId,
            ipAdres,
            userAgent,
            actie: 'download',
        });
    }

    /**
     * Logs a document deletion
     */
    async logDelete(
        dossierId: number,
        documentId: number,
        deleterId: { gebruikerId?: number; gastId?: number },
        ipAdres?: string,
        userAgent?: string,
        details?: Record<string, any>
    ): Promise<DocumentAuditLog> {
        return this.log({
            dossierId,
            documentId,
            gebruikerId: deleterId.gebruikerId,
            gastId: deleterId.gastId,
            ipAdres,
            userAgent,
            actie: 'delete',
            details,
        });
    }

    /**
     * Logs an access denied attempt
     */
    async logAccessDenied(
        dossierId: number | undefined,
        ipAdres?: string,
        userAgent?: string,
        details?: Record<string, any>
    ): Promise<DocumentAuditLog> {
        return this.log({
            dossierId,
            ipAdres,
            userAgent,
            actie: 'access_denied',
            details,
        });
    }

    /**
     * Logs a guest invitation
     */
    async logGuestInvited(
        dossierId: number,
        gebruikerId: number,
        gastId: number,
        ipAdres?: string,
        details?: Record<string, any>
    ): Promise<DocumentAuditLog> {
        return this.log({
            dossierId,
            gebruikerId,
            gastId,
            ipAdres,
            actie: 'guest_invited',
            details,
        });
    }

    /**
     * Logs a guest access revocation
     */
    async logGuestRevoked(
        dossierId: number,
        gebruikerId: number,
        gastId: number,
        ipAdres?: string,
        details?: Record<string, any>
    ): Promise<DocumentAuditLog> {
        return this.log({
            dossierId,
            gebruikerId,
            gastId,
            ipAdres,
            actie: 'guest_revoked',
            details,
        });
    }

    /**
     * Logs guest access to the document portal
     */
    async logGuestAccess(
        dossierId: number,
        gastId: number,
        ipAdres?: string,
        userAgent?: string
    ): Promise<DocumentAuditLog> {
        return this.log({
            dossierId,
            gastId,
            ipAdres,
            userAgent,
            actie: 'guest_access',
        });
    }
}

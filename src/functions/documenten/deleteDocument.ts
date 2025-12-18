import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDocumentRepository } from '../../repositories/DossierDocumentRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { DocumentAuditLogRepository } from '../../repositories/DocumentAuditLogRepository';
import { requireAuthentication } from '../../utils/auth-helper';
import { extractClientIp, extractUserAgent } from '../../utils/guest-auth-helper';
import {
    createSuccessResponse,
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
    createNotFoundResponse,
} from '../../utils/response-helper';

/**
 * DELETE /api/dossiers/{dossierId}/documenten/{documentId}
 *
 * Soft-deletes a document from a dossier.
 * The actual blob is NOT deleted (kept for audit trail and potential recovery).
 *
 * OWNER ONLY: Only the dossier owner can delete documents.
 * Guests and shared users cannot delete documents.
 */
export async function deleteDocument(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Document endpoint called');

    try {
        // Parse route parameters
        const dossierId = parseInt(request.params.dossierId as string);
        const documentId = parseInt(request.params.documentId as string);

        if (isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }
        if (isNaN(documentId)) {
            return createErrorResponse('Invalid document ID', 400);
        }

        // Authenticate user (guests cannot delete)
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        // OWNER ONLY: Check if user is the dossier owner
        const dossierRepo = new DossierRepository();
        const isOwner = await dossierRepo.isOwner(dossierId, userId);

        if (!isOwner) {
            return createErrorResponse('Only the dossier owner can delete documents', 403);
        }

        // Fetch document
        const documentRepo = new DossierDocumentRepository();
        const document = await documentRepo.findById(documentId);

        if (!document) {
            return createNotFoundResponse('Document');
        }

        // SECURITY: Verify document belongs to the requested dossier
        if (document.dossierId !== dossierId) {
            const auditRepo = new DocumentAuditLogRepository();
            await auditRepo.logAccessDenied(
                dossierId,
                extractClientIp(request),
                extractUserAgent(request),
                {
                    reason: 'Attempted to delete document from different dossier',
                    requestedDocumentId: documentId,
                    documentDossierId: document.dossierId,
                }
            );

            return createForbiddenResponse();
        }

        // Store document info for audit log before deletion
        const documentInfo = {
            filename: document.origineleBestandsnaam,
            blobPath: document.blobPath,
            size: document.bestandsgrootte,
        };

        // Soft delete the document record
        const deleted = await documentRepo.softDelete(documentId);

        if (!deleted) {
            return createErrorResponse('Failed to delete document', 500);
        }

        // Log deletion
        const auditRepo = new DocumentAuditLogRepository();
        await auditRepo.logDelete(
            dossierId,
            documentId,
            { gebruikerId: userId },
            extractClientIp(request),
            extractUserAgent(request),
            documentInfo
        );

        return createSuccessResponse({
            message: 'Document successfully deleted',
            documentId,
        });
    } catch (error) {
        context.error('Error deleting document:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to delete document',
            500
        );
    }
}

app.http('deleteDocument', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/documenten/{documentId}',
    handler: deleteDocument,
});

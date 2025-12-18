import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDocumentRepository } from '../../repositories/DossierDocumentRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { DocumentAuditLogRepository } from '../../repositories/DocumentAuditLogRepository';
import { BlobStorageService } from '../../services/blob-storage.service';
import {
    authenticateUserOrGuest,
    requireGuestDossierAccess,
    guestHasPermission,
    extractClientIp,
    extractUserAgent,
} from '../../utils/guest-auth-helper';
import {
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
    createNotFoundResponse,
} from '../../utils/response-helper';

/**
 * GET /api/dossiers/{dossierId}/documenten/{documentId}/download
 *
 * Downloads a document (returns a time-limited SAS URL for direct download).
 *
 * Accessible by:
 * - Dossier owner
 * - Shared users
 * - Guests with view permission
 */
export async function downloadDocument(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Download Document endpoint called');

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

        // Authenticate user or guest
        const authResult = await authenticateUserOrGuest(request);

        if (!authResult.authenticated) {
            return createUnauthorizedResponse();
        }

        // Authorization check
        if (authResult.type === 'user') {
            // User: check dossier access
            const dossierRepo = new DossierRepository();
            const hasAccess = await dossierRepo.checkAccess(dossierId, authResult.userId!);
            if (!hasAccess) {
                return createForbiddenResponse();
            }
        } else if (authResult.type === 'guest') {
            // Guest: check dossier matches and has view permission
            requireGuestDossierAccess(authResult.gast!, dossierId);
            if (!guestHasPermission(authResult.gast!, 'view')) {
                return createErrorResponse('Guest lacks view permission', 403);
            }
        }

        // Fetch document
        const documentRepo = new DossierDocumentRepository();
        const document = await documentRepo.findById(documentId);

        if (!document) {
            return createNotFoundResponse('Document');
        }

        // SECURITY: Verify document belongs to the requested dossier
        if (document.dossierId !== dossierId) {
            // Log access denied attempt
            const auditRepo = new DocumentAuditLogRepository();
            await auditRepo.logAccessDenied(
                dossierId,
                extractClientIp(request),
                extractUserAgent(request),
                {
                    reason: 'Document belongs to different dossier',
                    requestedDocumentId: documentId,
                    documentDossierId: document.dossierId,
                }
            );

            return createForbiddenResponse();
        }

        // Generate time-limited download URL
        const blobService = new BlobStorageService();
        const downloadUrl = await blobService.getDownloadUrl(
            document.blobContainer,
            document.blobPath,
            15 // 15 minutes expiry
        );

        // Log download action
        const auditRepo = new DocumentAuditLogRepository();
        await auditRepo.logDownload(
            dossierId,
            documentId,
            {
                gebruikerId: authResult.type === 'user' ? authResult.userId : undefined,
                gastId: authResult.type === 'guest' ? authResult.gast!.id : undefined,
            },
            extractClientIp(request),
            extractUserAgent(request)
        );

        // Return download URL
        return {
            status: 200,
            jsonBody: {
                success: true,
                data: {
                    downloadUrl,
                    filename: document.origineleBestandsnaam,
                    mimeType: document.mimeType,
                    size: document.bestandsgrootte,
                    expiresInMinutes: 15,
                },
            },
        };
    } catch (error) {
        context.error('Error downloading document:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to download document',
            500
        );
    }
}

app.http('downloadDocument', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/documenten/{documentId}/download',
    handler: downloadDocument,
});

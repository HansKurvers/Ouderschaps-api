import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDocumentRepository } from '../../repositories/DossierDocumentRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { DocumentAuditLogRepository } from '../../repositories/DocumentAuditLogRepository';
import {
    authenticateUserOrGuest,
    requireGuestDossierAccess,
    guestHasPermission,
    extractClientIp,
    extractUserAgent,
} from '../../utils/guest-auth-helper';
import {
    createSuccessResponse,
    createErrorResponse,
    createUnauthorizedResponse,
    createForbiddenResponse,
} from '../../utils/response-helper';

/**
 * GET /api/dossiers/{dossierId}/documenten
 *
 * Returns all documents for a dossier.
 * Accessible by:
 * - Dossier owner
 * - Shared users
 * - Guests with view permission
 */
export async function getDocuments(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Documents endpoint called');

    try {
        // Parse dossier ID from route
        const dossierId = parseInt(request.params.dossierId as string);
        context.log(`Fetching documents for dossier ID: ${dossierId}`);
        if (isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Authenticate user or guest
        context.log('Starting authentication...');
        const authResult = await authenticateUserOrGuest(request);
        context.log(`Auth result: type=${authResult.type}, authenticated=${authResult.authenticated}, userId=${authResult.userId}, error=${authResult.error}`);

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

        // Fetch documents with category info
        context.log(`Fetching documents from database for dossier ${dossierId}...`);
        const documentRepo = new DossierDocumentRepository();
        const documents = await documentRepo.findByDossierIdWithCategorie(dossierId);
        context.log(`Found ${documents.length} documents for dossier ${dossierId}`);

        // Log view action for audit
        const auditRepo = new DocumentAuditLogRepository();
        await auditRepo.log({
            dossierId,
            gebruikerId: authResult.type === 'user' ? authResult.userId : undefined,
            gastId: authResult.type === 'guest' ? authResult.gast!.id : undefined,
            ipAdres: extractClientIp(request),
            userAgent: extractUserAgent(request),
            actie: 'view',
            details: { action: 'list_documents' },
        });

        return createSuccessResponse(documents);
    } catch (error) {
        context.error('Error fetching documents:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to fetch documents',
            500
        );
    }
}

app.http('getDocuments', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/documenten',
    handler: getDocuments,
});

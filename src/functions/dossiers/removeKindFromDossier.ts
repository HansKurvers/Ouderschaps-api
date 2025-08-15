import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function removeKindFromDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from headers
        const userId = await requireAuthentication(request);
        if (userId === null) {
            return createErrorResponse('User ID is required', 401);
        }

        // Get dossier ID and kind ID from path
        const dossierId = Number(request.params.dossierId);
        const kindId = Number(request.params.kindId);

        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }
        if (!kindId || isNaN(kindId)) {
            return createErrorResponse('Invalid kind ID', 400);
        }

        // Initialize database connection
        await dbService.initialize();

        // Check dossier access
        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        // Check if the kind relation exists (kindId here is actually the dossiers_kinderen.id)
        const existingKind = await dbService.getKindWithOudersById(kindId);
        if (!existingKind) {
            return createErrorResponse('Kind not found in this dossier', 404);
        }

        // Remove kind from dossier (only the link, not the person)
        const success = await dbService.removeKindFromDossier(dossierId, kindId);
        
        if (!success) {
            return createErrorResponse('Failed to remove kind from dossier', 500);
        }

        context.log(`Kind ${kindId} removed from dossier ${dossierId}`);
        return createSuccessResponse({ success: true });

    } catch (error) {
        context.error('Error in removeKindFromDossier:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('removeKindFromDossier', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/kinderen/{kindId}',
    handler: removeKindFromDossier,
});
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function getDossierPartijen(
    request: HttpRequest,
    _context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from auth
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            return createErrorResponse('Authentication required', 401);
        }

        // Get dossier ID from route
        const dossierId = parseInt(request.params.dossierId || '');
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Initialize database
        await dbService.initialize();

        // Check dossier access
        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            // Instead of returning 403, return empty array to prevent console spam
            // This happens when frontend tries to load partijen for all visible dossiers
            // but user only has access to some (e.g. via different relationships)
            return createSuccessResponse([]);
        }

        // Get partijen with IDs
        const partijen = await dbService.getPartijListWithId(dossierId);
        return createSuccessResponse(partijen);

    } catch (error) {
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getDossierPartijen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/partijen',
    handler: getDossierPartijen,
});
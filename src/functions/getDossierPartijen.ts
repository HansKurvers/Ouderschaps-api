import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../utils/response-helper';
import { getUserId } from '../utils/auth-helper';

export async function getDossierPartijen(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from auth
        const userId = getUserId(request);
        if (!userId) {
            return createErrorResponse('Unauthorized', 401);
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
            return createErrorResponse('Access denied', 403);
        }

        // Get partijen with IDs
        const partijen = await dbService.getPartijListWithId(dossierId);

        context.log(`Retrieved ${partijen.length} partijen for dossier ${dossierId}`);
        return createSuccessResponse(partijen);

    } catch (error) {
        context.error('Error in getDossierPartijen:', error);
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
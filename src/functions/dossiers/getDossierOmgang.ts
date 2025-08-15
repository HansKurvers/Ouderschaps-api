import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function getDossierOmgang(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        const userId = await requireAuthentication(request);
        if (userId === null) {
            return createErrorResponse('User ID is required', 401);
        }

        const dossierId = Number(request.params.dossierId);
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        await dbService.initialize();

        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        const omgang = await dbService.getOmgangByDossier(dossierId);

        context.log(`Retrieved ${omgang.length} omgang entries for dossier ${dossierId}`);
        return createSuccessResponse(omgang);

    } catch (error) {
        context.error('Error in getDossierOmgang:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getDossierOmgang', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/omgang',
    handler: getDossierOmgang,
});
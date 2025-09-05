import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function getOuderschapsplanInfoByDossierId(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from auth
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Get dossier ID from route
        const dossierId = parseInt(request.params.dossierId || '');
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Check if user has access to this dossier
        await dbService.initialize();
        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        
        if (!hasAccess) {
            return createErrorResponse('Access denied', 403);
        }

        // Get ouderschapsplan info for dossier from database
        const info = await dbService.getOuderschapsplanInfoByDossierId(dossierId);

        if (!info) {
            return createErrorResponse('Ouderschapsplan info not found for this dossier', 404);
        }

        context.log(`Retrieved ouderschapsplan info for dossier ID: ${dossierId}`);
        return createSuccessResponse(info);

    } catch (error) {
        context.error('Error in getOuderschapsplanInfoByDossierId:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getOuderschapsplanInfoByDossierId', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/ouderschapsplan',
    handler: getOuderschapsplanInfoByDossierId,
});
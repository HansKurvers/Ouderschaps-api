import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function getOuderschapsplanInfoByPersoonId(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from auth
        try {
            await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Get persoon ID from route
        const persoonId = parseInt(request.params.persoonId || '');
        if (!persoonId || isNaN(persoonId)) {
            return createErrorResponse('Invalid persoon ID', 400);
        }

        // Get ouderschapsplan info for persoon from database
        await dbService.initialize();
        const info = await dbService.getOuderschapsplanInfoByPersoonId(persoonId);

        context.log(`Retrieved ${info.length} ouderschapsplan info records for persoon ID: ${persoonId}`);
        return createSuccessResponse(info);

    } catch (error) {
        context.error('Error in getOuderschapsplanInfoByPersoonId:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getOuderschapsplanInfoByPersoonId', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'personen/{persoonId}/ouderschapsplan',
    handler: getOuderschapsplanInfoByPersoonId,
});
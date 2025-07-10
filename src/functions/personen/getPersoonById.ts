import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { getUserId } from '../../utils/auth-helper';

export async function getPersoonById(
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

        // Get persoon ID from route
        const persoonId = parseInt(request.params.persoonId || '');
        if (!persoonId || isNaN(persoonId)) {
            return createErrorResponse('Invalid persoon ID', 400);
        }

        // Get persoon from database
        await dbService.initialize();
        const persoon = await dbService.getPersoonById(persoonId);

        if (!persoon) {
            return createErrorResponse('Persoon not found', 404);
        }

        context.log(`Retrieved persoon with ID: ${persoonId}`);
        return createSuccessResponse(persoon);

    } catch (error) {
        context.error('Error in getPersoonById:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getPersoonById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'personen/{persoonId}',
    handler: getPersoonById,
});
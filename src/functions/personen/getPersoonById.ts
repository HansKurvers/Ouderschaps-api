import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function getPersoonById(
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

        // Get persoon ID from route
        const persoonId = parseInt(request.params.persoonId || '');
        if (!persoonId || isNaN(persoonId)) {
            return createErrorResponse('Invalid persoon ID', 400);
        }

        // Get persoon from database (only if it belongs to this user)
        await dbService.initialize();
        const persoon = await dbService.getPersoonByIdForUser(persoonId, userId);

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
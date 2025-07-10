import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { getUserId } from '../../utils/auth-helper';

export async function removeOuderFromKind(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from headers
        const userId = getUserId(request);
        if (!userId) {
            return createErrorResponse('User ID is required', 401);
        }

        // Get kind ID and ouder ID from path
        const kindId = Number(request.params.kindId);
        const ouderId = Number(request.params.ouderId);

        if (!kindId || isNaN(kindId)) {
            return createErrorResponse('Invalid kind ID', 400);
        }
        if (!ouderId || isNaN(ouderId)) {
            return createErrorResponse('Invalid ouder ID', 400);
        }

        // Initialize database connection
        await dbService.initialize();

        // Check if kind exists
        const kind = await dbService.getPersoonById(kindId);
        if (!kind) {
            return createErrorResponse('Kind not found', 404);
        }

        // Check if ouder exists
        const ouder = await dbService.getPersoonById(ouderId);
        if (!ouder) {
            return createErrorResponse('Ouder not found', 404);
        }

        // Check if relatie exists
        const relatieExists = await dbService.checkOuderKindRelatie(kindId, ouderId);
        if (!relatieExists) {
            return createErrorResponse('Ouder-kind relatie not found', 404);
        }

        // Remove the relatie (not the ouder persoon)
        const success = await dbService.removeOuderFromKind(kindId, ouderId);
        
        if (!success) {
            return createErrorResponse('Failed to remove ouder-kind relatie', 500);
        }

        context.log(`Removed ouder-kind relatie between kind ${kindId} and ouder ${ouderId}`);
        return createSuccessResponse({ success: true });

    } catch (error) {
        context.error('Error in removeOuderFromKind:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('removeOuderFromKind', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'kinderen/{kindId}/ouders/{ouderId}',
    handler: removeOuderFromKind,
});
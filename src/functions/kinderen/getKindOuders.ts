import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function getKindOuders(
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

        // Get kind ID from path (this is persoon ID of the kind)
        const kindId = Number(request.params.kindId);
        if (!kindId || isNaN(kindId)) {
            return createErrorResponse('Invalid kind ID', 400);
        }

        // Initialize database connection
        await dbService.initialize();

        // Check if kind (persoon) exists
        const kind = await dbService.getPersoonById(kindId);
        if (!kind) {
            return createErrorResponse('Kind not found', 404);
        }

        // Get ouders for this kind
        const ouders = await dbService.getOudersByKind(kindId);

        context.log(`Retrieved ${ouders.length} ouders for kind ${kindId}`);
        return createSuccessResponse(ouders);

    } catch (error) {
        context.error('Error in getKindOuders:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getKindOuders', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'kinderen/{kindId}/ouders',
    handler: getKindOuders,
});
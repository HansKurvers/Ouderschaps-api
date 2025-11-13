import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CommunicatieAfsprakenService } from '../../services/communicatie-afspraken-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse, createNotFoundResponse } from '../../utils/response-helper';

export async function deleteCommunicatieAfspraken(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Communicatie Afspraken endpoint called');

    const service = new CommunicatieAfsprakenService();

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        // Get ID from route
        const id = parseInt(request.params.id as string);
        if (isNaN(id)) {
            return createErrorResponse('Invalid ID', 400);
        }

        // Check if user has access to this communicatie afspraken
        const hasAccess = await service.checkAccess(id, userID);
        if (!hasAccess) {
            return createErrorResponse('Access denied', 403);
        }

        // Delete communicatie afspraken
        const deleted = await service.delete(id);

        if (!deleted) {
            return createNotFoundResponse('Communicatie afspraken');
        }

        return createSuccessResponse(null, 204);
    } catch (error) {
        context.error('Error deleting communicatie afspraken:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to delete communicatie afspraken',
            500
        );
    }
}

app.http('deleteCommunicatieAfspraken', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'communicatie-afspraken/{id}',
    handler: deleteCommunicatieAfspraken,
});

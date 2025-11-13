import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CommunicatieAfsprakenService } from '../../services/communicatie-afspraken-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse, createNotFoundResponse } from '../../utils/response-helper';
import { UpdateCommunicatieAfsprakenDto } from '../../models/CommunicatieAfspraken';

export async function updateCommunicatieAfspraken(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('PUT Update Communicatie Afspraken endpoint called');

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

        // Parse request body
        const body = await request.json() as UpdateCommunicatieAfsprakenDto;

        // Update communicatie afspraken
        const afspraken = await service.update(id, body);

        if (!afspraken) {
            return createNotFoundResponse('Communicatie afspraken');
        }

        return createSuccessResponse(afspraken);
    } catch (error) {
        context.error('Error updating communicatie afspraken:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to update communicatie afspraken',
            500
        );
    }
}

app.http('updateCommunicatieAfspraken', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'communicatie-afspraken/{id}',
    handler: updateCommunicatieAfspraken,
});

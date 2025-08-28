import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AlimentatieService } from '../../services/alimentatie-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { UpdateAlimentatieDto } from '../../models/Alimentatie';

export async function updateAlimentatie(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('PUT Update Alimentatie endpoint called');

    const alimentatieService = new AlimentatieService();

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        // Get alimentatie ID from route (note: corrected route parameter)
        const alimentatieId = parseInt(request.params.id as string);
        if (isNaN(alimentatieId)) {
            return createErrorResponse('Invalid alimentatie ID', 400);
        }

        // Check if user has access to this alimentatie
        const hasAccess = await alimentatieService.checkAlimentatieAccess(alimentatieId, userID);
        if (!hasAccess) {
            return createErrorResponse('Access denied', 403);
        }

        // Parse request body
        const body = await request.json() as UpdateAlimentatieDto;

        // Update alimentatie
        const updatedAlimentatie = await alimentatieService.updateAlimentatie(alimentatieId, body);

        return createSuccessResponse(updatedAlimentatie, 200);
    } catch (error) {
        context.error('Error updating alimentatie:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to update alimentatie',
            500
        );
    }
}

app.http('updateAlimentatie', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'alimentatie/{id}',
    handler: updateAlimentatie,
});
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AlimentatieService } from '../../services/alimentatie-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

export async function getBijdrageKosten(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Bijdrage Kosten endpoint called');

    const alimentatieService = new AlimentatieService();

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        // Get alimentatie ID from route
        const alimentatieId = parseInt(request.params.id as string);
        if (isNaN(alimentatieId)) {
            return createErrorResponse('Invalid alimentatie ID', 400);
        }

        // Check if user has access to this alimentatie
        const hasAccess = await alimentatieService.checkAlimentatieAccess(alimentatieId, userID);
        if (!hasAccess) {
            return createErrorResponse('Access denied', 403);
        }

        // Get bijdrage kosten data
        const bijdrageKosten = await alimentatieService.getBijdrageKostenByAlimentatieId(alimentatieId);

        return createSuccessResponse(bijdrageKosten, 200);
    } catch (error) {
        context.error('Error getting bijdrage kosten:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to get bijdrage kosten',
            500
        );
    }
}

app.http('getBijdrageKosten', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'alimentatie/{id}/bijdragen-kosten',
    handler: getBijdrageKosten,
});
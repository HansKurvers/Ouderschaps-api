import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AlimentatieService } from '../../services/alimentatie-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

export async function getFinancieleAfspraken(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Financiele Afspraken endpoint called');

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

        // Get financiele afspraken data
        const financieleAfspraken = await alimentatieService.getFinancieleAfsprakenByAlimentatieId(alimentatieId);

        return createSuccessResponse(financieleAfspraken, 200);
    } catch (error) {
        context.error('Error getting financiele afspraken:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to get financiele afspraken',
            500
        );
    }
}

app.http('getFinancieleAfspraken', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'alimentatie/{id}/financiele-afspraken',
    handler: getFinancieleAfspraken,
});
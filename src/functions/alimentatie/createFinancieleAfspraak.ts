import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AlimentatieService } from '../../services/alimentatie-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { CreateFinancieleAfsprakenKinderenDto } from '../../models/Alimentatie';

export async function createFinancieleAfspraak(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Create Financiele Afspraak endpoint called');

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

        // Parse request body
        const body = await request.json();

        // Handle both single and array of financiele afspraken kinderen
        const items = Array.isArray(body) ? body : [body];
        const results = [];

        for (const item of items) {
            const createData: CreateFinancieleAfsprakenKinderenDto = {
                kindId: item.kindId
            };

            // Validate required fields
            if (!createData.kindId) {
                return createErrorResponse('Missing required field: kindId', 400);
            }

            // Upsert financiele afspraken kinderen (will create new or update existing)
            const financieleAfsprakenKinderen = await alimentatieService.upsertFinancieleAfsprakenKinderen(alimentatieId, createData);
            results.push(financieleAfsprakenKinderen);
        }

        return createSuccessResponse(
            Array.isArray(body) ? results : results[0], 
            201
        );
    } catch (error) {
        context.error('Error creating financiele afspraak:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to create financiele afspraak',
            500
        );
    }
}

app.http('createFinancieleAfspraak', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'alimentatie/{id}/financiele-afspraken',
    handler: createFinancieleAfspraak,
});
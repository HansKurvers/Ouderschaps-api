import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AlimentatieService } from '../../services/alimentatie-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { CreateBijdrageKostenKinderenDto } from '../../models/Alimentatie';

export async function createBijdrageKosten(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Create Bijdrage Kosten endpoint called');

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

        // Handle both single and array of bijdrage kosten kinderen
        const items = Array.isArray(body) ? body : [body];
        const results = [];

        for (const item of items) {
            const createData: CreateBijdrageKostenKinderenDto = {
                personenId: item.personenId
            };

            // Validate required fields
            if (!createData.personenId) {
                return createErrorResponse('Missing required field: personenId', 400);
            }

            // Create bijdrage kosten kinderen
            const newBijdrageKostenKinderen = await alimentatieService.createBijdrageKostenKinderen(alimentatieId, createData);
            results.push(newBijdrageKostenKinderen);
        }

        return createSuccessResponse(
            Array.isArray(body) ? results : results[0], 
            201
        );
    } catch (error) {
        context.error('Error creating bijdrage kosten:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to create bijdrage kosten',
            500
        );
    }
}

app.http('createBijdrageKosten', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'alimentatie/{id}/bijdragen-kosten',
    handler: createBijdrageKosten,
});
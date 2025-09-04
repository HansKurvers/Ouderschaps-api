import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AlimentatieService } from '../../services/alimentatie-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createErrorResponse, createSuccessResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { CreateBijdrageKostenKinderenDto } from '../../models/Alimentatie';

export async function replaceBijdrageKosten(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('PUT Replace Bijdrage Kosten endpoint called');

    const alimentatieService = new AlimentatieService();

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (_authError) {
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

        // First, delete all existing bijdrage kosten for this alimentatie
        await alimentatieService.deleteBijdrageKostenByAlimentatieId(alimentatieId);

        // Handle both single and array of bijdrage kosten kinderen
        const items = Array.isArray(body) ? body : [body];
        const results = [];

        // Use a Set to track which personenIds we've already processed to prevent duplicates
        const processedPersonenIds = new Set<number>();

        for (const item of items) {
            const createData: CreateBijdrageKostenKinderenDto = {
                personenId: item.personenId,
                eigenAandeel: item.eigenAandeel
            };

            // Validate required fields
            if (!createData.personenId) {
                continue; // Skip items without personenId
            }

            // Skip if we've already processed this personenId
            if (processedPersonenIds.has(createData.personenId)) {
                context.log(`Skipping duplicate personenId: ${createData.personenId}`);
                continue;
            }

            processedPersonenIds.add(createData.personenId);

            // Create new bijdrage kosten kinderen
            const bijdrageKostenKinderen = await alimentatieService.createBijdrageKostenKinderen(alimentatieId, createData);
            results.push(bijdrageKostenKinderen);
        }

        return createSuccessResponse(results, 200);
    } catch (error) {
        context.error('Error replacing bijdrage kosten:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to replace bijdrage kosten',
            500
        );
    }
}

app.http('replaceBijdrageKosten', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'alimentatie/{id}/bijdragen-kosten/replace',
    handler: replaceBijdrageKosten,
});
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AlimentatieService } from '../../services/alimentatie-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createErrorResponse, createSuccessResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { CreateFinancieleAfsprakenKinderenDto } from '../../models/Alimentatie';

export async function replaceFinancieleAfspraken(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('PUT Replace Financiele Afspraken endpoint called');

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

        // First, delete all existing financiele afspraken for this alimentatie
        await alimentatieService.deleteFinancieleAfsprakenByAlimentatieId(alimentatieId);

        // Handle both single and array of financiele afspraken kinderen
        const items = Array.isArray(body) ? body : [body];
        const results = [];

        // Use a Set to track which kindIds we've already processed to prevent duplicates
        const processedKindIds = new Set<number>();

        for (const item of items) {
            const createData: CreateFinancieleAfsprakenKinderenDto = {
                kindId: item.kindId,
                alimentatieBedrag: item.alimentatieBedrag,
                hoofdverblijf: item.hoofdverblijf,
                kinderbijslagOntvanger: item.kinderbijslagOntvanger,
                zorgkortingPercentage: item.zorgkortingPercentage,
                inschrijving: item.inschrijving,
                kindgebondenBudget: item.kindgebondenBudget
            };

            // Validate required fields
            if (!createData.kindId) {
                continue; // Skip items without kindId
            }

            // Skip if we've already processed this kindId
            if (processedKindIds.has(createData.kindId)) {
                context.log(`Skipping duplicate kindId: ${createData.kindId}`);
                continue;
            }

            processedKindIds.add(createData.kindId);

            // Create new financiele afspraken kinderen
            const financieleAfsprakenKinderen = await alimentatieService.createFinancieleAfsprakenKinderen(alimentatieId, createData);
            results.push(financieleAfsprakenKinderen);
        }

        return createSuccessResponse(results, 200);
    } catch (error) {
        context.error('Error replacing financiele afspraken:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to replace financiele afspraken',
            500
        );
    }
}

app.http('replaceFinancieleAfspraken', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'alimentatie/{id}/financiele-afspraken/replace',
    handler: replaceFinancieleAfspraken,
});
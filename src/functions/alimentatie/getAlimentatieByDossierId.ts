import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { AlimentatieService } from '../../services/alimentatie-service';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

export async function getAlimentatieByDossierId(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Alimentatie by Dossier ID endpoint called');

    const alimentatieService = new AlimentatieService();
    const dossierService = new DossierDatabaseService();

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        await dossierService.initialize();

        // Get dossier ID from route
        const dossierId = parseInt(request.params.dossierId as string);
        if (isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Check if user has access to this dossier
        const hasAccess = await dossierService.checkDossierAccess(dossierId, userID);
        if (!hasAccess) {
            return createErrorResponse('Access denied', 403);
        }

        // Get alimentatie data
        const alimentatieData = await alimentatieService.getAlimentatieByDossierId(dossierId);

        if (!alimentatieData) {
            return createSuccessResponse(null, 200);
        }

        return createSuccessResponse(alimentatieData, 200);
    } catch (error) {
        context.error('Error getting alimentatie:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to get alimentatie',
            500
        );
    } finally {
        await dossierService.close();
    }
}

app.http('getAlimentatieByDossierId', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/alimentatie',
    handler: getAlimentatieByDossierId,
});
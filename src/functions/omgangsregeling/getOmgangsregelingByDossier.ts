import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OmgangsregelingService } from '../../services/omgangsregeling-service';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse, createNotFoundResponse } from '../../utils/response-helper';

export async function getOmgangsregelingByDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Omgangsregeling by Dossier endpoint called');

    const service = new OmgangsregelingService();
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
            return createErrorResponse('Access denied to this dossier', 403);
        }

        // Get omgangsregeling
        const omgangsregeling = await service.getByDossierId(dossierId);

        if (!omgangsregeling) {
            return createNotFoundResponse('Omgangsregeling');
        }

        return createSuccessResponse(omgangsregeling);
    } catch (error) {
        context.error('Error retrieving omgangsregeling:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to retrieve omgangsregeling',
            500
        );
    } finally {
        await dossierService.close();
    }
}

app.http('getOmgangsregelingByDossier', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'omgangsregeling/dossier/{dossierId}',
    handler: getOmgangsregelingByDossier,
});

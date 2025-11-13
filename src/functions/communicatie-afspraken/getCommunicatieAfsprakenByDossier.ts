import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CommunicatieAfsprakenService } from '../../services/communicatie-afspraken-service';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse, createNotFoundResponse } from '../../utils/response-helper';

export async function getCommunicatieAfsprakenByDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Communicatie Afspraken by Dossier endpoint called');

    const service = new CommunicatieAfsprakenService();
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

        // Get communicatie afspraken
        const afspraken = await service.getByDossierId(dossierId);

        if (!afspraken) {
            return createNotFoundResponse('Communicatie afspraken');
        }

        return createSuccessResponse(afspraken);
    } catch (error) {
        context.error('Error retrieving communicatie afspraken:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to retrieve communicatie afspraken',
            500
        );
    } finally {
        await dossierService.close();
    }
}

app.http('getCommunicatieAfsprakenByDossier', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'communicatie-afspraken/dossier/{dossierId}',
    handler: getCommunicatieAfsprakenByDossier,
});

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OmgangsregelingService } from '../../services/omgangsregeling-service';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

export async function upsertOmgangsregeling(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('UPSERT Omgangsregeling endpoint called');

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

        // Parse request body
        const body = await request.json() as any;

        if (!body) {
            return createErrorResponse('Request body is required', 400);
        }

        // Upsert omgangsregeling (creates if doesn't exist, updates if it does)
        const result = await service.upsertByDossierId(dossierId, {
            omgangTekstOfSchema: body.omgangTekstOfSchema,
            omgangBeschrijving: body.omgangBeschrijving,
        });

        return createSuccessResponse(result);
    } catch (error) {
        context.error('Error upserting omgangsregeling:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to upsert omgangsregeling',
            500
        );
    } finally {
        await dossierService.close();
    }
}

app.http('upsertOmgangsregeling', {
    methods: ['POST', 'PUT'],
    authLevel: 'anonymous',
    route: 'omgangsregeling/dossier/{dossierId}',
    handler: upsertOmgangsregeling,
});

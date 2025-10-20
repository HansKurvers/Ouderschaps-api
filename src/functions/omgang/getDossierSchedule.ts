import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OmgangRepository } from '../../repositories/OmgangRepository';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function getDossierSchedule(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Dossier Schedule endpoint called');

    const dossierService = new DossierDatabaseService();
    let omgangRepository: OmgangRepository | undefined;

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

        if (USE_REPOSITORY_PATTERN) {
            omgangRepository = new OmgangRepository();

            // Get structured schedule view
            const schedule = await omgangRepository.getSchedule(dossierId);

            return createSuccessResponse({
                dossierId,
                schedule
            });
        } else {
            // Legacy path: use database service
            return createErrorResponse('Legacy schedule retrieval not implemented', 501);
        }
    } catch (error) {
        context.error('Error retrieving dossier schedule:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to retrieve dossier schedule',
            500
        );
    } finally {
        await dossierService.close();
    }
}

app.http('getDossierSchedule', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/omgang/schedule',
    handler: getDossierSchedule,
});

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

export async function createDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Dossiers endpoint called');

    const service = new DossierDatabaseService();

    try {
        // Check authentication
        let userID: string;
        try {
            userID = requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        await service.initialize();

        const userIDNumber = parseInt(userID);

        // Create new dossier
        const newDossier = await service.createDossier(userIDNumber);

        return createSuccessResponse(newDossier, 201);
    } catch (error) {
        context.error('Error creating dossier:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to create dossier',
            500
        );
    } finally {
        await service.close();
    }
}

app.http('createDossier', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers',
    handler: createDossier,
});
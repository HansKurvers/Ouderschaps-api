import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { DossierRepository } from '../../repositories/DossierRepository';
import { requireAuthentication } from '../../utils/auth-helper';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';

// Feature flag for Strangler Fig Pattern migration
// Set USE_REPOSITORY_PATTERN=true to use new repository
// Default: false (use legacy DossierDatabaseService)
const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function createDossier(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('POST Dossiers endpoint called');
    context.log(`Using ${USE_REPOSITORY_PATTERN ? 'Repository Pattern' : 'Legacy Service'}`);

    try {
        // Check authentication
        let userID: number;
        try {
            userID = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        let newDossier;

        if (USE_REPOSITORY_PATTERN) {
            // NEW: Use Repository Pattern
            const repository = new DossierRepository();
            newDossier = await repository.create(userID);
        } else {
            // LEGACY: Use old DossierDatabaseService
            const service = new DossierDatabaseService();
            await service.initialize();
            try {
                newDossier = await service.createDossier(userID);
            } finally {
                await service.close();
            }
        }

        return createSuccessResponse(newDossier, 201);
    } catch (error) {
        context.error('Error creating dossier:', error);

        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to create dossier',
            500
        );
    }
}

app.http('createDossier', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'dossiers',
    handler: createDossier,
});
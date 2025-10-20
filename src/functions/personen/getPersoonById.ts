import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { PersoonRepository } from '../../repositories/PersoonRepository';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

// Feature flag: Use new Repository Pattern or legacy DossierDatabaseService
const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function getPersoonById(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`Using ${USE_REPOSITORY_PATTERN ? 'Repository Pattern' : 'Legacy Service'}`);

    const dbService = USE_REPOSITORY_PATTERN ? null : new DossierDatabaseService();

    try {
        // Get user ID from auth
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Get persoon ID from route
        const persoonId = parseInt(request.params.persoonId || '');
        if (!persoonId || isNaN(persoonId)) {
            return createErrorResponse('Invalid persoon ID', 400);
        }

        let persoon;

        if (USE_REPOSITORY_PATTERN) {
            // NEW: Use Repository Pattern
            const repository = new PersoonRepository();
            persoon = await repository.findByIdForUser(persoonId, userId);
        } else {
            // LEGACY: Use old DossierDatabaseService
            await dbService!.initialize();
            persoon = await dbService!.getPersoonByIdForUser(persoonId, userId);
        }

        if (!persoon) {
            return createErrorResponse('Persoon not found', 404);
        }

        context.log(`Retrieved persoon with ID: ${persoonId}`);
        return createSuccessResponse(persoon);

    } catch (error) {
        context.error('Error in getPersoonById:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        if (dbService) {
            await dbService.close();
        }
    }
}

app.http('getPersoonById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'personen/{persoonId}',
    handler: getPersoonById,
});
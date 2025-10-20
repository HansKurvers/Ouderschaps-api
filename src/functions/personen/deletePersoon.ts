import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { PersoonRepository } from '../../repositories/PersoonRepository';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

// Feature flag: Use new Repository Pattern or legacy DossierDatabaseService
const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function deletePersoon(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`Using ${USE_REPOSITORY_PATTERN ? 'Repository Pattern' : 'Legacy Service'}`);

    const dbService = USE_REPOSITORY_PATTERN ? null : new DossierDatabaseService();

    try {
        // Get user ID from headers
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Get persoon ID from path
        const persoonId = Number(request.params.persoonId);
        if (!persoonId || isNaN(persoonId)) {
            return createErrorResponse('Invalid persoon ID', 400);
        }

        let success;

        if (USE_REPOSITORY_PATTERN) {
            // NEW: Use Repository Pattern
            const repository = new PersoonRepository();

            // Check if persoon exists and belongs to this user
            const existingPersoon = await repository.findByIdForUser(persoonId, userId);
            if (!existingPersoon) {
                return createErrorResponse('Persoon not found', 404);
            }

            // Delete the persoon (only if it belongs to this user)
            success = await repository.deleteForUser(persoonId, userId);
        } else {
            // LEGACY: Use old DossierDatabaseService
            await dbService!.initialize();

            // Check if persoon exists and belongs to this user
            const existingPersoon = await dbService!.getPersoonByIdForUser(persoonId, userId);
            if (!existingPersoon) {
                return createErrorResponse('Persoon not found', 404);
            }

            // Delete the persoon (only if it belongs to this user)
            success = await dbService!.deletePersoonForUser(persoonId, userId);
        }

        if (!success) {
            return createErrorResponse('Failed to delete persoon', 500);
        }

        context.log(`Persoon with ID ${persoonId} deleted successfully`);
        return createSuccessResponse({ message: 'Persoon deleted successfully' });

    } catch (error) {
        context.error('Error in deletePersoon:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        if (dbService) {
            await dbService.close();
        }
    }
}

app.http('deletePersoon', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'personen/{persoonId}',
    handler: deletePersoon,
});
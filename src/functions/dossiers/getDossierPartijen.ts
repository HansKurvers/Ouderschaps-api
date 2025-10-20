import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { DossierRepository, PartijRepository } from '../../repositories';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

// Feature flag: Use new Repository Pattern or legacy DossierDatabaseService
const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function getDossierPartijen(
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
            return createErrorResponse('Authentication required', 401);
        }

        // Get dossier ID from route
        const dossierId = parseInt(request.params.dossierId || '');
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        let partijen;

        if (USE_REPOSITORY_PATTERN) {
            // NEW: Use Repository Pattern
            const dossierRepo = new DossierRepository();
            const partijRepo = new PartijRepository();

            // Check dossier access
            const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
            if (!hasAccess) {
                // Instead of returning 403, return empty array to prevent console spam
                // This happens when frontend tries to load partijen for all visible dossiers
                // but user only has access to some (e.g. via different relationships)
                return createSuccessResponse([]);
            }

            // Get partijen
            partijen = await partijRepo.findByDossierId(dossierId);
        } else {
            // LEGACY: Use old DossierDatabaseService
            await dbService!.initialize();

            // Check dossier access
            const hasAccess = await dbService!.checkDossierAccess(dossierId, userId);
            if (!hasAccess) {
                return createSuccessResponse([]);
            }

            // Get partijen with IDs
            partijen = await dbService!.getPartijListWithId(dossierId);
        }

        return createSuccessResponse(partijen);

    } catch (error) {
        return createErrorResponse('Internal server error', 500);
    } finally {
        if (dbService) {
            await dbService.close();
        }
    }
}

app.http('getDossierPartijen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/partijen',
    handler: getDossierPartijen,
});
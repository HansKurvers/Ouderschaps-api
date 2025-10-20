import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { DossierRepository, PartijRepository } from '../../repositories';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

// Feature flag: Use new Repository Pattern or legacy DossierDatabaseService
const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function removePartijFromDossier(
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

        // Get dossier ID and partij ID from route
        const dossierId = parseInt(request.params.dossierId || '');
        const partijId = parseInt(request.params.partijId || '');

        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        if (!partijId || isNaN(partijId)) {
            return createErrorResponse('Invalid partij ID', 400);
        }

        let success;

        if (USE_REPOSITORY_PATTERN) {
            // NEW: Use Repository Pattern
            const dossierRepo = new DossierRepository();
            const partijRepo = new PartijRepository();

            // Check dossier access
            const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied', 403);
            }

            // Check if partij exists in this dossier
            const partijData = await partijRepo.findById(dossierId, partijId);
            if (!partijData) {
                return createErrorResponse('Partij not found in this dossier', 404);
            }

            // Remove partij from dossier
            success = await partijRepo.delete(dossierId, partijId);
        } else {
            // LEGACY: Use old DossierDatabaseService
            await dbService!.initialize();

            // Check dossier access
            const hasAccess = await dbService!.checkDossierAccess(dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied', 403);
            }

            // Check if partij exists in this dossier
            const partijData = await dbService!.getPartijById(dossierId, partijId);
            if (!partijData) {
                return createErrorResponse('Partij not found in this dossier', 404);
            }

            // Remove partij from dossier
            success = await dbService!.removePartijFromDossier(dossierId, partijId);
        }

        if (!success) {
            return createErrorResponse('Failed to remove partij from dossier', 500);
        }

        context.log(`Removed partij ${partijId} from dossier ${dossierId}`);
        return createSuccessResponse({ success: true });

    } catch (error) {
        context.error('Error in removePartijFromDossier:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        if (dbService) {
            await dbService.close();
        }
    }
}

app.http('removePartijFromDossier', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/partijen/{partijId}',
    handler: removePartijFromDossier,
});
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { DossierRepository, KindRepository } from '../../repositories';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

// Feature flag: Use new Repository Pattern or legacy DossierDatabaseService
const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function removeKindFromDossier(
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

        // Get dossier ID and kind ID from path
        const dossierId = Number(request.params.dossierId);
        const dossierKindId = Number(request.params.kindId); // Actually dossiers_kinderen.id

        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }
        if (!dossierKindId || isNaN(dossierKindId)) {
            return createErrorResponse('Invalid kind ID', 400);
        }

        let success;

        if (USE_REPOSITORY_PATTERN) {
            // NEW: Use Repository Pattern
            const dossierRepo = new DossierRepository();
            const kindRepo = new KindRepository();

            // Check dossier access
            const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied to this dossier', 403);
            }

            // Check if the kind relation exists
            const existingKind = await kindRepo.findById(dossierId, dossierKindId);
            if (!existingKind) {
                return createErrorResponse('Kind not found in this dossier', 404);
            }

            // Remove kind from dossier (only the link, not the person)
            success = await kindRepo.removeFromDossier(dossierId, dossierKindId);
        } else {
            // LEGACY: Use old DossierDatabaseService
            await dbService!.initialize();

            // Check dossier access
            const hasAccess = await dbService!.checkDossierAccess(dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied to this dossier', 403);
            }

            // Check if the kind relation exists
            const existingKind = await dbService!.getKindWithOudersById(dossierKindId);
            if (!existingKind) {
                return createErrorResponse('Kind not found in this dossier', 404);
            }

            // Remove kind from dossier (only the link, not the person)
            success = await dbService!.removeKindFromDossier(dossierId, dossierKindId);
        }

        if (!success) {
            return createErrorResponse('Failed to remove kind from dossier', 500);
        }

        context.log(`Kind ${dossierKindId} removed from dossier ${dossierId}`);
        return createSuccessResponse({ success: true });

    } catch (error) {
        context.error('Error in removeKindFromDossier:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        if (dbService) {
            await dbService.close();
        }
    }
}

app.http('removeKindFromDossier', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/kinderen/{kindId}',
    handler: removeKindFromDossier,
});
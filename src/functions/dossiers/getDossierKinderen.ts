import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { DossierRepository, KindRepository } from '../../repositories';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

// Feature flag: Use new Repository Pattern or legacy DossierDatabaseService
const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

export async function getDossierKinderen(
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

        // Get dossier ID from path
        const dossierId = Number(request.params.dossierId);
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        let kinderen;

        if (USE_REPOSITORY_PATTERN) {
            // NEW: Use Repository Pattern
            const dossierRepo = new DossierRepository();
            const kindRepo = new KindRepository();

            // Check dossier access
            const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied to this dossier', 403);
            }

            // Get kinderen for this dossier
            kinderen = await kindRepo.findByDossierId(dossierId);
        } else {
            // LEGACY: Use old DossierDatabaseService
            await dbService!.initialize();

            // Check dossier access
            const hasAccess = await dbService!.checkDossierAccess(dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied to this dossier', 403);
            }

            // Get kinderen for this dossier
            kinderen = await dbService!.getKinderen(dossierId);
        }

        context.log(`Retrieved ${kinderen.length} kinderen for dossier ${dossierId}`);
        return createSuccessResponse(kinderen);

    } catch (error) {
        context.error('Error in getDossierKinderen:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        if (dbService) {
            await dbService.close();
        }
    }
}

app.http('getDossierKinderen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/kinderen',
    handler: getDossierKinderen,
});
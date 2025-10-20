import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZorgRepository } from '../../repositories/ZorgRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

/**
 * HTTP function to get all zorg records for a dossier
 *
 * Route: GET /api/dossiers/{dossierId}/zorg
 *
 * Query Parameters (optional):
 * - categorieId: number - Filter by specific categorie
 *
 * Business Logic:
 * 1. Authenticate user
 * 2. Check dossier access
 * 3. Get zorg records (optionally filtered by categorie)
 *
 * Returns:
 * - 200: Array of ZorgWithLookups
 * - 401: Unauthorized
 * - 403: Access denied
 * - 500: Server error
 */
export async function getDossierZorg(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('GET Dossier Zorg endpoint called');

    const useRepository = process.env.USE_REPOSITORY_PATTERN === 'true';

    try {
        // Check authentication
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        // Get dossier ID from route
        const dossierId = parseInt(request.params.dossierId as string);
        if (isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Get optional categorieId filter from query
        const categorieIdParam = request.query.get('categorieId');
        const categorieId = categorieIdParam ? parseInt(categorieIdParam) : null;

        if (categorieIdParam && isNaN(categorieId!)) {
            return createErrorResponse('Invalid categorie ID', 400);
        }

        if (useRepository) {
            context.log('Using ZorgRepository pattern');

            const zorgRepo = new ZorgRepository();
            const dossierRepo = new DossierRepository();

            // Check dossier access
            const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied to this dossier', 403);
            }

            // Get zorg records
            const zorgRecords = categorieId
                ? await zorgRepo.findByCategorie(dossierId, categorieId)
                : await zorgRepo.findByDossierId(dossierId);

            context.log(`Found ${zorgRecords.length} zorg records for dossier ${dossierId}`);
            return createSuccessResponse(zorgRecords, 200);

        } else {
            context.log('Using Legacy DossierDatabaseService');
            return createErrorResponse('Legacy path not implemented yet', 501);
        }

    } catch (error) {
        context.error('Error in getDossierZorg:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

app.http('getDossierZorg', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/zorg',
    handler: getDossierZorg,
});

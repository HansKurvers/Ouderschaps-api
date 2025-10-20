import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OuderschapsplanRepository } from '../../repositories/OuderschapsplanRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

/**
 * HTTP function to get complete ouderschapsplan
 *
 * Route: GET /api/ouderschapsplan/{dossierId}
 *
 * This is THE MAIN ENDPOINT that orchestrates all repositories
 * to generate a complete parenting plan view.
 *
 * Returns:
 * - Dossier information
 * - All parties (parents/guardians)
 * - All children with their parent relationships
 * - Complete visitation schedule and entries
 * - All care arrangements
 * - All child support agreements
 * - Completeness validation
 * - Metadata and statistics
 *
 * Feature Flag: USE_REPOSITORY_PATTERN to switch between legacy and new implementation
 *
 * @param request HTTP request with dossierId in route params
 * @param context Invocation context for logging
 * @returns Complete ouderschapsplan with all related data
 */
export async function getCompletePlan(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        // Get and validate user ID
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            return createErrorResponse('Unauthorized', 401);
        }

        // Get and validate dossier ID
        const dossierId = parseInt(request.params.dossierId || '');
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        if (USE_REPOSITORY_PATTERN) {
            context.log('Using OuderschapsplanRepository pattern');

            const planRepo = new OuderschapsplanRepository();
            const dossierRepo = new DossierRepository();

            // Check user access to dossier
            const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied', 403);
            }

            // Get complete plan (orchestrates ALL repositories!)
            const plan = await planRepo.getCompletePlan(dossierId);

            context.log(`Retrieved complete plan for dossier ${dossierId}`);
            context.log(`Plan completeness: ${plan.metadata.volledigheid.percentageCompleet}%`);
            context.log(`Last modified: ${plan.metadata.laatstGewijzigd.toISOString()}`);
            context.log(`Partijen: ${plan.partijen.length}, Kinderen: ${plan.kinderen.length}`);
            context.log(`Omgang: ${plan.omgang.entries.length}, Zorg: ${plan.zorg.length}, Alimentatie: ${plan.alimentatie.length}`);

            return createSuccessResponse(plan);

        } else {
            context.log('Using Legacy DossierDatabaseService');
            return createErrorResponse('Legacy path not implemented for ouderschapsplan', 501);
        }
    } catch (error) {
        context.error('Error in getCompletePlan:', error);

        // Handle specific errors
        if (error instanceof Error) {
            if (error.message === 'Dossier not found') {
                return createErrorResponse('Dossier not found', 404);
            }
            return createErrorResponse(error.message, 500);
        }

        return createErrorResponse('Internal server error', 500);
    }
}

app.http('getCompletePlan', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'ouderschapsplan/{dossierId}',
    handler: getCompletePlan,
});

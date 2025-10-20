import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OuderschapsplanRepository } from '../../repositories/OuderschapsplanRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

/**
 * HTTP function to get ouderschapsplan metadata
 *
 * Route: GET /api/ouderschapsplan/{dossierId}/metadata
 *
 * Returns metadata only without fetching all plan data.
 * Efficient way to check completeness and last modified date.
 *
 * Returns:
 * - Completeness validation
 * - Last modified date
 * - Number of complete sections
 * - Total sections count
 *
 * Use this when you only need metadata without all the plan data.
 *
 * Feature Flag: USE_REPOSITORY_PATTERN to switch between legacy and new implementation
 *
 * @param request HTTP request with dossierId in route params
 * @param context Invocation context for logging
 * @returns Plan metadata with completeness and stats
 */
export async function getPlanMetadata(
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

            // Get plan metadata
            const metadata = await planRepo.getPlanMetadata(dossierId);

            context.log(`Retrieved metadata for dossier ${dossierId}`);
            context.log(`Completeness: ${metadata.volledigheid.percentageCompleet}%`);
            context.log(`Sections complete: ${metadata.aantalSectiesCompleet}/${metadata.totaalSecties}`);
            context.log(`Last modified: ${metadata.laatstGewijzigd.toISOString()}`);

            return createSuccessResponse(metadata);

        } else {
            context.log('Using Legacy DossierDatabaseService');
            return createErrorResponse('Legacy path not implemented for ouderschapsplan', 501);
        }
    } catch (error) {
        context.error('Error in getPlanMetadata:', error);

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

app.http('getPlanMetadata', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'ouderschapsplan/{dossierId}/metadata',
    handler: getPlanMetadata,
});

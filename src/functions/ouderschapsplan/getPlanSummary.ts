import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OuderschapsplanRepository } from '../../repositories/OuderschapsplanRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

/**
 * HTTP function to get ouderschapsplan summary
 *
 * Route: GET /api/ouderschapsplan/{dossierId}/summary
 *
 * Returns a summary view with counts instead of full data.
 * More efficient than getCompletePlan for list/overview views.
 *
 * Returns:
 * - Basic dossier info
 * - Counts for each section
 * - Completeness percentage
 * - Last modified date
 *
 * Feature Flag: USE_REPOSITORY_PATTERN to switch between legacy and new implementation
 *
 * @param request HTTP request with dossierId in route params
 * @param context Invocation context for logging
 * @returns Ouderschapsplan summary with counts
 */
export async function getPlanSummary(
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

            // Get plan summary (counts only, more efficient)
            const summary = await planRepo.getPlanSummary(dossierId);

            context.log(`Retrieved summary for dossier ${dossierId}`);
            context.log(`Summary: ${summary.aantalPartijen} partijen, ${summary.aantalKinderen} kinderen`);
            context.log(`Completeness: ${summary.volledigheid.percentageCompleet}%`);

            return createSuccessResponse(summary);

        } else {
            context.log('Using Legacy DossierDatabaseService');
            return createErrorResponse('Legacy path not implemented for ouderschapsplan', 501);
        }
    } catch (error) {
        context.error('Error in getPlanSummary:', error);

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

app.http('getPlanSummary', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'ouderschapsplan/{dossierId}/summary',
    handler: getPlanSummary,
});

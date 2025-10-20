import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OuderschapsplanRepository } from '../../repositories/OuderschapsplanRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

/**
 * HTTP function to validate ouderschapsplan completeness
 *
 * Route: GET /api/ouderschapsplan/{dossierId}/validate
 *
 * Validates if all required sections are filled according to business rules:
 * - Requires at least 2 parties (both parents)
 * - Requires at least 1 child
 * - Requires at least 1 visitation arrangement
 * - Requires at least 1 care arrangement
 * - Child support is optional
 *
 * Returns detailed validation including percentage complete.
 *
 * Feature Flag: USE_REPOSITORY_PATTERN to switch between legacy and new implementation
 *
 * @param request HTTP request with dossierId in route params
 * @param context Invocation context for logging
 * @returns Completeness validation with percentage
 */
export async function validatePlan(
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

            // Validate plan completeness
            const volledigheid = await planRepo.validatePlanCompleteness(dossierId);

            context.log(`Validated plan for dossier ${dossierId}`);
            context.log(`Completeness: ${volledigheid.percentageCompleet}% (${volledigheid.isCompleet ? 'COMPLETE' : 'INCOMPLETE'})`);
            context.log(`Partijen: ${volledigheid.heeftPartijen}, Kinderen: ${volledigheid.heeftKinderen}`);
            context.log(`Omgang: ${volledigheid.heeftOmgang}, Zorg: ${volledigheid.heeftZorg}, Alimentatie: ${volledigheid.heeftAlimentatie}`);

            return createSuccessResponse(volledigheid);

        } else {
            context.log('Using Legacy DossierDatabaseService');
            return createErrorResponse('Legacy path not implemented for ouderschapsplan', 501);
        }
    } catch (error) {
        context.error('Error in validatePlan:', error);

        // Handle specific errors
        if (error instanceof Error) {
            return createErrorResponse(error.message, 500);
        }

        return createErrorResponse('Internal server error', 500);
    }
}

app.http('validatePlan', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'ouderschapsplan/{dossierId}/validate',
    handler: validatePlan,
});

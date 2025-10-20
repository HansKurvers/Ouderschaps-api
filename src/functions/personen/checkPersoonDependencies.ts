import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { PersoonRepository } from '../../repositories/PersoonRepository';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

/**
 * Check if a person has dependencies before deletion
 * GET /api/personen/{persoonId}/dependencies
 *
 * Returns dependency information to help UI show warnings
 */
export async function checkPersoonDependencies(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('Check persoon dependencies endpoint called');

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

        const repository = new PersoonRepository();

        // Check if persoon exists and belongs to this user
        const existingPersoon = await repository.findByIdForUser(persoonId, userId);
        if (!existingPersoon) {
            return createErrorResponse('Persoon not found', 404);
        }

        // Check dependencies
        const dependencyInfo = await repository.checkDependencies(persoonId);

        context.log(`Dependency check for persoon ${persoonId}:`, dependencyInfo);
        return createSuccessResponse(dependencyInfo);

    } catch (error) {
        context.error('Error in checkPersoonDependencies:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

app.http('checkPersoonDependencies', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'personen/{persoonId}/dependencies',
    handler: checkPersoonDependencies,
});

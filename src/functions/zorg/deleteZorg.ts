import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZorgRepository } from '../../repositories/ZorgRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

/**
 * HTTP function to delete a zorg record
 *
 * Route: DELETE /api/zorg/{zorgId}
 *
 * Business Logic:
 * 1. Authenticate user
 * 2. Check zorg exists and get its dossier
 * 3. Check dossier access
 * 4. Delete zorg record
 *
 * Returns:
 * - 200: Zorg deleted successfully
 * - 401: Unauthorized
 * - 403: Access denied
 * - 404: Zorg not found
 * - 500: Server error
 */
export async function deleteZorg(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Zorg endpoint called');

    const useRepository = process.env.USE_REPOSITORY_PATTERN === 'true';

    try {
        // Check authentication
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        // Get zorg ID from route
        const zorgId = parseInt(request.params.zorgId as string);
        if (isNaN(zorgId)) {
            return createErrorResponse('Invalid zorg ID', 400);
        }

        if (useRepository) {
            context.log('Using ZorgRepository pattern');

            const zorgRepo = new ZorgRepository();
            const dossierRepo = new DossierRepository();

            // Check if zorg exists and get its dossier
            const existingZorg = await zorgRepo.findById(zorgId);
            if (!existingZorg) {
                return createErrorResponse('Zorg not found', 404);
            }

            // Check dossier access
            const hasAccess = await dossierRepo.checkAccess(existingZorg.zorg.dossierId, userId);
            if (!hasAccess) {
                return createErrorResponse('Access denied to this dossier', 403);
            }

            // Delete zorg record
            const deleted = await zorgRepo.delete(zorgId);

            if (!deleted) {
                return createErrorResponse('Failed to delete zorg', 500);
            }

            context.log(`Deleted zorg with ID: ${zorgId}`);
            return createSuccessResponse({ message: 'Zorg deleted successfully' }, 200);

        } else {
            context.log('Using Legacy DossierDatabaseService');
            return createErrorResponse('Legacy path not implemented yet', 501);
        }

    } catch (error) {
        context.error('Error in deleteZorg:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

app.http('deleteZorg', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'zorg/{zorgId}',
    handler: deleteZorg,
});

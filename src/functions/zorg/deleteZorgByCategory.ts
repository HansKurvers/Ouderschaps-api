import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZorgRepository } from '../../repositories/ZorgRepository';
import { DossierRepository } from '../../repositories/DossierRepository';
import { createSuccessResponse, createErrorResponse, createUnauthorizedResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

/**
 * HTTP function to delete all zorg records for a specific categorie within a dossier
 *
 * Route: DELETE /api/dossiers/{dossierId}/zorg/category/{categoryId}
 *
 * Use Case:
 * - "Reset" functionality for clearing all arrangements of a specific type
 * - User wants to start fresh with vacation arrangements (categoryId = 6)
 * - Triggered from frontend "Alles wissen" button in ZorgRegelingenStep
 *
 * Business Logic:
 * 1. Authenticate user
 * 2. Validate route parameters (dossierId, categoryId)
 * 3. Check dossier access (user must own the dossier)
 * 4. Delete all zorg records matching dossier + category
 * 5. Return number of deleted records
 *
 * Returns:
 * - 200: { deleted: number, message: string, categoryId: number, dossierId: number }
 * - 400: Invalid parameters
 * - 401: Unauthorized
 * - 403: Access denied
 * - 500: Server error
 */
export async function deleteZorgByCategory(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Zorg by Category endpoint called');

    const useRepository = process.env.USE_REPOSITORY_PATTERN === 'true';

    try {
        // 1. Authenticate user
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            return createUnauthorizedResponse();
        }

        // 2. Validate route parameters
        const dossierId = parseInt(request.params.dossierId as string);
        if (isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        const categoryId = parseInt(request.params.categoryId as string);
        if (isNaN(categoryId)) {
            return createErrorResponse('Invalid category ID', 400);
        }

        if (useRepository) {
            context.log(`Using ZorgRepository pattern - User ${userId}, Dossier ${dossierId}, Category ${categoryId}`);

            const zorgRepo = new ZorgRepository();
            const dossierRepo = new DossierRepository();

            // 3. Check dossier access (user must own the dossier)
            const hasAccess = await dossierRepo.checkAccess(dossierId, userId);
            if (!hasAccess) {
                context.warn(`Access denied: User ${userId} attempted to delete zorg from dossier ${dossierId}`);
                return createErrorResponse('Access denied to this dossier', 403);
            }

            // 4. Delete all zorg records for this category
            const deletedCount = await zorgRepo.deleteByCategorie(dossierId, categoryId);

            context.log(`Successfully deleted ${deletedCount} zorg records for category ${categoryId} in dossier ${dossierId}`);

            // 5. Return success response with detailed info
            return createSuccessResponse({
                deleted: deletedCount,
                message: deletedCount === 0
                    ? 'No zorg records found for this category'
                    : `Successfully deleted ${deletedCount} zorg record${deletedCount === 1 ? '' : 's'}`,
                categoryId,
                dossierId
            }, 200);

        } else {
            context.log('Using Legacy DossierDatabaseService');
            return createErrorResponse('Legacy path not implemented yet', 501);
        }

    } catch (error) {
        context.error('Error in deleteZorgByCategory:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

app.http('deleteZorgByCategory', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/zorg/category/{categoryId}',
    handler: deleteZorgByCategory,
});

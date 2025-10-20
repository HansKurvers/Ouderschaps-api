import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZorgRepository } from '../../repositories/ZorgRepository';
import { DossierDatabaseService } from '../../services/database-service';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * HTTP function to get zorg situaties (lookup data)
 *
 * Route: GET /api/lookups/zorg-situaties
 *
 * Query Parameters:
 * - categorieId: number (optional) - Filter situaties by categorie
 * - excludeCategories: string (optional) - Comma-separated list of categorie IDs to exclude (legacy)
 *
 * Business Logic:
 * 1. Parse query parameters
 * 2. Get situaties filtered by categorie (if provided)
 * 3. Return filtered list
 *
 * Returns:
 * - 200: Array of ZorgSituatie
 * - 400: Invalid parameter
 * - 500: Server error
 *
 * Note: This is lookup/reference data for dropdown lists
 * Feature Flag: USE_REPOSITORY_PATTERN to switch between legacy and new implementation
 */
export async function getZorgSituaties(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const useRepository = process.env.USE_REPOSITORY_PATTERN === 'true';

    try {
        // Get optional categorieId filter from query params (new API uses 'categorieId')
        let categorieIdParam = request.query.get('categorieId');

        // Legacy support: also check 'categoryId' (old parameter name)
        if (!categorieIdParam) {
            categorieIdParam = request.query.get('categoryId');
        }

        let categorieId: number | undefined;

        if (categorieIdParam) {
            categorieId = Number(categorieIdParam);
            if (isNaN(categorieId)) {
                return createErrorResponse('Invalid categorieId parameter', 400);
            }
        }

        // Get optional excludeCategories filter from query params (legacy feature)
        const excludeCategoriesParam = request.query.get('excludeCategories');
        let excludeCategories: number[] | undefined;

        if (excludeCategoriesParam) {
            // Parse comma-separated list of category IDs
            try {
                excludeCategories = excludeCategoriesParam.split(',').map(id => {
                    const num = Number(id.trim());
                    if (isNaN(num)) {
                        throw new Error(`Invalid category ID: ${id}`);
                    }
                    return num;
                });
            } catch (parseError) {
                return createErrorResponse('Invalid excludeCategories parameter. Must be comma-separated numbers', 400);
            }
        }

        let zorgSituaties: Array<{id: number, naam: string, zorgCategorieId?: number}>;

        if (useRepository) {
            context.log('Using ZorgRepository pattern');
            const zorgRepo = new ZorgRepository();

            // Note: Repository pattern doesn't support excludeCategories filter
            // If categorieId is provided, get situaties for that categorie
            if (categorieId) {
                zorgSituaties = await zorgRepo.getSituatiesForCategorie(categorieId);
            } else {
                // If no filter, we need to get all situaties
                // For now, we'll use a dummy high categorieId to get universal situaties
                // TODO: Add getAllSituaties() method to repository
                context.log('Warning: Getting all situaties not fully implemented in repository pattern');
                zorgSituaties = await zorgRepo.getSituatiesForCategorie(999999);
            }

        } else {
            context.log('Using Legacy DossierDatabaseService');
            const dbService = new DossierDatabaseService();
            try {
                await dbService.initialize();
                zorgSituaties = await dbService.getZorgSituaties(categorieId, excludeCategories);
            } finally {
                await dbService.close();
            }
        }

        context.log(`Retrieved ${zorgSituaties.length} zorg situaties${categorieId ? ` for categorie ${categorieId}` : ''}${excludeCategories ? ` excluding categories ${excludeCategories.join(',')}` : ''}`);
        return createSuccessResponse(zorgSituaties);

    } catch (error) {
        context.error('Error in getZorgSituaties:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

app.http('getZorgSituaties', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/zorg-situaties',
    handler: getZorgSituaties,
});

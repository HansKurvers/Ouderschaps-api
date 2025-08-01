import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';

export async function getZorgSituaties(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get optional categorieId filter from query params
        const categorieIdParam = request.query.get('categorieId');
        let categorieId: number | undefined;
        
        if (categorieIdParam) {
            categorieId = Number(categorieIdParam);
            if (isNaN(categorieId)) {
                return createErrorResponse('Invalid categorieId parameter', 400);
            }
        }

        // Get optional excludeCategories filter from query params
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

        // Initialize database connection
        await dbService.initialize();

        // Get zorg situaties from database (with optional filters)
        const zorgSituaties = await dbService.getZorgSituaties(categorieId, excludeCategories);

        context.log(`Retrieved ${zorgSituaties.length} zorg situaties from database${categorieId ? ` for categorie ${categorieId}` : ''}${excludeCategories ? ` excluding categories ${excludeCategories.join(',')}` : ''}`);
        return createSuccessResponse(zorgSituaties);

    } catch (error) {
        context.error('Error in getZorgSituaties:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getZorgSituaties', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/zorg-situaties',
    handler: getZorgSituaties,
});
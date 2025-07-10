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

        // Initialize database connection
        await dbService.initialize();

        // Get zorg situaties from database (with optional filter)
        const zorgSituaties = await dbService.getZorgSituaties(categorieId);

        context.log(`Retrieved ${zorgSituaties.length} zorg situaties from database${categorieId ? ` for categorie ${categorieId}` : ''}`);
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
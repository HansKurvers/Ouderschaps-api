import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';

// In-memory cache for zorg categorieën
let zorgCategorieenCache: Array<{id: number, naam: string}> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearZorgCategorieenCache(): void {
    zorgCategorieenCache = null;
    cacheTimestamp = null;
}

export async function getZorgCategorieen(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Check if we have valid cached data
    const now = Date.now();
    if (zorgCategorieenCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached zorg categorieën data');
        return createSuccessResponse(zorgCategorieenCache);
    }

    const dbService = new DossierDatabaseService();

    try {
        // Initialize database connection
        await dbService.initialize();

        // Get zorg categorieën from database
        const zorgCategorieen = await dbService.getZorgCategorieen();

        // Update cache
        zorgCategorieenCache = zorgCategorieen;
        cacheTimestamp = now;

        context.log(`Retrieved ${zorgCategorieen.length} zorg categorieën from database`);
        return createSuccessResponse(zorgCategorieen);

    } catch (error) {
        context.error('Error in getZorgCategorieen:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getZorgCategorieen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/zorg-categorieen',
    handler: getZorgCategorieen,
});
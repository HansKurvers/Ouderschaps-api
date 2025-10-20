import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { ZorgRepository } from '../../repositories/ZorgRepository';
import { DossierDatabaseService } from '../../services/database-service';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

// In-memory cache for zorg categorieën
let zorgCategorieenCache: Array<{id: number, naam: string}> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearZorgCategorieenCache(): void {
    zorgCategorieenCache = null;
    cacheTimestamp = null;
}

/**
 * HTTP function to get all zorg categoriën (lookup data)
 *
 * Route: GET /api/lookups/zorg-categorieen
 *
 * Business Logic:
 * 1. Check cache for valid data
 * 2. If cache miss, get all zorg categoriën from database
 * 3. Cache results for 5 minutes
 *
 * Returns:
 * - 200: Array of ZorgCategorie
 * - 500: Server error
 *
 * Note: This is lookup/reference data for dropdown lists
 * Feature Flag: USE_REPOSITORY_PATTERN to switch between legacy and new implementation
 */
export async function getZorgCategorieen(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const useRepository = process.env.USE_REPOSITORY_PATTERN === 'true';

    // Check if we have valid cached data
    const now = Date.now();
    if (zorgCategorieenCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached zorg categorieën data');
        return createSuccessResponse(zorgCategorieenCache);
    }

    try {
        let zorgCategorieen: Array<{id: number, naam: string}>;

        if (useRepository) {
            context.log('Using ZorgRepository pattern');
            const zorgRepo = new ZorgRepository();
            zorgCategorieen = await zorgRepo.getAllCategorieen();
        } else {
            context.log('Using Legacy DossierDatabaseService');
            const dbService = new DossierDatabaseService();
            try {
                await dbService.initialize();
                zorgCategorieen = await dbService.getZorgCategorieen();
            } finally {
                await dbService.close();
            }
        }

        // Update cache
        zorgCategorieenCache = zorgCategorieen;
        cacheTimestamp = now;

        context.log(`Retrieved ${zorgCategorieen.length} zorg categorieën`);
        return createSuccessResponse(zorgCategorieen);

    } catch (error) {
        context.error('Error in getZorgCategorieen:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

app.http('getZorgCategorieen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/zorg-categorieen',
    handler: getZorgCategorieen,
});

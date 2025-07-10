import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { RelatieType } from '../../models/Dossier';

// In-memory cache for relatie types
let relatieTypesCache: RelatieType[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearRelatieTypesCache(): void {
    relatieTypesCache = null;
    cacheTimestamp = null;
}

export async function getRelatieTypes(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Check if we have valid cached data
    const now = Date.now();
    if (relatieTypesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached relatie types data');
        return createSuccessResponse(relatieTypesCache);
    }

    const dbService = new DossierDatabaseService();

    try {
        // Initialize database connection
        await dbService.initialize();

        // Get relatie types from database
        const relatieTypes = await dbService.getRelatieTypes();

        // Update cache
        relatieTypesCache = relatieTypes;
        cacheTimestamp = now;

        context.log(`Retrieved ${relatieTypes.length} relatie types from database`);
        return createSuccessResponse(relatieTypes);

    } catch (error) {
        context.error('Error in getRelatieTypes:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getRelatieTypes', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/relatie-types',
    handler: getRelatieTypes,
});
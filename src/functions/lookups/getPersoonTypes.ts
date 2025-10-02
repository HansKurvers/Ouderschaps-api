import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';

// In-memory cache for persoon types
let persoonTypesCache: any[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearPersoonTypesCache(): void {
    persoonTypesCache = null;
    cacheTimestamp = null;
}

export async function getPersoonTypes(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Check if we have valid cached data
    const now = Date.now();
    if (persoonTypesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached persoon types data');
        return createSuccessResponse(persoonTypesCache);
    }

    const dbService = new DossierDatabaseService();

    try {
        // Initialize database connection
        await dbService.initialize();

        // Get persoon types from database
        const persoonTypes = await dbService.getPersoonTypes();

        // Update cache
        persoonTypesCache = persoonTypes;
        cacheTimestamp = now;

        context.log(`Retrieved ${persoonTypes.length} persoon types from database`);
        return createSuccessResponse(persoonTypes);

    } catch (error) {
        context.error('Error in getPersoonTypes:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getPersoonTypes', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'persoon-types',
    handler: getPersoonTypes,
});

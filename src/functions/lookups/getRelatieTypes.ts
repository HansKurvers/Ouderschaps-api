import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { LookupRepository } from '../../repositories/LookupRepository';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { RelatieType } from '../../models/Dossier';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

// In-memory cache for relatie types (30-minute cache for lookup data)
let relatieTypesCache: RelatieType[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearRelatieTypesCache(): void {
    relatieTypesCache = null;
    cacheTimestamp = null;
}

/**
 * HTTP function to get all relationship types (lookup data)
 *
 * Route: GET /api/lookups/relatie-types
 *
 * Business Logic:
 * 1. Check cache for valid data (30 minutes)
 * 2. If cache miss, get all relationship types from repository
 * 3. Cache results
 *
 * Returns:
 * - 200: Array of RelatieType
 * - 500: Server error
 *
 * Note: This is lookup/reference data for dropdown lists
 * Feature Flag: USE_REPOSITORY_PATTERN to switch between legacy and new implementation
 */
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

    try {
        let relatieTypes: RelatieType[];

        if (USE_REPOSITORY_PATTERN) {
            context.log('Using LookupRepository pattern');
            const lookupRepo = new LookupRepository();
            relatieTypes = await lookupRepo.getRelatieTypes();
        } else {
            context.log('Using Legacy DossierDatabaseService');
            const dbService = new DossierDatabaseService();
            try {
                await dbService.initialize();
                relatieTypes = await dbService.getRelatieTypes();
            } finally {
                await dbService.close();
            }
        }

        // Update cache
        relatieTypesCache = relatieTypes;
        cacheTimestamp = now;

        context.log(`Retrieved ${relatieTypes.length} relatie types`);
        return createSuccessResponse(relatieTypes);

    } catch (error) {
        context.error('Error in getRelatieTypes:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

app.http('getRelatieTypes', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/relatie-types',
    handler: getRelatieTypes,
});
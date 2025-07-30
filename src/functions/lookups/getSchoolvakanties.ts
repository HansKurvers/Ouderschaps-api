import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { Schoolvakantie } from '../../models/Dossier';

// In-memory cache for schoolvakanties
let schoolvakantiesCache: Schoolvakantie[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearSchoolvakanties

(): void {
    schoolvakantiesCache = null;
    cacheTimestamp = null;
}

export async function getSchoolvakanties(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Check if we have valid cached data
    const now = Date.now();
    if (schoolvakantiesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached schoolvakanties data');
        return createSuccessResponse(schoolvakantiesCache);
    }

    const dbService = new DossierDatabaseService();

    try {
        // Initialize database connection
        await dbService.initialize();

        // Get schoolvakanties from database
        const schoolvakanties = await dbService.getSchoolvakanties();

        // Update cache
        schoolvakantiesCache = schoolvakanties;
        cacheTimestamp = now;

        context.log(`Retrieved ${schoolvakanties.length} schoolvakanties from database`);
        return createSuccessResponse(schoolvakanties);

    } catch (error) {
        context.error('Error in getSchoolvakanties:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getSchoolvakanties', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/schoolvakanties',
    handler: getSchoolvakanties,
});
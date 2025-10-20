import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { LookupRepository } from '../../repositories/LookupRepository';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

// In-memory cache for dagen
let dagenCache: Array<{id: number, naam: string}> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearDagenCache(): void {
    dagenCache = null;
    cacheTimestamp = null;
}

export async function getDagen(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Check if we have valid cached data
    const now = Date.now();
    if (dagenCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached dagen data');
        return createSuccessResponse(dagenCache);
    }

    try {
        if (USE_REPOSITORY_PATTERN) {
            const lookupRepository = new LookupRepository();

            // Get dagen from repository
            const dagen = await lookupRepository.getAllDagen();

            // Update cache
            dagenCache = dagen;
            cacheTimestamp = now;

            context.log(`Retrieved ${dagen.length} dagen from repository`);
            return createSuccessResponse(dagen);
        } else {
            // Legacy path using DossierDatabaseService
            const dbService = new DossierDatabaseService();

            try {
                // Initialize database connection
                await dbService.initialize();

                // Get dagen from database
                const dagen = await dbService.getDagen();

                // Update cache
                dagenCache = dagen;
                cacheTimestamp = now;

                context.log(`Retrieved ${dagen.length} dagen from database`);
                return createSuccessResponse(dagen);
            } finally {
                await dbService.close();
            }
        }

    } catch (error) {
        context.error('Error in getDagen:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

app.http('getDagen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/dagen',
    handler: getDagen,
});
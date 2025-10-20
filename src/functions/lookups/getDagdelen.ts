import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { LookupRepository } from '../../repositories/LookupRepository';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

// In-memory cache for dagdelen
let dagdelenCache: Array<{id: number, naam: string}> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearDagdelenCache(): void {
    dagdelenCache = null;
    cacheTimestamp = null;
}

export async function getDagdelen(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Check if we have valid cached data
    const now = Date.now();
    if (dagdelenCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached dagdelen data');
        return createSuccessResponse(dagdelenCache);
    }

    try {
        if (USE_REPOSITORY_PATTERN) {
            const lookupRepository = new LookupRepository();

            // Get dagdelen from repository
            const dagdelen = await lookupRepository.getAllDagdelen();

            // Update cache
            dagdelenCache = dagdelen;
            cacheTimestamp = now;

            context.log(`Retrieved ${dagdelen.length} dagdelen from repository`);
            return createSuccessResponse(dagdelen);
        } else {
            // Legacy path using DossierDatabaseService
            const dbService = new DossierDatabaseService();

            try {
                // Initialize database connection
                await dbService.initialize();

                // Get dagdelen from database
                const dagdelen = await dbService.getDagdelen();

                // Update cache
                dagdelenCache = dagdelen;
                cacheTimestamp = now;

                context.log(`Retrieved ${dagdelen.length} dagdelen from database`);
                return createSuccessResponse(dagdelen);
            } finally {
                await dbService.close();
            }
        }

    } catch (error) {
        context.error('Error in getDagdelen:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

app.http('getDagdelen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/dagdelen',
    handler: getDagdelen,
});
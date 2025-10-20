import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OmgangRepository } from '../../repositories/OmgangRepository';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

// In-memory cache for week regelingen
let weekRegelingenCache: Array<{id: number, omschrijving: string}> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearWeekRegelingenCache(): void {
    weekRegelingenCache = null;
    cacheTimestamp = null;
}

export async function getWeekRegelingen(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Check if we have valid cached data
    const now = Date.now();
    if (weekRegelingenCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached week regelingen data');
        return createSuccessResponse(weekRegelingenCache);
    }

    const dbService = new DossierDatabaseService();
    let omgangRepository: OmgangRepository | undefined;

    try {
        if (USE_REPOSITORY_PATTERN) {
            omgangRepository = new OmgangRepository();

            // Get week regelingen from repository
            const weekRegelingen = await omgangRepository.getAllWeekRegelingen();

            // Update cache
            weekRegelingenCache = weekRegelingen;
            cacheTimestamp = now;

            context.log(`Retrieved ${weekRegelingen.length} week regelingen from repository`);
            return createSuccessResponse(weekRegelingen);
        } else {
            // Initialize database connection
            await dbService.initialize();

            // Get week regelingen from database
            const weekRegelingen = await dbService.getWeekRegelingen();

            // Update cache
            weekRegelingenCache = weekRegelingen;
            cacheTimestamp = now;

            context.log(`Retrieved ${weekRegelingen.length} week regelingen from database`);
            return createSuccessResponse(weekRegelingen);
        }

    } catch (error) {
        context.error('Error in getWeekRegelingen:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getWeekRegelingen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/week-regelingen',
    handler: getWeekRegelingen,
});
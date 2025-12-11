import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { LookupRepository } from '../../repositories/LookupRepository';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';

// In-memory cache for pensioen uitvoerders (keyed by geschiktVoor filter)
const pensioenUitvoerdersCache: Map<string, Array<{ id: number; naam: string; type: string; categorie?: string; geschiktVoor?: string }>> = new Map();
const cacheTimestamps: Map<string, number> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes or after sync)
export function clearPensioenUitvoerdersCache(): void {
    pensioenUitvoerdersCache.clear();
    cacheTimestamps.clear();
}

export async function getPensioenUitvoerders(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Get query parameters
    const type = request.query.get('type') || undefined;
    const search = request.query.get('search') || undefined;
    const includeInactive = request.query.get('includeInactive') === 'true';
    const geschiktVoor = request.query.get('geschiktVoor') || undefined;

    // Create cache key based on geschiktVoor filter (cache per filter value)
    const cacheKey = geschiktVoor || '_all_';

    // Only use cache for requests without type, search, or includeInactive filters
    const useCache = !type && !search && !includeInactive;

    // Check if we have valid cached data
    const now = Date.now();
    const cachedTimestamp = cacheTimestamps.get(cacheKey);
    const cachedData = pensioenUitvoerdersCache.get(cacheKey);

    if (useCache && cachedData && cachedTimestamp && (now - cachedTimestamp) < CACHE_DURATION) {
        context.log(`Returning cached pensioen uitvoerders data for key: ${cacheKey}`);
        return createSuccessResponse(cachedData);
    }

    try {
        const lookupRepository = new LookupRepository();

        // Get pensioen uitvoerders from repository
        const pensioenUitvoerders = await lookupRepository.getPensioenUitvoerders({
            type,
            search,
            includeInactive,
            geschiktVoor
        });

        // Update cache for this geschiktVoor filter
        if (useCache) {
            pensioenUitvoerdersCache.set(cacheKey, pensioenUitvoerders);
            cacheTimestamps.set(cacheKey, now);
        }

        context.log(`Retrieved ${pensioenUitvoerders.length} pensioen uitvoerders from repository (filter: ${geschiktVoor || 'none'})`);
        return createSuccessResponse(pensioenUitvoerders);

    } catch (error) {
        context.error('Error in getPensioenUitvoerders:', error);
        return createErrorResponse('Internal server error', 500);
    }
}

app.http('getPensioenUitvoerders', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'pensioen-uitvoerders',
    handler: getPensioenUitvoerders,
});

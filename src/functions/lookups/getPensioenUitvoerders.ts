import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { LookupRepository } from '../../repositories/LookupRepository';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';

// In-memory cache for pensioen uitvoerders
let pensioenUitvoerdersCache: Array<{ id: number; naam: string; type: string }> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes or after sync)
export function clearPensioenUitvoerdersCache(): void {
    pensioenUitvoerdersCache = null;
    cacheTimestamp = null;
}

export async function getPensioenUitvoerders(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Get query parameters
    const type = request.query.get('type') || undefined;
    const search = request.query.get('search') || undefined;
    const includeInactive = request.query.get('includeInactive') === 'true';

    // Only use cache for unfiltered requests
    const useCache = !type && !search && !includeInactive;

    // Check if we have valid cached data (only for unfiltered requests)
    const now = Date.now();
    if (useCache && pensioenUitvoerdersCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached pensioen uitvoerders data');
        return createSuccessResponse(pensioenUitvoerdersCache);
    }

    try {
        const lookupRepository = new LookupRepository();

        // Get pensioen uitvoerders from repository
        const pensioenUitvoerders = await lookupRepository.getPensioenUitvoerders({
            type,
            search,
            includeInactive
        });

        // Update cache only for unfiltered requests
        if (useCache) {
            pensioenUitvoerdersCache = pensioenUitvoerders;
            cacheTimestamp = now;
        }

        context.log(`Retrieved ${pensioenUitvoerders.length} pensioen uitvoerders from repository`);
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

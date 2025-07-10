import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { Rol } from '../../models/Dossier';

// In-memory cache for roles
let rollenCache: Rol[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearRollenCache(): void {
    rollenCache = null;
    cacheTimestamp = null;
}

export async function getRollen(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Check if we have valid cached data
    const now = Date.now();
    if (rollenCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached roles data');
        return createSuccessResponse(rollenCache);
    }

    const dbService = new DossierDatabaseService();

    try {
        // Initialize database connection
        await dbService.initialize();

        // Get roles from database
        const rollen = await dbService.getRollen();

        // Update cache
        rollenCache = rollen;
        cacheTimestamp = now;

        context.log(`Retrieved ${rollen.length} roles from database`);
        return createSuccessResponse(rollen);

    } catch (error) {
        context.error('Error in getRollen:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getRollen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'rollen',
    handler: getRollen,
});
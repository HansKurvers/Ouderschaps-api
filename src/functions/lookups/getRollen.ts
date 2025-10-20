import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { LookupRepository } from '../../repositories/LookupRepository';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { Rol } from '../../models/Dossier';

const USE_REPOSITORY_PATTERN = process.env.USE_REPOSITORY_PATTERN === 'true';

// In-memory cache for roles (30-minute cache for lookup data)
let rollenCache: Rol[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearRollenCache(): void {
    rollenCache = null;
    cacheTimestamp = null;
}

/**
 * HTTP function to get all roles (lookup data)
 *
 * Route: GET /api/rollen
 *
 * Business Logic:
 * 1. Check cache for valid data (30 minutes)
 * 2. If cache miss, get all roles from repository
 * 3. Cache results
 *
 * Returns:
 * - 200: Array of Rol
 * - 500: Server error
 *
 * Note: This is lookup/reference data for dropdown lists
 * Feature Flag: USE_REPOSITORY_PATTERN to switch between legacy and new implementation
 */
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

    try {
        let rollen: Rol[];

        if (USE_REPOSITORY_PATTERN) {
            context.log('Using LookupRepository pattern');
            const lookupRepo = new LookupRepository();
            rollen = await lookupRepo.getRollen();
        } else {
            context.log('Using Legacy DossierDatabaseService');
            const dbService = new DossierDatabaseService();
            try {
                await dbService.initialize();
                rollen = await dbService.getRollen();
            } finally {
                await dbService.close();
            }
        }

        // Update cache
        rollenCache = rollen;
        cacheTimestamp = now;

        context.log(`Retrieved ${rollen.length} roles`);
        return createSuccessResponse(rollen);

    } catch (error) {
        context.error('Error in getRollen:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

app.http('getRollen', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'rollen',
    handler: getRollen,
});
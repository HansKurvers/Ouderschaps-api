import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { RegelingTemplate } from '../../models/Dossier';

// In-memory cache for regelingen templates
let regelingenTemplatesCache: RegelingTemplate[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearRegelingenTemplatesCache(): void {
    regelingenTemplatesCache = null;
    cacheTimestamp = null;
}

export async function getRegelingenTemplates(
    _request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Check if we have valid cached data
    const now = Date.now();
    if (regelingenTemplatesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
        context.log('Returning cached regelingen templates data');
        return createSuccessResponse(regelingenTemplatesCache);
    }

    const dbService = new DossierDatabaseService();

    try {
        // Initialize database connection
        await dbService.initialize();

        // Get regelingen templates from database
        const regelingenTemplates = await dbService.getRegelingenTemplates();

        // Update cache
        regelingenTemplatesCache = regelingenTemplates;
        cacheTimestamp = now;

        context.log(`Retrieved ${regelingenTemplates.length} regelingen templates from database`);
        return createSuccessResponse(regelingenTemplates);

    } catch (error) {
        context.error('Error in getRegelingenTemplates:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getRegelingenTemplates', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'lookups/regelingen-templates',
    handler: getRegelingenTemplates,
});
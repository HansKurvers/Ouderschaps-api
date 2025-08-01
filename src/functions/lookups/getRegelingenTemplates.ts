import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { RegelingTemplate } from '../../models/Dossier';

// In-memory cache for regelingen templates
let regelingenTemplatesCache: RegelingTemplate[] | null = null;
let cacheTimestamp: number | null = null;
let lastCacheKey: string | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to clear cache (for testing purposes)
export function clearRegelingenTemplatesCache(): void {
    regelingenTemplatesCache = null;
    cacheTimestamp = null;
    lastCacheKey = null;
}

export async function getRegelingenTemplates(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    // Parse query parameters
    const meervoudKinderenParam = request.query.get('meervoudKinderen');
    const typeParam = request.query.get('type');
    
    // Convert string parameters to appropriate types
    const filters: { meervoudKinderen?: boolean; type?: string } = {};
    
    if (meervoudKinderenParam !== null) {
        // Accept 'true', 'false', '1', '0'
        filters.meervoudKinderen = meervoudKinderenParam === 'true' || meervoudKinderenParam === '1';
    }
    
    if (typeParam) {
        // Validate type parameter
        const validTypes = ['Feestdag', 'Vakantie', 'Algemeen'];
        if (validTypes.includes(typeParam)) {
            filters.type = typeParam;
        } else {
            return createErrorResponse(`Invalid type parameter. Must be one of: ${validTypes.join(', ')}`, 400);
        }
    }
    
    // Create cache key based on filters
    const cacheKey = JSON.stringify(filters);
    const now = Date.now();
    
    // Check if we have valid cached data for these specific filters
    if (regelingenTemplatesCache && 
        cacheTimestamp && 
        (now - cacheTimestamp) < CACHE_DURATION && 
        cacheKey === lastCacheKey) {
        context.log('Returning cached regelingen templates data');
        return createSuccessResponse(regelingenTemplatesCache);
    }

    const dbService = new DossierDatabaseService();

    try {
        // Initialize database connection
        await dbService.initialize();

        // Get regelingen templates from database with filters
        const regelingenTemplates = await dbService.getRegelingenTemplates(filters);

        // Update cache
        regelingenTemplatesCache = regelingenTemplates;
        cacheTimestamp = now;
        lastCacheKey = cacheKey;

        context.log(`Retrieved ${regelingenTemplates.length} regelingen templates from database with filters:`, filters);
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
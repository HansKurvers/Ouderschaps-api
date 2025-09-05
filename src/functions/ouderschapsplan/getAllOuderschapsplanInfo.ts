import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function getAllOuderschapsplanInfo(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from auth
        try {
            await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Parse query parameters for pagination
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100);
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Get all ouderschapsplan info from database
        await dbService.initialize();
        const result = await dbService.getAllOuderschapsplanInfo(limit, offset);

        context.log(`Retrieved ${result.data.length} ouderschapsplan info records`);
        return createSuccessResponse(result);

    } catch (error) {
        context.error('Error in getAllOuderschapsplanInfo:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getAllOuderschapsplanInfo', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'ouderschapsplan',
    handler: getAllOuderschapsplanInfo,
});
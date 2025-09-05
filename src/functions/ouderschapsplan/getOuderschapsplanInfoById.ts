import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function getOuderschapsplanInfoById(
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

        // Get ouderschapsplan info ID from route
        const infoId = parseInt(request.params.infoId || '');
        if (!infoId || isNaN(infoId)) {
            return createErrorResponse('Invalid ouderschapsplan info ID', 400);
        }

        // Get ouderschapsplan info from database
        await dbService.initialize();
        const info = await dbService.getOuderschapsplanInfoById(infoId);

        if (!info) {
            return createErrorResponse('Ouderschapsplan info not found', 404);
        }

        context.log(`Retrieved ouderschapsplan info with ID: ${infoId}`);
        return createSuccessResponse(info);

    } catch (error) {
        context.error('Error in getOuderschapsplanInfoById:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getOuderschapsplanInfoById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'ouderschapsplan/{infoId}',
    handler: getOuderschapsplanInfoById,
});
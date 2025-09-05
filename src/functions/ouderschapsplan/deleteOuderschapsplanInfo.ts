import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function deleteOuderschapsplanInfo(
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

        // Delete ouderschapsplan info from database
        await dbService.initialize();
        const deleted = await dbService.deleteOuderschapsplanInfo(infoId);

        if (!deleted) {
            return createErrorResponse('Ouderschapsplan info not found', 404);
        }

        context.log(`Deleted ouderschapsplan info with ID: ${infoId}`);
        return createSuccessResponse({ message: 'Ouderschapsplan info deleted successfully' });

    } catch (error) {
        context.error('Error in deleteOuderschapsplanInfo:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('deleteOuderschapsplanInfo', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'ouderschapsplan/{infoId}',
    handler: deleteOuderschapsplanInfo,
});
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function deletePersoon(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from headers
        try {
            await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Get persoon ID from path
        const persoonId = Number(request.params.persoonId);
        if (!persoonId || isNaN(persoonId)) {
            return createErrorResponse('Invalid persoon ID', 400);
        }

        // Initialize database connection
        await dbService.initialize();

        // Check if persoon exists
        const existingPersoon = await dbService.getPersoonById(persoonId);
        if (!existingPersoon) {
            return createErrorResponse('Persoon not found', 404);
        }

        // Delete the persoon
        const success = await dbService.deletePersoon(persoonId);
        
        if (!success) {
            return createErrorResponse('Failed to delete persoon', 500);
        }

        context.log(`Persoon with ID ${persoonId} deleted successfully`);
        return createSuccessResponse({ message: 'Persoon deleted successfully' });

    } catch (error) {
        context.error('Error in deletePersoon:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('deletePersoon', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'personen/{persoonId}',
    handler: deletePersoon,
});
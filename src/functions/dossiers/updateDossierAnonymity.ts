import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function updateDossierAnonymity(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        // Get user ID from auth
        let userId: number;
        try {
            userId = await requireAuthentication(request);
        } catch (authError) {
            context.log('Authentication failed:', authError);
            return createErrorResponse('Authentication required', 401);
        }

        // Get dossier ID from route
        const dossierId = parseInt(request.params.dossierId || '');
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        // Parse request body
        const body = await request.json() as { isAnoniem: boolean };
        
        // Validate isAnoniem is a boolean
        if (typeof body.isAnoniem !== 'boolean') {
            return createErrorResponse('isAnoniem must be a boolean value', 400);
        }

        // Update dossier anonymity in database
        await dbService.initialize();
        const updatedDossier = await dbService.updateDossierAnonymity(dossierId, body.isAnoniem, userId);

        context.log(`Updated anonymity for dossier ID ${dossierId} to ${body.isAnoniem}`);
        return createSuccessResponse(updatedDossier);

    } catch (error) {
        context.error('Error updating dossier anonymity:', error);
        
        if (error instanceof Error && error.message === 'Dossier not found or access denied') {
            return createErrorResponse('Dossier not found or access denied', 404);
        }
        
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('updateDossierAnonymity', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/anonymity',
    handler: updateDossierAnonymity,
});
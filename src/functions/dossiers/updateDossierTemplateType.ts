import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function updateDossierTemplateType(
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
        const body = await request.json() as { templateType: string };

        // Validate templateType is a string and one of the allowed values
        if (typeof body.templateType !== 'string' || !body.templateType) {
            return createErrorResponse('templateType must be a non-empty string', 400);
        }

        // Validate template type value
        const validTemplateTypes = ['default', 'v2'];
        if (!validTemplateTypes.includes(body.templateType)) {
            return createErrorResponse(`templateType must be one of: ${validTemplateTypes.join(', ')}`, 400);
        }

        // Update dossier template type in database
        await dbService.initialize();
        const updatedDossier = await dbService.updateDossierTemplateType(dossierId, body.templateType, userId);

        context.log(`Updated template type for dossier ID ${dossierId} to ${body.templateType}`);
        return createSuccessResponse(updatedDossier);

    } catch (error) {
        context.error('Error updating dossier template type:', error);

        if (error instanceof Error && error.message === 'Dossier not found or access denied') {
            return createErrorResponse('Dossier not found or access denied', 404);
        }

        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('updateDossierTemplateType', {
    methods: ['PATCH'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/template-type',
    handler: updateDossierTemplateType,
});

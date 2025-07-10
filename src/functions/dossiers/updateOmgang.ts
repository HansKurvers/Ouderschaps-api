import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { getUserId } from '../../utils/auth-helper';
import { validateUpdateOmgang } from '../../validators/omgang-validator';
import { UpdateOmgangDto } from '../../models/Dossier';

export async function updateOmgang(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        const userId = getUserId(request);
        if (!userId) {
            return createErrorResponse('User ID is required', 401);
        }

        const dossierId = Number(request.params.dossierId);
        const omgangId = Number(request.params.omgangId);
        
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }
        
        if (!omgangId || isNaN(omgangId)) {
            return createErrorResponse('Invalid omgang ID', 400);
        }

        const requestBody = await request.json() as any;
        const { error, value } = validateUpdateOmgang(requestBody);
        if (error) {
            return createErrorResponse(
                `Validation error: ${error.details.map(d => d.message).join(', ')}`,
                400
            );
        }

        await dbService.initialize();

        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        const updateData: UpdateOmgangDto = value;
        const updatedOmgang = await dbService.updateOmgang(omgangId, updateData);

        context.log(`Updated omgang with ID ${omgangId} for dossier ${dossierId}`);
        return createSuccessResponse(updatedOmgang);

    } catch (error) {
        context.error('Error in updateOmgang:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('updateOmgang', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/omgang/{omgangId}',
    handler: updateOmgang,
});

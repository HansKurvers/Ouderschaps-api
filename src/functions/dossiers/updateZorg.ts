import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { getUserId } from '../../utils/auth-helper';
import { validateUpdateZorg } from '../../validators/zorg-validator';
import { UpdateZorgDto } from '../../models/Dossier';

export async function updateZorg(
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
        const zorgId = Number(request.params.zorgId);
        
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }
        
        if (!zorgId || isNaN(zorgId)) {
            return createErrorResponse('Invalid zorg ID', 400);
        }

        const requestBody = await request.json() as any;
        const { error, value } = validateUpdateZorg(requestBody);
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

        const updateData: UpdateZorgDto & { gewijzigdDoor: number } = {
            gewijzigdDoor: userId,
            ...value
        };
        const updatedZorg = await dbService.updateZorg(zorgId, updateData);

        context.log(`Updated zorg with ID ${zorgId} for dossier ${dossierId}`);
        return createSuccessResponse(updatedZorg);

    } catch (error) {
        context.error('Error in updateZorg:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('updateZorg', {
    methods: ['PUT'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/zorg/{zorgId}',
    handler: updateZorg,
});

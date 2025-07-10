import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { getUserId } from '../../utils/auth-helper';

export async function deleteZorg(
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

        await dbService.initialize();

        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        await dbService.deleteZorg(zorgId);

        context.log(`Deleted zorg with ID ${zorgId} from dossier ${dossierId}`);
        return createSuccessResponse({ message: 'Zorg successfully deleted' });

    } catch (error) {
        context.error('Error in deleteZorg:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('deleteZorg', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/zorg/{zorgId}',
    handler: deleteZorg,
});

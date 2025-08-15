import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DossierDatabaseService } from '../../services/database-service';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-helper';
import { requireAuthentication } from '../../utils/auth-helper';

export async function getDossierZorg(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    const dbService = new DossierDatabaseService();

    try {
        const userId = await requireAuthentication(request);
        if (userId === null) {
            return createErrorResponse('User ID is required', 401);
        }

        const dossierId = Number(request.params.dossierId);
        if (!dossierId || isNaN(dossierId)) {
            return createErrorResponse('Invalid dossier ID', 400);
        }

        await dbService.initialize();

        const hasAccess = await dbService.checkDossierAccess(dossierId, userId);
        if (!hasAccess) {
            return createErrorResponse('Access denied to this dossier', 403);
        }

        const zorgCategorieId = request.query.get('zorgCategoryId');
        
        let zorg;
        if (zorgCategorieId) {
            const categorieId = Number(zorgCategorieId);
            if (isNaN(categorieId)) {
                return createErrorResponse('Invalid zorg_categorie_id', 400);
            }
            zorg = await dbService.getZorgByDossierAndCategorie(dossierId, categorieId);
            context.log(`Retrieved ${zorg.length} zorg entries for dossier ${dossierId} with categorie ${categorieId}`);
        } else {
            zorg = await dbService.getZorgByDossier(dossierId);
            context.log(`Retrieved ${zorg.length} zorg entries for dossier ${dossierId}`);
        }
        
        return createSuccessResponse(zorg);

    } catch (error) {
        context.error('Error in getDossierZorg:', error);
        return createErrorResponse('Internal server error', 500);
    } finally {
        await dbService.close();
    }
}

app.http('getDossierZorg', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/zorg',
    handler: getDossierZorg,
});

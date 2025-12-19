import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BerichtenRepository } from '../../repositories/BerichtenRepository';
import {
    verifyDossierAccess,
    isAccessDenied,
    DossierAccessContext,
} from '../../middleware/dossierAuth.middleware';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * DELETE /api/dossiers/{dossierId}/berichten/{berichtId}
 *
 * Deletes a bericht (soft delete).
 * Only accessible by: Owner
 */
export async function deleteDossierBericht(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Dossier Bericht endpoint called');

    try {
        const dossierId = parseInt(request.params.dossierId as string);
        const berichtId = parseInt(request.params.berichtId as string);

        if (isNaN(dossierId) || isNaN(berichtId)) {
            return createErrorResponse('Ongeldig dossier of bericht ID', 400);
        }

        // Authorization
        const accessResult = await verifyDossierAccess(request, dossierId);
        if (isAccessDenied(accessResult)) {
            return accessResult;
        }
        const access = accessResult as DossierAccessContext;

        // Only owner can delete berichten
        if (access.type !== 'owner') {
            return createErrorResponse('Alleen de eigenaar kan berichten verwijderen', 403);
        }

        const repository = new BerichtenRepository();
        await repository.deleteBericht(berichtId);

        context.log(`Deleted bericht ${berichtId} from dossier ${dossierId}`);
        return createSuccessResponse({ deleted: true });
    } catch (error) {
        context.error('Error deleting dossier bericht:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij verwijderen bericht',
            500
        );
    }
}

app.http('deleteDossierBericht', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/berichten/{berichtId}',
    handler: deleteDossierBericht,
});

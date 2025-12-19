import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BerichtenRepository } from '../../repositories/BerichtenRepository';
import {
    verifyDossierAccess,
    isAccessDenied,
    DossierAccessContext,
} from '../../middleware/dossierAuth.middleware';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helper';

/**
 * DELETE /api/dossiers/{dossierId}/berichten/{berichtId}/reacties/{reactieId}
 *
 * Deletes a reactie (soft delete).
 * Only accessible by: Owner
 */
export async function deleteReactie(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log('DELETE Reactie endpoint called');

    try {
        const dossierId = parseInt(request.params.dossierId as string);
        const berichtId = parseInt(request.params.berichtId as string);
        const reactieId = parseInt(request.params.reactieId as string);

        if (isNaN(dossierId) || isNaN(berichtId) || isNaN(reactieId)) {
            return createErrorResponse('Ongeldig dossier, bericht of reactie ID', 400);
        }

        // Authorization
        const accessResult = await verifyDossierAccess(request, dossierId);
        if (isAccessDenied(accessResult)) {
            return accessResult;
        }
        const access = accessResult as DossierAccessContext;

        // Only owner can delete reacties
        if (access.type !== 'owner') {
            return createErrorResponse('Alleen de eigenaar kan reacties verwijderen', 403);
        }

        const repository = new BerichtenRepository();
        await repository.deleteReactie(reactieId);

        context.log(`Deleted reactie ${reactieId} from bericht ${berichtId}`);
        return createSuccessResponse({ deleted: true });
    } catch (error) {
        context.error('Error deleting reactie:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Fout bij verwijderen reactie',
            500
        );
    }
}

app.http('deleteReactie', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'dossiers/{dossierId}/berichten/{berichtId}/reacties/{reactieId}',
    handler: deleteReactie,
});
